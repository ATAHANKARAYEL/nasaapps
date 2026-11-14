import { LANDMARKS, VEHICLES } from './landmarks';

export const R_MOON_KM = 1737.4;
export const G_MOON = 1.622; // m/s^2
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export const TEX_W = 1024;
export const TEX_H = 512;
export const DEM_W = 512;
export const DEM_H = 256;

export interface TerrainTelemetry {
  elevM: number;
  slopeDeg: number;
  aspectDeg: number;
  sunElevDeg: number;
  tempK: number;
  tempC: number;
  moistureWtPct: number;
}

export interface TimelineSample {
  h: number;
  sunVisible: boolean;
  dteVisible: boolean;
  soc: number;
  sunElDeg: number;
  earthElDeg: number;
  azIdx: number;
}

export interface HorizonMissionResult {
  horizonProfile: Float32Array;
  timeline: TimelineSample[];
  sunPct: number;
  dtePct: number;
  terrainLossPct: number;
  finalSoc: number;
}

export interface LandingFuelResult {
  veh: (typeof VEHICLES)['clps'];
  phys: TerrainTelemetry;
  baseDv: number;
  planeChangeDv: number;
  hoverDv: number;
  thermalElevDv: number;
  totalDv: number;
  propMassKg: number;
  litersEq: number;
  reservePct: number;
  incMismatchDeg: number;
}

export interface SurfaceTraverseResult {
  distKm: number;
  deltaHMeters: number;
  kwh: number;
  driveHours: number;
  roverGasLiters: number;
  hopperPropKg: number;
  hopperLiters: number;
}

export interface ComparisonSiteInput {
  name: string;
  lat: number;
  lon: number;
}

export interface EvaluatedComparisonSite extends ComparisonSiteInput {
  origIdx: number;
  phys: TerrainTelemetry;
  sim: HorizonMissionResult;
  flatnessScore: number;
  thermalScore: number;
  drynessScore: number;
  iceScore: number;
  score: number;
}

function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function noise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = hash3(ix, iy, iz);
  const n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz);
  const n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1);
  const n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1);
  const n111 = hash3(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;

  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;
  return nxy0 + (nxy1 - nxy0) * uz;
}

function fbm3D(x: number, y: number, z: number, octaves: number): number {
  let sum = 0.0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3D(x * freq, y * freq, z * freq);
    freq *= 2.12;
    amp *= 0.5;
  }
  return sum;
}

// Analytical high-resolution South Polar LOLA relief (km) so narrow Artemis III peaks/rims
// and PSR crater bowls stay crisp at sub-kilometer scale in both DEM sampling and WebGL normals.
const POLAR_PEAKS = [
  // Shackleton Rim peak near (-89.90, 0.0) & Connecting Ridge (-89.45, -137.5)
  { lat: -89.90, lon: 0.0, ampKm: 2.35, sigmaRad: 0.0085 },
  { lat: -89.45, lon: -137.5, ampKm: 2.15, sigmaRad: 0.0095 },
  // Malapert Massif Peak (-86.0, 0.0)
  { lat: -86.0, lon: 0.0, ampKm: 2.95, sigmaRad: 0.014 },
  // Mons Mouton flat-topped plateau (-84.95, 31.0)
  { lat: -84.95, lon: 31.0, ampKm: 2.1, sigmaRad: 0.024 },
  // Nobile Rim (-85.2, 53.5) & De Gerlache Rim (-88.5, -88.3)
  { lat: -85.2, lon: 53.5, ampKm: 1.85, sigmaRad: 0.013 },
  { lat: -88.5, lon: -88.3, ampKm: 1.9, sigmaRad: 0.011 },
  // Leibnitz plateau (-85.5, 31.2)
  { lat: -85.5, lon: 31.2, ampKm: 1.35, sigmaRad: 0.018 },
].map((p) => {
  const la = p.lat * DEG2RAD;
  const lo = p.lon * DEG2RAD;
  return {
    x: Math.cos(la) * Math.sin(lo),
    y: Math.sin(la),
    z: Math.cos(la) * Math.cos(lo),
    ampKm: p.ampKm,
    invTwoSig2: 1.0 / (2.0 * p.sigmaRad * p.sigmaRad),
  };
});

const POLAR_CRATERS = [
  // Shackleton crater center (-89.65, 115.0): PSR floor at center, rim crest at (-89.90, 0.0)
  { lat: -89.65, lon: 115.0, rRad: 0.0066, depthKm: 5.4, rimKm: 1.45 },
  // Haworth (-87.45, -5.17), Shoemaker (-88.10, 44.90), Faustini (-87.30, 77.00), Cabeus (-84.90, -35.50)
  { lat: -87.45, lon: -5.17, rRad: 0.0145, depthKm: 4.5, rimKm: 0.9 },
  { lat: -88.1, lon: 44.9, rRad: 0.014, depthKm: 4.4, rimKm: 0.85 },
  { lat: -87.3, lon: 77.0, rRad: 0.0115, depthKm: 4.0, rimKm: 0.8 },
  { lat: -84.9, lon: -35.5, rRad: 0.025, depthKm: 4.6, rimKm: 0.95 },
  { lat: -84.5, lon: 82.8, rRad: 0.027, depthKm: 4.4, rimKm: 0.85 },
].map((c) => {
  const la = c.lat * DEG2RAD;
  const lo = c.lon * DEG2RAD;
  return {
    x: Math.cos(la) * Math.sin(lo),
    y: Math.sin(la),
    z: Math.cos(la) * Math.cos(lo),
    rRad: c.rRad,
    depthKm: c.depthKm,
    rimKm: c.rimKm,
  };
});

function samplePolarReliefKm(X: number, Y: number, Z: number): number {
  if (Y > -0.95) return 0; // Only evaluate south of ~-71.8 deg
  let deltaKm = 0;

  for (let i = 0; i < POLAR_PEAKS.length; i++) {
    const pk = POLAR_PEAKS[i];
    const dx = X - pk.x;
    const dy = Y - pk.y;
    const dz = Z - pk.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < 0.025) {
      deltaKm += pk.ampKm * Math.exp(-d2 * pk.invTwoSig2);
    }
  }

  for (let i = 0; i < POLAR_CRATERS.length; i++) {
    const cr = POLAR_CRATERS[i];
    const dx = X - cr.x;
    const dy = Y - cr.y;
    const dz = Z - cr.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    const maxR = cr.rRad * 1.65;
    if (d2 < maxR * maxR) {
      const nd = Math.sqrt(d2) / cr.rRad;
      if (nd < 0.84) {
        const bowl = Math.cos((nd / 0.84) * Math.PI * 0.5);
        deltaKm -= bowl * cr.depthKm;
      } else if (nd < 1.55) {
        const rim = 1.0 - Math.abs(nd - 1.02) / 0.53;
        if (rim > 0) deltaKm += rim * rim * cr.rimKm;
      }
    }
  }

  return deltaKm;
}

// Singleton Float32 LOLA base DEM elevation array (km) + 1024x512 RGBA albedo/elevation/normal map
let cachedBaseDemKm: Float32Array | null = null;
let cachedRgba: Uint8Array | null = null;
let cachedBakeMs = 0;

export function ensureLunarDem(): {
  demElevationKm: Float32Array;
  rgba: Uint8Array;
  bakeMs: number;
} {
  if (cachedBaseDemKm && cachedRgba) {
    return { demElevationKm: cachedBaseDemKm, rgba: cachedRgba, bakeMs: cachedBakeMs };
  }

  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const rgba = new Uint8Array(TEX_W * TEX_H * 4);
  const heightMap = new Float32Array(TEX_W * TEX_H);
  const baseHeightMap = new Float32Array(TEX_W * TEX_H);
  const demElevationKm = new Float32Array(DEM_W * DEM_H);

  const maria = [
    { lat: 18.4, lon: -57.4, r: 0.45, dark: 72, elev: -2.4 },
    { lat: 32.8, lon: -15.6, r: 0.28, dark: 78, elev: -2.8 },
    { lat: 28.0, lon: 17.5, r: 0.19, dark: 75, elev: -2.5 },
    { lat: 8.5, lon: 31.4, r: 0.22, dark: 68, elev: -1.9 },
    { lat: 17.0, lon: 59.1, r: 0.13, dark: 70, elev: -3.4 },
    { lat: -7.8, lon: 51.3, r: 0.2, dark: 77, elev: -2.1 },
    { lat: -15.2, lon: 35.5, r: 0.14, dark: 79, elev: -2.3 },
    { lat: -21.3, lon: -16.6, r: 0.21, dark: 81, elev: -2.0 },
    { lat: -24.4, lon: -38.6, r: 0.14, dark: 77, elev: -2.2 },
    { lat: 56.0, lon: 1.4, r: 0.16, dark: 85, elev: -2.1 },
    { lat: -19.4, lon: -92.8, r: 0.16, dark: 74, elev: -3.6 },
    { lat: -53.0, lon: -169.0, r: 0.36, dark: 96, elev: -6.8 },
  ].map((m) => {
    const la = m.lat * DEG2RAD;
    const lo = m.lon * DEG2RAD;
    return {
      x: Math.cos(la) * Math.sin(lo),
      y: Math.sin(la),
      z: Math.cos(la) * Math.cos(lo),
      r: m.r,
      dark: m.dark,
      elev: m.elev,
    };
  });

  const craterSpecs = [
    { lat: -75.0, lon: 132.4, r: 0.095, depth: 4.9, rays: false },
    { lat: -43.31, lon: -11.36, r: 0.068, depth: 4.8, rays: true },
    { lat: 9.62, lon: -20.08, r: 0.072, depth: 4.1, rays: true },
    { lat: 23.73, lon: -47.49, r: 0.038, depth: 3.7, rays: true },
    { lat: 8.12, lon: -38.01, r: 0.03, depth: 3.2, rays: true },
    { lat: 51.62, lon: -9.38, r: 0.074, depth: 3.1, rays: false },
    { lat: -58.4, lon: -14.4, r: 0.138, depth: 4.6, rays: false },
    { lat: -20.4, lon: 129.1, r: 0.112, depth: 4.7, rays: false },
  ];

  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 160; i++) {
    const latDeg = i < 55 ? -66.0 - rand() * 15.5 : Math.asin(2 * rand() - 1) * RAD2DEG;
    const lonDeg = rand() * 360 - 180;
    const r = 0.014 + Math.pow(rand(), 2.8) * 0.08;
    craterSpecs.push({
      lat: latDeg,
      lon: lonDeg,
      r,
      depth: 1.6 + rand() * 3.0,
      rays: false,
    });
  }

  const craters = craterSpecs.map((c) => {
    const la = c.lat * DEG2RAD;
    const lo = c.lon * DEG2RAD;
    return {
      x: Math.cos(la) * Math.sin(lo),
      y: Math.sin(la),
      z: Math.cos(la) * Math.cos(lo),
      r: c.r,
      r35: c.r * 5.2,
      depth: c.depth,
      rays: c.rays,
    };
  });

  for (let py = 0; py < TEX_H; py++) {
    const v = py / (TEX_H - 1);
    const lat = Math.PI * 0.5 - v * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);

    for (let px = 0; px < TEX_W; px++) {
      const u = px / TEX_W;
      const lon = u * Math.PI * 2 - Math.PI;

      const X = cosLat * Math.sin(lon);
      const Y = sinLat;
      const Z = cosLat * Math.cos(lon);

      const nMacro = fbm3D(X * 2.5 + 1.1, Y * 2.5 - 0.8, Z * 2.5 + 1.9, 4);
      const nFine = fbm3D(X * 16.0, Y * 16.0, Z * 16.0, 2);

      // Smooth macro relief slightly near the Artemis polar cap so named polar peaks/PSRs dominate
      const polarSmooth = Y < -0.96 ? Math.max(0, Math.min(1, (-Y - 0.96) / 0.035)) : 0;
      const macroAmp = 4.4 * (1 - polarSmooth * 0.72);
      const baseZero = 0.85 * (1 - polarSmooth * 0.65);

      let albedo = 152 + (nMacro - 0.5) * 44 + (nFine - 0.5) * 22;
      let baseElevKm = baseZero + (nMacro - 0.5) * macroAmp + (nFine - 0.5) * 0.85;

      for (let m = 0; m < maria.length; m++) {
        const ma = maria[m];
        const dx = X - ma.x;
        const dy = Y - ma.y;
        const dz = Z - ma.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + (nMacro - 0.5) * 0.08;
        if (d < ma.r) {
          const tVal = 1 - d / ma.r;
          const s = tVal * tVal * (3 - 2 * tVal);
          albedo = albedo * (1 - s * 0.88) + (ma.dark + (nFine - 0.5) * 14) * (s * 0.88);
          baseElevKm = baseElevKm * (1 - s * 0.72) + ma.elev * (s * 0.72);
        }
      }

      for (let c = 0; c < craters.length; c++) {
        const cr = craters[c];
        const dx = X - cr.x;
        const dy = Y - cr.y;
        const dz = Z - cr.z;
        if (Math.abs(dx) > cr.r35 || Math.abs(dy) > cr.r35 || Math.abs(dz) > cr.r35) continue;

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const nd = dist / cr.r;

        if (nd < 1.38) {
          if (nd < 0.84) {
            const bowl = Math.cos((nd / 0.84) * Math.PI * 0.5);
            baseElevKm -= bowl * cr.depth;
            albedo -= bowl * 11;
            if (nd < 0.19 && cr.r > 0.048) {
              baseElevKm += (1 - nd / 0.19) * cr.depth * 0.48;
              albedo += 14;
            }
          } else {
            const rim = 1 - Math.abs(nd - 0.98) / 0.4;
            if (rim > 0) {
              baseElevKm += rim * rim * Math.abs(cr.depth) * 0.42;
              albedo += rim * 24;
            }
          }
        }

        if (cr.rays && nd >= 0.92 && nd < 5.2) {
          const ang = Math.atan2(dy + dx * 0.35, dz - dy * 0.35);
          const ray = Math.pow(Math.abs(Math.sin(ang * 7.5 + nFine * 3.0)), 5);
          const fade = 1 - (nd - 0.92) / 4.28;
          albedo += ray * fade * 62;
        }
      }

      const polarDeltaKm = samplePolarReliefKm(X, Y, Z);
      const fullElevKm = Math.max(-9.12, Math.min(10.76, baseElevKm + polarDeltaKm));
      if (polarDeltaKm > 0.5) albedo += Math.min(22, polarDeltaKm * 8);
      else if (polarDeltaKm < -0.8) albedo -= Math.min(18, -polarDeltaKm * 4);

      const idx = py * TEX_W + px;
      baseHeightMap[idx] = baseElevKm;
      heightMap[idx] = fullElevKm;

      const o = idx * 4;
      rgba[o] = Math.max(32, Math.min(250, albedo | 0));
      rgba[o + 1] = Math.max(0, Math.min(255, (((fullElevKm + 9.12) / 19.88) * 255) | 0));
    }
  }

  for (let py = 0; py < TEX_H; py++) {
    const pyU = Math.max(0, py - 1);
    const pyD = Math.min(TEX_H - 1, py + 1);

    for (let px = 0; px < TEX_W; px++) {
      const pxL = (px - 1 + TEX_W) % TEX_W;
      const pxR = (px + 1) % TEX_W;
      const idx = py * TEX_W + px;

      const dX = (heightMap[py * TEX_W + pxR] - heightMap[py * TEX_W + pxL]) * 14.0;
      const dY = (heightMap[pyD * TEX_W + px] - heightMap[pyU * TEX_W + px]) * 14.0;

      const o = idx * 4;
      rgba[o + 2] = Math.max(0, Math.min(255, (128 + dX) | 0));
      rgba[o + 3] = Math.max(0, Math.min(255, (128 + dY) | 0));
    }
  }

  for (let dy = 0; dy < DEM_H; dy++) {
    const py = Math.min(TEX_H - 1, Math.round((dy / (DEM_H - 1)) * (TEX_H - 1)));
    const demRow = dy * DEM_W;
    const texRow = py * TEX_W;
    for (let dx = 0; dx < DEM_W; dx++) {
      const px = (dx * 2) % TEX_W;
      demElevationKm[demRow + dx] = baseHeightMap[texRow + px];
    }
  }

  cachedBaseDemKm = demElevationKm;
  cachedRgba = rgba;
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  cachedBakeMs = t1 - t0;
  return { demElevationKm, rgba, bakeMs: cachedBakeMs };
}

export function sampleElevationMeters(latDeg: number, lonDeg: number): number {
  const { demElevationKm } = ensureLunarDem();
  const lon = ((lonDeg + 180) % 360 + 360) % 360 - 180;
  const lat = Math.max(-90, Math.min(90, latDeg));

  const u = ((lon + 180) / 360) * DEM_W;
  const v = ((90 - lat) / 180) * (DEM_H - 1);

  const x0 = Math.floor(u) % DEM_W;
  const y0 = Math.floor(v);
  const x1 = (x0 + 1) % DEM_W;
  const y1 = Math.min(DEM_H - 1, y0 + 1);
  const fx = u - Math.floor(u);
  const fy = v - y0;

  const h00 = demElevationKm[y0 * DEM_W + x0];
  const h10 = demElevationKm[y0 * DEM_W + x1];
  const h01 = demElevationKm[y1 * DEM_W + x0];
  const h11 = demElevationKm[y1 * DEM_W + x1];

  const baseKm = (h00 * (1 - fx) + h10 * fx) * (1 - fy) + (h01 * (1 - fx) + h11 * fx) * fy;

  let polarKm = 0;
  if (lat < -71.8) {
    const la = lat * DEG2RAD;
    const lo = lon * DEG2RAD;
    const cl = Math.cos(la);
    polarKm = samplePolarReliefKm(cl * Math.sin(lo), Math.sin(la), cl * Math.cos(lo));
  }

  const clampedKm = Math.max(-9.12, Math.min(10.76, baseKm + polarKm));
  return clampedKm * 1000.0;
}

export function sampleTerrainTelemetry(
  latDeg: number,
  lonDeg: number,
  sunAngleDeg = 32
): TerrainTelemetry {
  const elevM = sampleElevationMeters(latDeg, lonDeg);
  const dLat = 0.08;
  const cosLat = Math.max(0.05, Math.cos(latDeg * DEG2RAD));
  const dLon = 0.08 / cosLat;

  const hN = sampleElevationMeters(Math.min(90, latDeg + dLat), lonDeg);
  const hS = sampleElevationMeters(Math.max(-90, latDeg - dLat), lonDeg);
  const hE = sampleElevationMeters(latDeg, lonDeg + dLon);
  const hW = sampleElevationMeters(latDeg, lonDeg - dLon);

  const dyMeters = 2 * dLat * DEG2RAD * (R_MOON_KM * 1000);
  const dxMeters = 2 * dLon * DEG2RAD * cosLat * (R_MOON_KM * 1000);

  const dzdx = (hE - hW) / dxMeters;
  const dzdy = (hN - hS) / dyMeters;
  const grad = Math.sqrt(dzdx * dzdx + dzdy * dzdy);
  const slopeDeg = Math.atan(grad) * RAD2DEG;
  const aspectDeg = (Math.atan2(-dzdx, -dzdy) * RAD2DEG + 360) % 360;

  const sunLon = sunAngleDeg * DEG2RAD;
  const sunLat = 1.54 * DEG2RAD;
  const la = latDeg * DEG2RAD;
  const lo = lonDeg * DEG2RAD;
  const cosInc =
    Math.sin(la) * Math.sin(sunLat) + Math.cos(la) * Math.cos(sunLat) * Math.cos(lo - sunLon);
  const sunElevDeg = Math.asin(Math.max(-1, Math.min(1, cosInc))) * RAD2DEG;

  // Elevation-based spherical horizon dip allows elevated polar peaks (+1 km+) to stay sunlit
  const horizonDipDeg = elevM > 0 ? Math.sqrt((2 * (elevM / 1000)) / R_MOON_KM) * RAD2DEG : 0;
  const effectiveSunElDeg = sunElevDeg + horizonDipDeg;

  let tempK: number;
  if (cosInc > 0.02) {
    tempK = 115 + 275 * Math.pow(cosInc, 0.26);
  } else if (Math.abs(latDeg) > 80 && elevM > 350 && effectiveSunElDeg > -0.25) {
    // Grazing sunlit polar ridge/peak (NASA Diviner ~170-215 K)
    const peakWarmth = Math.min(1, Math.max(0, (effectiveSunElDeg + 0.25) / 2.6));
    const elevBonus = Math.min(1, elevM / 2000);
    tempK = 158 + peakWarmth * 38 + elevBonus * 14;
  } else {
    const polarFactor = Math.max(0, (Math.abs(latDeg) - 74) / 16);
    const basinDepthFactor = Math.max(0, Math.min(1, -elevM / 3800));
    tempK = 116 - polarFactor * 44 - basinDepthFactor * 36;
  }
  tempK = Math.max(35, Math.min(395, tempK));
  const tempC = tempK - 273.15;

  const polarTrap = Math.max(0, (Math.abs(latDeg) - 78) / 12);
  const coldTrap = tempK < 115 ? Math.pow((115 - tempK) / 80, 1.4) : 0;
  const basinTrap = elevM < 0 ? Math.min(1, -elevM / 3500) : 0;
  const ridgeDryness = elevM > 400 ? Math.min(0.4, (elevM - 400) / 3000) : 0;
  const moistureWtPct = Math.max(
    0.01,
    Math.min(8.4, 0.02 + Math.max(0.05, polarTrap * 0.42 - ridgeDryness) + coldTrap * (3.2 + basinTrap * 4.5))
  );

  return { elevM, slopeDeg, aspectDeg, sunElevDeg, tempK, tempC, moistureWtPct };
}

export function latLonToBody(latDeg: number, lonDeg: number): [number, number, number] {
  const la = latDeg * DEG2RAD;
  const lo = lonDeg * DEG2RAD;
  const cl = Math.cos(la);
  return [cl * Math.sin(lo), Math.sin(la), cl * Math.cos(lo)];
}

export function formatDMS(deg: number, posHemi: string, negHemi: string): string {
  const hemi = deg >= 0 ? posHemi : negHemi;
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = ((mFloat - m) * 60).toFixed(1);
  return `${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}′ ${s.padStart(4, '0')}″ ${hemi}`;
}

export function toSouthPoleStereo(latDeg: number, lonDeg: number) {
  const colatRad = (90 + latDeg) * DEG2RAD;
  const rKm = 2 * R_MOON_KM * Math.tan(colatRad * 0.5);
  const lonRad = lonDeg * DEG2RAD;
  return { xKm: rKm * Math.sin(lonRad), yKm: -rKm * Math.cos(lonRad), rKm };
}

export function computeGeodesic(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p1 = lat1 * DEG2RAD;
  const p2 = lat2 * DEG2RAD;
  const dp = (lat2 - lat1) * DEG2RAD;
  const dl = (lon2 - lon1) * DEG2RAD;

  const a = Math.sin(dp * 0.5) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl * 0.5) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distKm = R_MOON_KM * c;

  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  const bearing = ((Math.atan2(y, x) * RAD2DEG) + 360) % 360;

  return { distKm, bearing, centralAngleRad: c };
}

export function interpolateGreatCircle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  frac: number
): { lat: number; lon: number } {
  const [x1, y1, z1] = latLonToBody(lat1, lon1);
  const [x2, y2, z2] = latLonToBody(lat2, lon2);
  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return { lat: lat1, lon: lon1 };
  const sinO = Math.sin(omega);
  const w1 = Math.sin((1 - frac) * omega) / sinO;
  const w2 = Math.sin(frac * omega) / sinO;
  const x = w1 * x1 + w2 * x2;
  const y = w1 * y1 + w2 * y2;
  const z = w1 * z1 + w2 * z2;
  return {
    lat: Math.asin(Math.max(-1, Math.min(1, y))) * RAD2DEG,
    lon: Math.atan2(x, z) * RAD2DEG,
  };
}

export function parseCoordinateInput(rawInput: string): { lat: number; lon: number; isDms: boolean } | null {
  const raw = rawInput.trim();
  if (!raw) return null;

  const decMatch = raw.match(/^([+-]?\d+(?:\.\d+)?)\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)$/);
  if (decMatch) {
    const lat = parseFloat(decMatch[1]);
    const lon = parseFloat(decMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -360 && lon <= 360) {
      return { lat, lon: ((lon + 180) % 360 + 360) % 360 - 180, isDms: false };
    }
  }

  const dmsRegex = /(\d+(?:\.\d+)?)[°\s]+(?:(\d+(?:\.\d+)?)['′\s]+)?(?:(\d+(?:\.\d+)?)["″\s]+)?([NSEWKGDB])/gi;
  const matches = [...raw.matchAll(dmsRegex)];
  if (matches.length >= 2) {
    const parsePart = (m: RegExpMatchArray) => {
      const d = parseFloat(m[1] || '0');
      const min = parseFloat(m[2] || '0');
      const sec = parseFloat(m[3] || '0');
      const hemi = m[4].toUpperCase();
      let val = d + min / 60 + sec / 3600;
      if (hemi === 'S' || hemi === 'G' || hemi === 'W' || hemi === 'B') val = -val;
      return val;
    };
    const lat = parsePart(matches[0]);
    const lon = parsePart(matches[1]);
    if (lat >= -90 && lat <= 90 && lon >= -360 && lon <= 360) {
      return { lat, lon: ((lon + 180) % 360 + 360) % 360 - 180, isDms: true };
    }
  }

  return null;
}

export function computeHorizonAndMission(
  latDeg: number,
  lonDeg: number,
  durationDays = 14
): HorizonMissionResult {
  const obsElevM = sampleElevationMeters(latDeg, lonDeg) + 2.5;
  const horizonProfile = new Float32Array(360);
  const latRad = latDeg * DEG2RAD;
  const lonRad = lonDeg * DEG2RAD;

  for (let az = 0; az < 360; az++) {
    const azRad = az * DEG2RAD;
    let maxAngleDeg = -5.0;

    for (let step = 1; step <= 26; step++) {
      const distKm = step * 2.5;
      const angDist = distKm / R_MOON_KM;
      const sinD = Math.sin(angDist);
      const cosD = Math.cos(angDist);
      const sinLat2 = Math.sin(latRad) * cosD + Math.cos(latRad) * sinD * Math.cos(azRad);
      const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat2)));
      const lon2 =
        lonRad +
        Math.atan2(
          Math.sin(azRad) * sinD * Math.cos(latRad),
          cosD - Math.sin(latRad) * sinLat2
        );

      const targetElevM = sampleElevationMeters(lat2 * RAD2DEG, lon2 * RAD2DEG);
      const curvatureDropM = (distKm * distKm * 1000.0) / (2 * R_MOON_KM);
      const elevAngleDeg =
        Math.atan2(targetElevM - curvatureDropM - obsElevM, distKm * 1000.0) * RAD2DEG;
      if (elevAngleDeg > maxAngleDeg) maxAngleDeg = elevAngleDeg;
    }
    horizonProfile[az] = maxAngleDeg;
  }

  const totalHours = durationDays * 24;
  const timeline: TimelineSample[] = [];
  let sunLitHours = 0;
  let dteHours = 0;
  let rawSunHours = 0;
  let soc = 78.0;

  for (let h = 0; h < totalHours; h++) {
    const tDays = h / 24.0;
    const sunAzDeg = ((tDays / 29.530589) * 360.0 + 32.0) % 360;
    const sunSubLatDeg = 1.54 * Math.sin((tDays / 27.32166) * Math.PI * 2);

    const sLa = sunSubLatDeg * DEG2RAD;
    const sLo = (sunAzDeg > 180 ? sunAzDeg - 360 : sunAzDeg) * DEG2RAD;
    const sinSunEl =
      Math.sin(latRad) * Math.sin(sLa) + Math.cos(latRad) * Math.cos(sLa) * Math.cos(sLo - lonRad);
    const sunElDeg = Math.asin(Math.max(-1, Math.min(1, sinSunEl))) * RAD2DEG;

    const yS = Math.sin(sLo - lonRad) * Math.cos(sLa);
    const xS =
      Math.cos(latRad) * Math.sin(sLa) - Math.sin(latRad) * Math.cos(sLa) * Math.cos(sLo - lonRad);
    const azIdx = (((Math.atan2(yS, xS) * RAD2DEG) + 360) % 360) | 0;

    const terrainMaskDeg = horizonProfile[azIdx];
    const rawSunVisible = sunElDeg > -0.26;
    const sunVisible = sunElDeg > terrainMaskDeg;

    if (rawSunVisible) rawSunHours++;
    if (sunVisible) sunLitHours++;

    const earthLonDeg = 6.8 * Math.sin((tDays / 27.55455) * Math.PI * 2);
    const earthLatDeg = 6.7 * Math.sin((tDays / 27.21222) * Math.PI * 2 + 0.6);
    const eLa = earthLatDeg * DEG2RAD;
    const eLo = earthLonDeg * DEG2RAD;
    const sinEarthEl =
      Math.sin(latRad) * Math.sin(eLa) + Math.cos(latRad) * Math.cos(eLa) * Math.cos(eLo - lonRad);
    const earthElDeg = Math.asin(Math.max(-1, Math.min(1, sinEarthEl))) * RAD2DEG;

    const yE = Math.sin(eLo - lonRad) * Math.cos(eLa);
    const xE =
      Math.cos(latRad) * Math.sin(eLa) - Math.sin(latRad) * Math.cos(eLa) * Math.cos(eLo - lonRad);
    const eAzIdx = (((Math.atan2(yE, xE) * RAD2DEG) + 360) % 360) | 0;
    const dteVisible = earthElDeg > horizonProfile[eAzIdx];
    if (dteVisible) dteHours++;

    soc = sunVisible ? Math.min(100.0, soc + 1.55) : Math.max(12.0, soc - 1.05);
    timeline.push({ h, sunVisible, dteVisible, soc, sunElDeg, earthElDeg, azIdx });
  }

  const sunPct = (sunLitHours / totalHours) * 100;
  const dtePct = (dteHours / totalHours) * 100;
  const terrainLossPct = Math.max(0, ((rawSunHours - sunLitHours) / totalHours) * 100);

  return { horizonProfile, timeline, sunPct, dtePct, terrainLossPct, finalSoc: soc };
}

export function calculateLandingFuel(
  latDeg: number,
  lonDeg: number,
  vehicleKey: 'clps' | 'hls' | 'cargo',
  orbitIncDeg: number,
  sunAngleDeg = 32
): LandingFuelResult {
  const veh = VEHICLES[vehicleKey] || VEHICLES.clps;
  const phys = sampleTerrainTelemetry(latDeg, lonDeg, sunAngleDeg);

  const baseDv = 1870.0; // 100 km lunar parking orbit to surface braking delta-v (m/s)
  const incMismatchDeg = Math.max(0, Math.abs(latDeg) - orbitIncDeg);
  const planeChangeDv =
    incMismatchDeg > 0.5
      ? 2 * 1633.0 * Math.sin((incMismatchDeg * DEG2RAD) * 0.5) * 0.42
      : 0.0;

  const hoverDv = 45.0 + Math.pow(Math.max(0, phys.slopeDeg), 1.35) * 6.5;

  const coldPenalty = phys.tempK < 110 ? (110 - phys.tempK) * 0.65 : 0.0;
  const elevPenalty = phys.elevM < 0 ? (-phys.elevM / 1000.0) * 6.0 : 0.0;
  const thermalElevDv = 25.0 + coldPenalty + elevPenalty;

  const totalDv = baseDv + planeChangeDv + hoverDv + thermalElevDv;
  const ve = veh.ispSec * 9.80665;
  const propMassKg = veh.dryMassKg * (Math.exp(totalDv / ve) - 1.0);
  const litersEq = propMassKg / veh.densityKgPerL;
  const reservePct = ((veh.propCapacityKg - propMassKg) / veh.propCapacityKg) * 100.0;

  return {
    veh,
    phys,
    baseDv,
    planeChangeDv,
    hoverDv,
    thermalElevDv,
    totalDv,
    propMassKg,
    litersEq,
    reservePct,
    incMismatchDeg,
  };
}

export function computeSurfaceTraverse(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number
): SurfaceTraverseResult {
  const geo = computeGeodesic(latA, lonA, latB, lonB);
  const elevA = sampleElevationMeters(latA, lonA);
  const elevB = sampleElevationMeters(latB, lonB);
  const deltaHMeters = elevB - elevA;

  const climbPenaltyKwh = Math.max(0, deltaHMeters) * 0.0045;
  const kwh = geo.distKm * 0.38 + climbPenaltyKwh;
  const driveHours = geo.distKm / 0.72;
  const roverGasLiters = kwh / 8.9;

  const hopDv = Math.sqrt(Math.max(10, geo.distKm * 1000) * G_MOON) * 1.38;
  const hopperPropKg = 420 * (Math.exp(hopDv / (310 * 9.80665)) - 1);
  const hopperLiters = hopperPropKg / 0.75;

  return {
    distKm: geo.distKm,
    deltaHMeters,
    kwh,
    driveHours,
    roverGasLiters,
    hopperPropKg,
    hopperLiters,
  };
}

export function evaluateComparisonSites(
  sites: ComparisonSiteInput[],
  weights: {
    wSun: number;
    wDte: number;
    wSlope: number;
    wTemp: number;
    moistMode: 'dry' | 'ice';
  },
  sunAngleDeg = 32
): {
  ranked: EvaluatedComparisonSite[];
  bestOverall: EvaluatedComparisonSite;
  flattest: EvaluatedComparisonSite;
  warmest: EvaluatedComparisonSite;
  driest: EvaluatedComparisonSite;
  iciest: EvaluatedComparisonSite;
} {
  const wMoist = 10;
  const sum = Math.max(1, weights.wSun + weights.wDte + weights.wSlope + weights.wTemp + wMoist);

  const evaluated: EvaluatedComparisonSite[] = sites.map((s, origIdx) => {
    const phys = sampleTerrainTelemetry(s.lat, s.lon, sunAngleDeg);
    const sim = computeHorizonAndMission(s.lat, s.lon, 14);
    const flatnessScore = Math.max(0, Math.min(100, 100 - phys.slopeDeg * 4.5));
    const thermalScore = Math.max(0, Math.min(100, ((phys.tempK - 35) / 240) * 100));
    const drynessScore = Math.max(0, Math.min(100, 100 - (phys.moistureWtPct / 7.5) * 100));
    const iceScore = Math.max(0, Math.min(100, (phys.moistureWtPct / 7.5) * 100));
    const chosenMoistScore = weights.moistMode === 'dry' ? drynessScore : iceScore;

    const score =
      (weights.wSun * sim.sunPct +
        weights.wDte * sim.dtePct +
        weights.wSlope * flatnessScore +
        weights.wTemp * thermalScore +
        wMoist * chosenMoistScore) /
      sum;

    return {
      ...s,
      origIdx,
      phys,
      sim,
      flatnessScore,
      thermalScore,
      drynessScore,
      iceScore,
      score: Number(score.toFixed(1)),
    };
  });

  const ranked = [...evaluated].sort((a, b) => b.score - a.score);
  const bestOverall = ranked[0];
  const flattest = [...evaluated].sort((a, b) => a.phys.slopeDeg - b.phys.slopeDeg)[0];
  const warmest = [...evaluated].sort((a, b) => b.phys.tempK - a.phys.tempK)[0];
  const driest = [...evaluated].sort((a, b) => a.phys.moistureWtPct - b.phys.moistureWtPct)[0];
  const iciest = [...evaluated].sort((a, b) => b.phys.moistureWtPct - a.phys.moistureWtPct)[0];

  return { ranked, bestOverall, flattest, warmest, driest, iciest };
}

export function findNearestLandmark(lat: number, lon: number) {
  let best = LANDMARKS[0];
  let bestDist = Infinity;
  for (const lm of LANDMARKS) {
    const d = computeGeodesic(lat, lon, lm.lat, lm.lon).distKm;
    if (d < bestDist) {
      bestDist = d;
      best = lm;
    }
  }
  return { landmark: best, distanceKm: bestDist };
}
