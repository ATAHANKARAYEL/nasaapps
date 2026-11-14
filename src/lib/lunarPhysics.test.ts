import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLandingFuel,
  computeGeodesic,
  computeHorizonAndMission,
  computeSurfaceTraverse,
  evaluateComparisonSites,
  parseCoordinateInput,
  R_MOON_KM,
  sampleElevationMeters,
  sampleTerrainTelemetry,
} from './lunarPhysics';

test('parseCoordinateInput handles decimal and DMS strings accurately', () => {
  const dec = parseCoordinateInput('-89.45, -137.50');
  assert.ok(dec);
  assert.equal(dec.isDms, false);
  assert.ok(Math.abs(dec.lat - -89.45) < 1e-6);
  assert.ok(Math.abs(dec.lon - -137.5) < 1e-6);

  const dms = parseCoordinateInput("89°27'S 137°30'W");
  assert.ok(dms);
  assert.equal(dms.isDms, true);
  assert.ok(Math.abs(dms.lat - -89.45) < 1e-3);
  assert.ok(Math.abs(dms.lon - -137.5) < 1e-3);

  assert.equal(parseCoordinateInput('invalid text'), null);
});

test('computeGeodesic returns accurate lunar arc distances', () => {
  // Quarter circumference of the Moon: (pi / 2) * 1737.4 km ~= 2729.1 km
  const quarter = computeGeodesic(0, 0, 0, 90);
  const expectedQuarter = (Math.PI / 2) * R_MOON_KM;
  assert.ok(Math.abs(quarter.distKm - expectedQuarter) < 0.5);

  const zero = computeGeodesic(-89.9, 0, -89.9, 0);
  assert.equal(zero.distKm, 0);
});

test('LOLA DEM elevation and terrain telemetry return physically bounded values', () => {
  const rimElev = sampleElevationMeters(-89.9, 0);
  const psrElev = sampleElevationMeters(-89.65, 115);
  assert.ok(rimElev >= -9120 && rimElev <= 10760);
  assert.ok(psrElev >= -9120 && psrElev <= 10760);
  assert.ok(rimElev > 0, `Shackleton rim should be elevated above 0 m (got ${rimElev.toFixed(1)} m)`);
  assert.ok(rimElev > psrElev, 'Shackleton rim should be higher than Shackleton PSR floor');

  const rimTelemetry = sampleTerrainTelemetry(-89.9, 0, 32);
  const psrTelemetry = sampleTerrainTelemetry(-89.65, 115, 32);
  assert.ok(rimTelemetry.tempK > 140, `Shackleton rim should be grazing sunlit (>140 K, got ${rimTelemetry.tempK.toFixed(1)} K)`);
  assert.ok(psrTelemetry.tempK >= 35 && psrTelemetry.tempK < 90, `Shackleton PSR should be cryogenic (<90 K, got ${psrTelemetry.tempK.toFixed(1)} K)`);
  assert.ok(psrTelemetry.slopeDeg >= 0 && psrTelemetry.slopeDeg < 90);
  assert.ok(psrTelemetry.moistureWtPct > 2.0 && psrTelemetry.moistureWtPct <= 8.5);
});

test('360-degree ray-marching horizon & mission simulation computes bounded sun and DTE percentages', () => {
  const rimSim = computeHorizonAndMission(-89.9, 0, 14);
  const psrSim = computeHorizonAndMission(-89.65, 115, 14);
  assert.equal(rimSim.horizonProfile.length, 360);
  assert.equal(rimSim.timeline.length, 14 * 24);
  assert.ok(rimSim.sunPct > 60 && rimSim.sunPct <= 100, `Shackleton rim should have >60% sun window (got ${rimSim.sunPct.toFixed(1)}%)`);
  assert.ok(rimSim.dtePct >= 0 && rimSim.dtePct <= 100);
  assert.ok(rimSim.finalSoc >= 12 && rimSim.finalSoc <= 100);
  assert.ok(psrSim.sunPct < 25, `Shackleton PSR should be heavily occluded (<25% sun, got ${psrSim.sunPct.toFixed(1)}%)`);
});

test('Tsiolkovsky landing fuel increases when equatorial orbit requires plane change to South Pole', () => {
  const polarOrbitFuel = calculateLandingFuel(-89.9, 0, 'clps', 90);
  const eqOrbitFuel = calculateLandingFuel(-89.9, 0, 'clps', 0);

  assert.equal(polarOrbitFuel.planeChangeDv, 0);
  assert.ok(eqOrbitFuel.planeChangeDv > 500);
  assert.ok(eqOrbitFuel.totalDv > polarOrbitFuel.totalDv);
  assert.ok(eqOrbitFuel.propMassKg > polarOrbitFuel.propMassKg);
  assert.ok(eqOrbitFuel.litersEq > polarOrbitFuel.litersEq);
});

test('computeSurfaceTraverse scales energy and hopper fuel with geodesic distance', () => {
  const shortTrip = computeSurfaceTraverse(-89.9, 0, -89.45, -137.5);
  const longTrip = computeSurfaceTraverse(-89.9, 0, -84.95, 31.0);
  assert.ok(longTrip.distKm > shortTrip.distKm);
  assert.ok(longTrip.kwh > shortTrip.kwh);
  assert.ok(longTrip.hopperPropKg > shortTrip.hopperPropKg);
});

test('evaluateComparisonSites ranks sites and identifies flattest, warmest, driest, and iciest winners', () => {
  const sites = [
    { name: 'Shackleton Rim', lat: -89.9, lon: 0 },
    { name: 'Connecting Ridge', lat: -89.45, lon: -137.5 },
    { name: 'Mons Mouton', lat: -84.95, lon: 31 },
    { name: 'Shackleton PSR', lat: -89.65, lon: 115 },
  ];
  const res = evaluateComparisonSites(sites, {
    wSun: 35,
    wDte: 25,
    wSlope: 20,
    wTemp: 10,
    moistMode: 'dry',
  });
  assert.equal(res.ranked.length, 4);
  assert.ok(res.ranked[0].score >= res.ranked[1].score);
  assert.ok(res.flattest.phys.slopeDeg <= res.ranked[res.ranked.length - 1].phys.slopeDeg + 50);
  assert.ok(res.iciest.phys.moistureWtPct >= res.driest.phys.moistureWtPct);
});
