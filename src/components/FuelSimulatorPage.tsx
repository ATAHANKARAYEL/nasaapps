import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LANDMARKS } from '../lib/landmarks';
import { calculateLandingFuel, computeSurfaceTraverse } from '../lib/lunarPhysics';

interface FuelSimulatorPageProps {
  t: (key: string) => string;
  sunAngleDeg: number;
  selectedSite: { lat: number; lon: number; name: string };
  atlasPointA: { lat: number; lon: number };
  atlasPointB: { lat: number; lon: number };
  fuelLat: number;
  fuelLon: number;
  onChangeFuelCoords: (lat: number, lon: number) => void;
  onSyncFromAtlas: () => void;
}

export const FuelSimulatorPage: React.FC<FuelSimulatorPageProps> = ({
  t,
  sunAngleDeg,
  selectedSite,
  atlasPointA,
  atlasPointB,
  fuelLat,
  fuelLon,
  onChangeFuelCoords,
  onSyncFromAtlas,
}) => {
  const [vehicleKey, setVehicleKey] = useState<'clps' | 'hls' | 'cargo'>('clps');
  const [orbitInc, setOrbitInc] = useState<number>(90);
  const [routeA, setRouteA] = useState(`${LANDMARKS[0].lat}|${LANDMARKS[0].lon}`);
  const [routeB, setRouteB] = useState(`${LANDMARKS[2].lat}|${LANDMARKS[2].lon}`);
  const chartRef = useRef<HTMLCanvasElement | null>(null);

  const fuelResult = useMemo(
    () => calculateLandingFuel(fuelLat, fuelLon, vehicleKey, orbitInc, sunAngleDeg),
    [fuelLat, fuelLon, vehicleKey, orbitInc, sunAngleDeg]
  );

  const benchResults = useMemo(() => {
    const benchSites = [
      { name: 'Apollo 11 (Mare Tranquillitatis)', lat: 0.67, lon: 23.47 },
      { name: 'Mons Mouton Platosu (VIPER)', lat: -84.95, lon: 31.0 },
      { name: 'Shackleton Krateri (Rim)', lat: -89.9, lon: 0.0 },
      { name: 'Connecting Ridge (Artemis III)', lat: -89.45, lon: -137.5 },
      { name: 'Shackleton Tabanı (PSR Buz)', lat: -89.65, lon: 115.0 },
      { name: `${selectedSite.name.split('(')[0].trim()} (${fuelLat.toFixed(1)}°)`, lat: fuelLat, lon: fuelLon },
    ];

    return benchSites
      .map((s) => {
        const calc = calculateLandingFuel(s.lat, s.lon, vehicleKey, orbitInc, sunAngleDeg);
        let driver = 'Nominal';
        if (calc.planeChangeDv > 180) driver = `Δi ${calc.incMismatchDeg.toFixed(0)}° Orbit Plane`;
        else if (calc.phys.slopeDeg > 10) driver = `Steep Wall (${calc.phys.slopeDeg.toFixed(1)}°)`;
        else if (calc.phys.tempK < 95) driver = `Cryo PSR (${calc.phys.tempK.toFixed(0)} K)`;
        else driver = `Flat & Optimal (${calc.phys.slopeDeg.toFixed(1)}°)`;
        return { ...s, calc, driver };
      })
      .sort((a, b) => a.calc.propMassKg - b.calc.propMassKg);
  }, [fuelLat, fuelLon, selectedSite.name, vehicleKey, orbitInc, sunAngleDeg]);

  const routeResult = useMemo(() => {
    const [latAStr, lonAStr] = routeA.split('|');
    const [latBStr, lonBStr] = routeB.split('|');
    return computeSurfaceTraverse(
      parseFloat(latAStr) || -89.9,
      parseFloat(lonAStr) || 0,
      parseFloat(latBStr) || -89.45,
      parseFloat(lonBStr) || -137.5
    );
  }, [routeA, routeB]);

  useEffect(() => {
    const c = chartRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(360, Math.floor(rect.width || 720));
    const H = 180;
    c.width = W * dpr;
    c.height = H * dpr;

    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padL = 52;
    const padR = 16;
    const padT = 18;
    const padB = 28;
    const gW = W - padL - padR;
    const gH = H - padT - padB;
    const maxL = Math.max(...benchResults.map((b) => b.calc.litersEq)) * 1.15;

    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const val = (maxL * i) / 4;
      const y = padT + gH - (i / 4) * gH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillText(`${Math.round(val)}L`, 4, y + 3);
    }

    const slotW = gW / benchResults.length;
    const barW = Math.min(44, slotW * 0.52);

    benchResults.forEach((b, idx) => {
      const bh = (b.calc.litersEq / maxL) * gH;
      const bx = padL + idx * slotW + (slotW - barW) * 0.5;
      const by = padT + gH - bh;

      const grad = ctx.createLinearGradient(0, by, 0, padT + gH);
      grad.addColorStop(
        0,
        idx === 0 ? '#34d399' : idx === benchResults.length - 1 ? '#fb7185' : '#fbbf24'
      );
      grad.addColorStop(1, 'rgba(15,23,42,0.75)');
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, barW, bh);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillText(`${Math.round(b.calc.litersEq)}L`, bx + 2, by - 4);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      const lbl = b.name.length > 15 ? `${b.name.slice(0, 14)}…` : b.name;
      ctx.fillText(lbl, Math.max(padL, bx - 10), H - 10);
    });

    ctx.restore();
  }, [benchResults]);

  const isGo = fuelResult.reservePct >= 10;
  const isWarn = !isGo && fuelResult.reservePct >= 0;

  return (
    <section
      className="fixed inset-x-3.5 bottom-3.5 top-16 z-20 flex flex-col gap-3.5 overflow-y-auto pb-6"
      data-testid="page-fuel"
    >
      <div className="panel-surface flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <div>
          <h2 className="font-display text-base font-bold text-white">{t('p3Title')}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{t('p3Desc')}</p>
        </div>
        <button
          type="button"
          onClick={onSyncFromAtlas}
          className="whitespace-nowrap rounded-lg border border-sky-400/50 bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/30"
        >
          {t('p3SyncAtlas')}
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[340px_1fr]">
        {/* Left Configuration Column */}
        <div className="panel-surface flex flex-col gap-3 p-4">
          <label htmlFor="fuel-vehicle-select" className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t('p3Step1')}
          </label>
          <select
            id="fuel-vehicle-select"
            value={vehicleKey}
            onChange={(e) => setVehicleKey(e.target.value as 'clps' | 'hls' | 'cargo')}
            className="w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-2 text-xs text-slate-100 outline-none focus:border-sky-400"
          >
            <option value="clps">{t('vehClps')}</option>
            <option value="hls">{t('vehHls')}</option>
            <option value="cargo">{t('vehCargo')}</option>
          </select>

          <label htmlFor="fuel-orbit-select" className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t('p3Step2')}
          </label>
          <select
            id="fuel-orbit-select"
            value={orbitInc}
            onChange={(e) => setOrbitInc(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-2 text-xs text-slate-100 outline-none focus:border-sky-400"
          >
            <option value={90}>{t('orb90')}</option>
            <option value={60}>{t('orb60')}</option>
            <option value={28.5}>{t('orb28')}</option>
            <option value={0}>{t('orb0')}</option>
          </select>

          <label htmlFor="fuel-site-select" className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t('p3Step3')}
          </label>
          <select
            id="fuel-site-select"
            value={`${fuelLat}|${fuelLon}`}
            onChange={(e) => {
              const [latStr, lonStr] = e.target.value.split('|');
              onChangeFuelCoords(parseFloat(latStr), parseFloat(lonStr));
            }}
            className="w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-2 text-xs text-slate-100 outline-none focus:border-sky-400"
          >
            <option value={`${fuelLat}|${fuelLon}`}>
              {selectedSite.name} ({fuelLat.toFixed(2)}°, {fuelLon.toFixed(2)}°)
            </option>
            {LANDMARKS.map((lm) => (
              <option key={lm.id} value={`${lm.lat}|${lm.lon}`}>
                {lm.name} ({lm.lat.toFixed(1)}°, {lm.lon.toFixed(1)}°)
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="fuel-lat" className="font-mono-tab text-[10px] text-slate-400">
                {t('latDegLbl')}
              </label>
              <input
                id="fuel-lat"
                type="number"
                step="0.01"
                value={fuelLat}
                onChange={(e) => onChangeFuelCoords(parseFloat(e.target.value) || 0, fuelLon)}
                className="mt-0.5 w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-1.5 font-mono-tab text-xs text-slate-100 outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label htmlFor="fuel-lon" className="font-mono-tab text-[10px] text-slate-400">
                {t('lonDegLbl')}
              </label>
              <input
                id="fuel-lon"
                type="number"
                step="0.01"
                value={fuelLon}
                onChange={(e) => onChangeFuelCoords(fuelLat, parseFloat(e.target.value) || 0)}
                className="mt-0.5 w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-1.5 font-mono-tab text-xs text-slate-100 outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div className="panel-inset space-y-1.5 p-3 text-[11px] leading-relaxed text-slate-300">
            <p>{t('p3PhysicsNote1')}</p>
            <p>{t('p3PhysicsNote2')}</p>
            <p>{t('p3PhysicsNote3')}</p>
          </div>
        </div>

        {/* Right Simulation Results */}
        <div className="flex flex-col gap-3">
          <div className="panel-surface flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono-tab text-xs font-bold uppercase tracking-wider text-slate-200">
                {selectedSite.name} ({fuelLat.toFixed(2)}° {fuelLat >= 0 ? t('cardN') : t('cardS')},{' '}
                {fuelLon.toFixed(2)}° {fuelLon >= 0 ? t('cardE') : t('cardW')})
              </span>
              <span
                className={`rounded px-2 py-0.5 font-mono-tab text-[11px] font-bold ${
                  isGo
                    ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                    : isWarn
                      ? 'border border-amber-400/40 bg-amber-500/15 text-amber-300'
                      : 'border border-rose-400/40 bg-rose-500/15 text-rose-300'
                }`}
              >
                {isGo ? t('stGo') : isWarn ? t('stWarn') : t('stNogo')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <div className="panel-inset p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  {t('fkpiTotalMass')}
                </div>
                <div className="mt-1 font-mono-tab text-xl font-bold text-amber-400">
                  {Math.round(fuelResult.propMassKg).toLocaleString()} kg
                </div>
                <div className="text-[11px] text-slate-400">
                  Max: {fuelResult.veh.propCapacityKg.toLocaleString()} kg
                </div>
              </div>

              <div className="panel-inset p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  {t('fkpiGasEq')}
                </div>
                <div className="mt-1 font-mono-tab text-xl font-bold text-sky-400">
                  {Math.round(fuelResult.litersEq).toLocaleString()} L
                </div>
                <div className="text-[11px] text-slate-400">{t('fkpiGasSub')}</div>
              </div>

              <div className="panel-inset p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  {t('fkpiTotalDv')}
                </div>
                <div className="mt-1 font-mono-tab text-xl font-bold text-emerald-400">
                  {Math.round(fuelResult.totalDv).toLocaleString()} m/s
                </div>
                <div className="text-[11px] text-slate-400">{t('fkpiDvSub')}</div>
              </div>

              <div className="panel-inset p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  {t('fkpiReserve')}
                </div>
                <div
                  className={`mt-1 font-mono-tab text-xl font-bold ${
                    isGo ? 'text-emerald-400' : isWarn ? 'text-amber-400' : 'text-rose-400'
                  }`}
                >
                  {fuelResult.reservePct >= 0
                    ? `%${fuelResult.reservePct.toFixed(1)}`
                    : `-%${Math.abs(fuelResult.reservePct).toFixed(1)}`}
                </div>
                <div className="text-[11px] text-slate-400">{t('fkpiResSub')}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <div className="panel-inset p-2.5">
                <div className="text-[10px] uppercase text-slate-400">{t('bdBaseTitle')}</div>
                <strong className="font-mono-tab text-sm text-white">
                  {Math.round(fuelResult.baseDv)} m/s
                </strong>
                <div className="text-[10px] text-slate-400">{t('bdBaseDesc')}</div>
              </div>
              <div className="panel-inset p-2.5">
                <div className="text-[10px] uppercase text-slate-400">{t('bdPlaneTitle')}</div>
                <strong className="font-mono-tab text-sm text-sky-400">
                  +{Math.round(fuelResult.planeChangeDv)} m/s
                </strong>
                <div className="font-mono-tab text-[10px] text-slate-400">
                  Δi: {fuelResult.incMismatchDeg.toFixed(1)}°
                </div>
              </div>
              <div className="panel-inset p-2.5">
                <div className="text-[10px] uppercase text-slate-400">{t('bdHoverTitle')}</div>
                <strong className="font-mono-tab text-sm text-amber-400">
                  +{Math.round(fuelResult.hoverDv)} m/s
                </strong>
                <div className="font-mono-tab text-[10px] text-slate-400">
                  {fuelResult.phys.slopeDeg.toFixed(1)}°
                </div>
              </div>
              <div className="panel-inset p-2.5">
                <div className="text-[10px] uppercase text-slate-400">{t('bdThermTitle')}</div>
                <strong className="font-mono-tab text-sm text-rose-400">
                  +{Math.round(fuelResult.thermalElevDv)} m/s
                </strong>
                <div className="font-mono-tab text-[10px] text-slate-400">
                  {fuelResult.phys.tempK.toFixed(0)} K ·{' '}
                  {fuelResult.phys.elevM >= 0 ? '+' : ''}
                  {fuelResult.phys.elevM.toFixed(0)} m
                </div>
              </div>
            </div>
          </div>

          <div className="panel-surface flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>{t('p3BenchTitle')}</span>
              <span className="font-mono-tab text-amber-400">TSIOLKOVSKY + LOLA DEM</span>
            </div>
            <canvas
              ref={chartRef}
              className="block h-[180px] w-full rounded-lg bg-slate-950/70"
            />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[10.5px] uppercase tracking-wider text-slate-400">
                    <th className="px-2.5 py-2">{t('thFuelSite')}</th>
                    <th className="px-2.5 py-2">{t('thFuelSlopeTemp')}</th>
                    <th className="px-2.5 py-2">{t('thFuelDv')}</th>
                    <th className="px-2.5 py-2">{t('thFuelMass')}</th>
                    <th className="px-2.5 py-2">{t('thFuelLiters')}</th>
                    <th className="px-2.5 py-2">{t('thFuelReason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {benchResults.map((row) => (
                    <tr
                      key={`${row.name}-${row.lat}`}
                      className="border-b border-slate-800/70 hover:bg-sky-500/5"
                    >
                      <td className="px-2.5 py-2">
                        <strong className="text-slate-100">{row.name}</strong>
                        <div className="font-mono-tab text-[10px] text-slate-500">
                          {row.lat.toFixed(2)}°, {row.lon.toFixed(2)}°
                        </div>
                      </td>
                      <td className="px-2.5 py-2 font-mono-tab text-[11px]">
                        {row.calc.phys.slopeDeg.toFixed(1)}° · {row.calc.phys.tempK.toFixed(0)} K
                      </td>
                      <td className="px-2.5 py-2 font-mono-tab text-emerald-400">
                        {Math.round(row.calc.totalDv)} m/s
                      </td>
                      <td className="px-2.5 py-2 font-mono-tab font-bold text-amber-400">
                        {Math.round(row.calc.propMassKg).toLocaleString()} kg
                      </td>
                      <td className="px-2.5 py-2 font-mono-tab font-bold text-sky-400">
                        {Math.round(row.calc.litersEq).toLocaleString()} L
                      </td>
                      <td className="px-2.5 py-2 text-[11px] text-slate-300">{row.driver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel-surface flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>{t('p3RouteTitle')}</span>
              <span className="font-mono-tab text-emerald-400">LOLA DEM</span>
            </div>

            <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <label htmlFor="route-a-select" className="text-[10px] text-slate-400">
                  {t('rtPtALbl')}
                </label>
                <select
                  id="route-a-select"
                  value={routeA}
                  onChange={(e) => setRouteA(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                >
                  <option value={`${atlasPointA.lat}|${atlasPointA.lon}`}>
                    Atlas A ({atlasPointA.lat.toFixed(2)}°, {atlasPointA.lon.toFixed(2)}°)
                  </option>
                  {LANDMARKS.map((lm) => (
                    <option key={lm.id} value={`${lm.lat}|${lm.lon}`}>
                      {lm.name} ({lm.lat.toFixed(1)}°, {lm.lon.toFixed(1)}°)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="route-b-select" className="text-[10px] text-slate-400">
                  {t('rtPtBLbl')}
                </label>
                <select
                  id="route-b-select"
                  value={routeB}
                  onChange={(e) => setRouteB(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                >
                  <option value={`${atlasPointB.lat}|${atlasPointB.lon}`}>
                    Atlas B ({atlasPointB.lat.toFixed(2)}°, {atlasPointB.lon.toFixed(2)}°)
                  </option>
                  {LANDMARKS.map((lm) => (
                    <option key={lm.id} value={`${lm.lat}|${lm.lon}`}>
                      {lm.name} ({lm.lat.toFixed(1)}°, {lm.lon.toFixed(1)}°)
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRouteA(`${atlasPointA.lat}|${atlasPointA.lon}`);
                  setRouteB(`${atlasPointB.lat}|${atlasPointB.lon}`);
                }}
                className="whitespace-nowrap rounded-lg border border-sky-400/50 bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/30"
              >
                {t('rtSyncBtn')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <div className="panel-inset p-3">
                <div className="text-[10px] uppercase text-slate-400">{t('rtDistLbl')}</div>
                <div className="mt-1 font-mono-tab text-base font-bold text-white">
                  {routeResult.distKm.toFixed(1)} km
                </div>
                <div className="font-mono-tab text-[10px] text-slate-400">
                  Δh: {routeResult.deltaHMeters >= 0 ? '+' : ''}
                  {Math.round(routeResult.deltaHMeters)} m
                </div>
              </div>
              <div className="panel-inset p-3">
                <div className="text-[10px] uppercase text-slate-400">{t('rtKwhLbl')}</div>
                <div className="mt-1 font-mono-tab text-base font-bold text-emerald-400">
                  {routeResult.kwh.toFixed(1)} kWh
                </div>
                <div className="font-mono-tab text-[10px] text-slate-400">
                  {routeResult.driveHours.toFixed(1)} h
                </div>
              </div>
              <div className="panel-inset p-3">
                <div className="text-[10px] uppercase text-slate-400">{t('rtGasLbl')}</div>
                <div className="mt-1 font-mono-tab text-base font-bold text-amber-400">
                  {routeResult.roverGasLiters.toFixed(2)} L
                </div>
                <div className="text-[10px] text-slate-400">{t('rtGasSub')}</div>
              </div>
              <div className="panel-inset p-3">
                <div className="text-[10px] uppercase text-slate-400">{t('rtHopLbl')}</div>
                <div className="mt-1 font-mono-tab text-base font-bold text-sky-400">
                  {Math.round(routeResult.hopperPropKg)} kg ({Math.round(routeResult.hopperLiters)} L)
                </div>
                <div className="text-[10px] text-slate-400">{t('rtHopSub')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
