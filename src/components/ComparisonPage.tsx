import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LANDMARKS } from '../lib/landmarks';
import {
  ComparisonSiteInput,
  evaluateComparisonSites,
  formatDMS,
} from '../lib/lunarPhysics';

interface ComparisonPageProps {
  t: (key: string) => string;
  sunAngleDeg: number;
  sites: ComparisonSiteInput[];
  onAddSite: (site: ComparisonSiteInput) => void;
  onRemoveSite: (idx: number) => void;
  onResetSites: () => void;
  onViewIn3D: (lat: number, lon: number, name: string) => void;
  onSendToFuel: (lat: number, lon: number, name: string) => void;
  onNotify: (msg: string) => void;
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({
  t,
  sunAngleDeg,
  sites,
  onAddSite,
  onRemoveSite,
  onResetSites,
  onViewIn3D,
  onSendToFuel,
  onNotify,
}) => {
  const [wSun, setWSun] = useState(35);
  const [wDte, setWDte] = useState(25);
  const [wSlope, setWSlope] = useState(20);
  const [wTemp, setWTemp] = useState(10);
  const [moistMode, setMoistMode] = useState<'dry' | 'ice'>('dry');
  const [selectedDropdown, setSelectedDropdown] = useState(
    `${LANDMARKS[0].lat}|${LANDMARKS[0].lon}|${LANDMARKS[0].name}`
  );
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const wMoist = 10;
  const sum = Math.max(1, wSun + wDte + wSlope + wTemp + wMoist);

  const evaluation = useMemo(
    () =>
      evaluateComparisonSites(
        sites,
        { wSun, wDte, wSlope, wTemp, moistMode },
        sunAngleDeg
      ),
    [sites, wSun, wDte, wSlope, wTemp, moistMode, sunAngleDeg]
  );

  useEffect(() => {
    const c = chartCanvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(360, Math.floor(rect.width || 720));
    const H = 200;
    c.width = W * dpr;
    c.height = H * dpr;

    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padL = 36;
    const padR = 16;
    const padT = 26;
    const padB = 30;
    const gW = W - padL - padR;
    const gH = H - padT - padB;

    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    [0, 25, 50, 75, 100].forEach((v) => {
      const y = padT + gH - (v / 100) * gH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillText(`${v}`, 6, y + 3);
    });

    const series = [
      { label: 'Sun %', color: '#fbbf24' },
      { label: 'DTE %', color: '#38bdf8' },
      { label: 'Flatness %', color: '#34d399' },
      { label: 'Thermal %', color: '#fb923c' },
    ];
    series.forEach((s, i) => {
      ctx.fillStyle = s.color;
      ctx.fillRect(padL + i * 110, 7, 10, 10);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(s.label, padL + i * 110 + 14, 15);
    });

    const groupW = gW / Math.max(1, evaluation.ranked.length);
    const barW = Math.min(20, (groupW - 24) / 4);

    evaluation.ranked.forEach((item, idx) => {
      const vals = [item.sim.sunPct, item.sim.dtePct, item.flatnessScore, item.thermalScore];
      const cx = padL + idx * groupW + groupW * 0.5;
      const startX = cx - (barW * 4 + 9) * 0.5;

      vals.forEach((v, sIdx) => {
        const bh = (Math.max(2, v) / 100) * gH;
        const bx = startX + sIdx * (barW + 3);
        const by = padT + gH - bh;
        ctx.fillStyle = series[sIdx].color;
        ctx.fillRect(bx, by, barW, bh);
      });

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      const shortName = item.name.length > 18 ? `${item.name.slice(0, 17)}…` : item.name;
      ctx.fillText(shortName, Math.max(padL, cx - shortName.length * 2.8), H - 10);
    });

    ctx.restore();
  }, [evaluation]);

  const handleAddDropdown = () => {
    const [latStr, lonStr, name] = selectedDropdown.split('|');
    onAddSite({ name, lat: parseFloat(latStr), lon: parseFloat(lonStr) });
  };

  const handleAddCustom = () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90) {
      onNotify('Invalid coordinates (-90..+90)');
      return;
    }
    onAddSite({ name: `Custom (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`, lat, lon });
    setCustomLat('');
    setCustomLon('');
  };

  return (
    <section
      className="fixed inset-x-3.5 bottom-3.5 top-16 z-20 flex flex-col gap-3.5 overflow-y-auto pb-6"
      data-testid="page-comparison"
    >
      <div className="panel-surface flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <div>
          <h2 className="font-display text-base font-bold text-white">{t('p2Title')}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{t('p2Desc')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="comp-add-select" className="sr-only">
            {t('p2BtnAdd')}
          </label>
          <select
            id="comp-add-select"
            value={selectedDropdown}
            onChange={(e) => setSelectedDropdown(e.target.value)}
            className="rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-1.5 font-mono-tab text-xs text-slate-100 outline-none focus:border-sky-400"
          >
            {LANDMARKS.map((lm) => (
              <option key={lm.id} value={`${lm.lat}|${lm.lon}|${lm.name}`}>
                {lm.name} ({lm.lat.toFixed(1)}°, {lm.lon.toFixed(1)}°)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddDropdown}
            className="whitespace-nowrap rounded-lg border border-sky-400/50 bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-500/30"
          >
            {t('p2BtnAdd')}
          </button>
          <button
            type="button"
            onClick={onResetSites}
            className="whitespace-nowrap rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800"
          >
            {t('p2BtnReset')}
          </button>
        </div>
      </div>

      {/* 5 Smart Verdict Winner Cards */}
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-5">
        <div className="panel-surface flex flex-col gap-1 border-t-2 border-t-emerald-400 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('vBestKicker')}
          </span>
          <div className="text-sm font-bold text-white">{evaluation.bestOverall.name}</div>
          <div className="font-mono-tab text-xs font-bold text-emerald-400">
            {evaluation.bestOverall.score} / 100 · Sun {evaluation.bestOverall.sim.sunPct.toFixed(0)}%
          </div>
          <p className="text-[11px] leading-snug text-slate-400">{t('vBestReason')}</p>
        </div>

        <div className="panel-surface flex flex-col gap-1 border-t-2 border-t-sky-400 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('vFlatKicker')}
          </span>
          <div className="text-sm font-bold text-white">{evaluation.flattest.name}</div>
          <div className="font-mono-tab text-xs font-bold text-sky-400">
            {evaluation.flattest.phys.slopeDeg.toFixed(1)}° (
            {evaluation.flattest.phys.slopeDeg < 7 ? t('slopeFlat') : t('slopeMod')})
          </div>
          <p className="text-[11px] leading-snug text-slate-400">{t('vFlatReason')}</p>
        </div>

        <div className="panel-surface flex flex-col gap-1 border-t-2 border-t-amber-400 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('vHotKicker')}
          </span>
          <div className="text-sm font-bold text-white">{evaluation.warmest.name}</div>
          <div className="font-mono-tab text-xs font-bold text-amber-400">
            {evaluation.warmest.phys.tempK.toFixed(0)} K ({evaluation.warmest.phys.tempC.toFixed(0)}°C)
          </div>
          <p className="text-[11px] leading-snug text-slate-400">{t('vHotReason')}</p>
        </div>

        <div className="panel-surface flex flex-col gap-1 border-t-2 border-t-orange-400 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('vDryKicker')}
          </span>
          <div className="text-sm font-bold text-white">{evaluation.driest.name}</div>
          <div className="font-mono-tab text-xs font-bold text-orange-400">
            {evaluation.driest.phys.moistureWtPct.toFixed(2)} wt% H₂O
          </div>
          <p className="text-[11px] leading-snug text-slate-400">{t('vDryReason')}</p>
        </div>

        <div className="panel-surface flex flex-col gap-1 border-t-2 border-t-violet-400 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('vIceKicker')}
          </span>
          <div className="text-sm font-bold text-white">{evaluation.iciest.name}</div>
          <div className="font-mono-tab text-xs font-bold text-violet-400">
            {evaluation.iciest.phys.moistureWtPct.toFixed(2)} wt% H₂O
          </div>
          <p className="text-[11px] leading-snug text-slate-400">{t('vIceReason')}</p>
        </div>
      </div>

      {/* Weights + Table + Chart Split */}
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[310px_1fr]">
        <div className="panel-surface flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>{t('p2WeightsHdr')}</span>
            <span className="font-mono-tab text-emerald-400">{t('p2LiveScore')}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">{t('p2WeightsDesc')}</p>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <label htmlFor="cw-sun">{t('p2WSun')}</label>
              <strong className="font-mono-tab text-amber-400">
                %{Math.round((wSun / sum) * 100)}
              </strong>
            </div>
            <input
              id="cw-sun"
              type="range"
              min={0}
              max={100}
              value={wSun}
              onChange={(e) => setWSun(Number(e.target.value))}
              className="astro-range w-full"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <label htmlFor="cw-dte">{t('p2WDte')}</label>
              <strong className="font-mono-tab text-sky-400">
                %{Math.round((wDte / sum) * 100)}
              </strong>
            </div>
            <input
              id="cw-dte"
              type="range"
              min={0}
              max={100}
              value={wDte}
              onChange={(e) => setWDte(Number(e.target.value))}
              className="astro-range w-full"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <label htmlFor="cw-slope">{t('p2WSlope')}</label>
              <strong className="font-mono-tab text-emerald-400">
                %{Math.round((wSlope / sum) * 100)}
              </strong>
            </div>
            <input
              id="cw-slope"
              type="range"
              min={0}
              max={100}
              value={wSlope}
              onChange={(e) => setWSlope(Number(e.target.value))}
              className="astro-range w-full"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <label htmlFor="cw-temp">{t('p2WTemp')}</label>
              <strong className="font-mono-tab text-orange-400">
                %{Math.round((wTemp / sum) * 100)}
              </strong>
            </div>
            <input
              id="cw-temp"
              type="range"
              min={0}
              max={100}
              value={wTemp}
              onChange={(e) => setWTemp(Number(e.target.value))}
              className="astro-range w-full"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <label htmlFor="cw-moisture-mode">{t('p2WMoist')}</label>
              <strong className="font-mono-tab text-violet-400">
                %{Math.round((wMoist / sum) * 100)}
              </strong>
            </div>
            <select
              id="cw-moisture-mode"
              value={moistMode}
              onChange={(e) => setMoistMode(e.target.value as 'dry' | 'ice')}
              className="w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
            >
              <option value="dry">{t('p2OptDry')}</option>
              <option value="ice">{t('p2OptIce')}</option>
            </select>
          </div>

          <div className="border-t border-slate-800 pt-2.5">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('p2CustomHdr')}
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
              <input
                type="number"
                step="0.01"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                placeholder={t('latPlaceholder')}
                aria-label={t('latDegLbl')}
                className="w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2 py-1.5 font-mono-tab text-xs text-slate-100 outline-none focus:border-sky-400"
              />
              <input
                type="number"
                step="0.01"
                value={customLon}
                onChange={(e) => setCustomLon(e.target.value)}
                placeholder={t('lonPlaceholder')}
                aria-label={t('lonDegLbl')}
                className="w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2 py-1.5 font-mono-tab text-xs text-slate-100 outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                className="rounded-lg border border-sky-400/50 bg-sky-500/20 px-2.5 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/30"
              >
                {t('btnAddShort')}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="panel-surface p-4">
            <div className="mb-2.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>{t('p2TableTitle')}</span>
              <span className="font-mono-tab text-sky-400">LOLA DEM · DIVINER · CSPICE</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[10.5px] uppercase tracking-wider text-slate-400">
                    <th className="px-2.5 py-2">{t('thRankSite')}</th>
                    <th className="px-2.5 py-2">{t('thCoords')}</th>
                    <th className="px-2.5 py-2">{t('thElevSlope')}</th>
                    <th className="px-2.5 py-2">{t('thTemp')}</th>
                    <th className="px-2.5 py-2">{t('thMoist')}</th>
                    <th className="px-2.5 py-2">{t('thSunDte')}</th>
                    <th className="px-2.5 py-2">{t('thAiVerdict')}</th>
                    <th className="px-2.5 py-2">{t('thAction')}</th>
                  </tr>
                </thead>
                <tbody data-testid="comparison-table-body">
                  {evaluation.ranked.map((item, idx) => {
                    const isGo = item.score >= 62 && item.phys.slopeDeg <= 10;
                    const isWarn = !isGo && item.score >= 38;
                    const slopeLabel =
                      item.phys.slopeDeg < 7
                        ? t('slopeFlat')
                        : item.phys.slopeDeg < 15
                          ? t('slopeMod')
                          : t('slopeSteep');
                    const moistLabel =
                      item.phys.moistureWtPct < 0.5
                        ? t('moistDry')
                        : item.phys.moistureWtPct < 2.5
                          ? t('moistLow')
                          : t('moistIce');

                    return (
                      <tr
                        key={`${item.name}-${item.lat}-${item.lon}`}
                        className="border-b border-slate-800/70 hover:bg-sky-500/5"
                      >
                        <td className="px-2.5 py-2.5 font-semibold">
                          <span className={idx === 0 ? 'text-emerald-400' : 'text-white'}>
                            #{idx + 1} {item.name}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5 font-mono-tab text-[11px]">
                          {item.lat.toFixed(3)}° {item.lat >= 0 ? t('cardN') : t('cardS')},{' '}
                          {item.lon.toFixed(3)}° {item.lon >= 0 ? t('cardE') : t('cardW')}
                          <div className="text-[10px] text-slate-500">
                            {formatDMS(item.lat, t('cardN'), t('cardS'))}
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 font-mono-tab text-[11px]">
                          {item.phys.elevM >= 0 ? '+' : ''}
                          {item.phys.elevM.toFixed(0)} m
                          <div
                            className={
                              item.phys.slopeDeg < 7
                                ? 'text-emerald-400'
                                : item.phys.slopeDeg < 15
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                            }
                          >
                            {item.phys.slopeDeg.toFixed(1)}° ({slopeLabel})
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 font-mono-tab text-[11px]">
                          <strong className="text-slate-100">{item.phys.tempK.toFixed(0)} K</strong>{' '}
                          <span className="text-slate-400">({item.phys.tempC.toFixed(0)}°C)</span>
                        </td>
                        <td className="px-2.5 py-2.5 font-mono-tab text-[11px]">
                          <strong className="text-slate-100">
                            {item.phys.moistureWtPct.toFixed(2)} wt%
                          </strong>
                          <div className="text-[10px] text-slate-400">{moistLabel}</div>
                        </td>
                        <td className="px-2.5 py-2.5 font-mono-tab text-[11px]">
                          Sun %{item.sim.sunPct.toFixed(1)} · DTE %{item.sim.dtePct.toFixed(1)}
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-amber-400"
                              style={{ width: `${Math.min(100, item.sim.sunPct)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5">
                          <div className="font-mono-tab text-xs font-bold text-sky-400">
                            {item.score} / 100
                          </div>
                          <span
                            className={`mt-0.5 inline-block rounded px-1.5 py-0.5 font-mono-tab text-[10px] font-bold ${
                              isGo
                                ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                                : isWarn
                                  ? 'border border-amber-400/40 bg-amber-500/15 text-amber-300'
                                  : 'border border-rose-400/40 bg-rose-500/15 text-rose-300'
                            }`}
                          >
                            {isGo ? t('stGo') : isWarn ? t('stWarn') : t('stNogo')}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => onViewIn3D(item.lat, item.lon, item.name)}
                              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-800"
                            >
                              {t('btnView3d')}
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendToFuel(item.lat, item.lon, item.name)}
                              className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/25"
                            >
                              {t('btnFuelShort')}
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${item.name}`}
                              onClick={() => onRemoveSite(item.origIdx)}
                              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-rose-400 hover:bg-slate-800"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel-surface p-4">
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>{t('p2ChartTitle')}</span>
              <span className="font-mono-tab text-slate-500">0 – 100</span>
            </div>
            <canvas
              ref={chartCanvasRef}
              className="block h-[200px] w-full rounded-lg bg-slate-950/70"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
