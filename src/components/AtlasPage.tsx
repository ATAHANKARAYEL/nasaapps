import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LANDMARKS, LandmarkCategory, SPECTRUM_META } from '../lib/landmarks';
import {
  computeGeodesic,
  computeHorizonAndMission,
  formatDMS,
  interpolateGreatCircle,
  parseCoordinateInput,
  sampleElevationMeters,
  sampleTerrainTelemetry,
  toSouthPoleStereo,
} from '../lib/lunarPhysics';
import { LunarSearchPanel } from './LunarSearchPanel';

interface AtlasPageProps {
  lang: string;
  t: (key: string) => string;
  spectrum: number;
  onChangeSpectrum: (idx: number) => void;
  sunAngleDeg: number;
  onChangeSunAngle: (deg: number) => void;
  autoSpin: boolean;
  onToggleSpin: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  measureMode: boolean;
  onToggleMeasureMode: (force?: boolean) => void;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleRightDrawer: () => void;
  selected: { lat: number; lon: number; name: string; tag: string };
  hoverCoords: { lat: number; lon: number } | null;
  pointA: { lat: number; lon: number };
  pointB: { lat: number; lon: number };
  scaleBar: { text: string; widthPx: number };
  activeTab: 'horizon' | 'profile' | 'ai' | 'api';
  onChangeTab: (tab: 'horizon' | 'profile' | 'ai' | 'api') => void;
  onFlyToPreset: (preset: 'near' | 'south' | 'southClose' | 'far') => void;
  onAdjustZoom: (delta: number) => void;
  onSelectCoordinate: (
    lat: number,
    lon: number,
    name: string,
    tag: string,
    fly?: boolean
  ) => void;
  onAddToComparison: () => void;
  onSendToFuel: () => void;
  onNotify: (msg: string) => void;
}

export const AtlasPage: React.FC<AtlasPageProps> = ({
  lang,
  t,
  spectrum,
  onChangeSpectrum,
  sunAngleDeg,
  onChangeSunAngle,
  autoSpin,
  onToggleSpin,
  showGrid,
  onToggleGrid,
  showLabels,
  onToggleLabels,
  measureMode,
  onToggleMeasureMode,
  leftOpen,
  rightOpen,
  onToggleRightDrawer,
  selected,
  hoverCoords,
  pointA,
  pointB,
  scaleBar,
  activeTab,
  onChangeTab,
  onFlyToPreset,
  onAdjustZoom,
  onSelectCoordinate,
  onAddToComparison,
  onSendToFuel,
  onNotify,
}) => {
  const [catFilter, setCatFilter] = useState<'ALL' | LandmarkCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [gotoText, setGotoText] = useState('');
  const [missionDays, setMissionDays] = useState<14 | 30>(14);
  const [wSun, setWSun] = useState(45);
  const [wDte, setWDte] = useState(35);
  const [wSlp, setWSlp] = useState(20);
  const [apiStatus, setApiStatus] = useState<'offline' | 'loading' | 'online'>('offline');
  const [apiResponseOverride, setApiResponseOverride] = useState<Record<string, unknown> | null>(
    null
  );

  const horizonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const profileCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const filteredLandmarks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return LANDMARKS.filter((l) => {
      const catOk = catFilter === 'ALL' || l.cat === catFilter;
      const textOk = !q || l.name.toLowerCase().includes(q) || l.cat.toLowerCase().includes(q);
      return catOk && textOk;
    });
  }, [catFilter, searchQuery]);

  const selectedPhys = useMemo(
    () => sampleTerrainTelemetry(selected.lat, selected.lon, sunAngleDeg),
    [selected.lat, selected.lon, sunAngleDeg]
  );

  const selectedSim = useMemo(
    () => computeHorizonAndMission(selected.lat, selected.lon, missionDays),
    [selected.lat, selected.lon, missionDays]
  );

  const readoutCoords = hoverCoords || selected;
  const readoutPhys = useMemo(
    () => sampleTerrainTelemetry(readoutCoords.lat, readoutCoords.lon, sunAngleDeg),
    [readoutCoords.lat, readoutCoords.lon, sunAngleDeg]
  );

  const profileData = useMemo(() => {
    const geo = computeGeodesic(pointA.lat, pointA.lon, pointB.lat, pointB.lon);
    const samples = 80;
    const elevs = new Float32Array(samples);
    let minE = Infinity;
    let maxE = -Infinity;
    let maxSlope = 0;

    for (let i = 0; i < samples; i++) {
      const pt = interpolateGreatCircle(
        pointA.lat,
        pointA.lon,
        pointB.lat,
        pointB.lon,
        i / (samples - 1)
      );
      const e = sampleElevationMeters(pt.lat, pt.lon);
      elevs[i] = e;
      if (e < minE) minE = e;
      if (e > maxE) maxE = e;
      if (i > 0 && geo.distKm > 0.01) {
        const stepM = (geo.distKm * 1000) / (samples - 1);
        const slp = Math.atan(Math.abs(elevs[i] - elevs[i - 1]) / stepM) * (180 / Math.PI);
        if (slp > maxSlope) maxSlope = slp;
      }
    }

    return {
      geo,
      elevs,
      minE,
      maxE,
      maxSlope,
      deltaH: elevs[samples - 1] - elevs[0],
    };
  }, [pointA.lat, pointA.lon, pointB.lat, pointB.lon]);

  const aiRanking = useMemo(() => {
    const sum = Math.max(1, wSun + wDte + wSlp);
    const nSun = wSun / sum;
    const nDte = wDte / sum;
    const nSlp = wSlp / sum;

    const candidates = [
      { name: 'Shackleton Rim', lat: -89.9, lon: 0.0 },
      { name: 'Connecting Ridge (Artemis)', lat: -89.45, lon: -137.5 },
      { name: 'Malapert Massif Peak', lat: -86.0, lon: 0.0 },
      { name: 'De Gerlache Rim', lat: -88.5, lon: -88.3 },
      { name: 'Nobile Rim (VIPER)', lat: -85.2, lon: 53.5 },
      {
        name: `${selected.name.split('(')[0].trim()} (${selected.lat.toFixed(2)}°)`,
        lat: selected.lat,
        lon: selected.lon,
      },
    ];

    return {
      nSun,
      nDte,
      nSlp,
      list: candidates
        .map((c) => {
          const phys = sampleTerrainTelemetry(c.lat, c.lon, sunAngleDeg);
          const sim = computeHorizonAndMission(c.lat, c.lon, 14);
          const slopeSafety = Math.max(0, Math.min(100, 100 - phys.slopeDeg * 4.2));
          const score = nSun * sim.sunPct + nDte * sim.dtePct + nSlp * slopeSafety;
          return { ...c, score, sunPct: sim.sunPct, dtePct: sim.dtePct, slope: phys.slopeDeg };
        })
        .sort((a, b) => b.score - a.score),
    };
  }, [wSun, wDte, wSlp, selected.name, selected.lat, selected.lon, sunAngleDeg]);

  const contractPayload = useMemo(() => {
    const stereo = toSouthPoleStereo(selected.lat, selected.lon);
    return {
      mission_planner: 'AstroApex CSPICE + LOLA DEM v3.1',
      language: lang,
      request: {
        latitude_deg: Number(selected.lat.toFixed(6)),
        longitude_deg: Number(selected.lon.toFixed(6)),
        duration_hours: missionDays * 24,
        step_minutes: 60,
        terrain_masking: true,
        earth_disk_mode: true,
      },
      selenographic: {
        dms_lat: formatDMS(selected.lat, t('cardN'), t('cardS')),
        dms_lon: formatDMS(selected.lon, t('cardE'), t('cardW')),
        lon_360_deg: Number(((selected.lon + 360) % 360).toFixed(6)),
        south_pole_stereo_km: {
          x: Number(stereo.xKm.toFixed(3)),
          y: Number(stereo.yKm.toFixed(3)),
          r: Number(stereo.rKm.toFixed(3)),
        },
        lola_elevation_m: Number(selectedPhys.elevM.toFixed(1)),
        local_slope_deg: Number(selectedPhys.slopeDeg.toFixed(2)),
        surface_temp_k: Number(selectedPhys.tempK.toFixed(1)),
        regolith_moisture_wt_pct: Number(selectedPhys.moistureWtPct.toFixed(3)),
      },
      visibility_summary: {
        sun_illumination_pct: Number(selectedSim.sunPct.toFixed(2)),
        earth_dte_pct: Number(selectedSim.dtePct.toFixed(2)),
        terrain_occlusion_loss_pct: Number(selectedSim.terrainLossPct.toFixed(2)),
        end_battery_soc_pct: Number(selectedSim.finalSoc.toFixed(1)),
      },
    };
  }, [selected, missionDays, lang, selectedPhys, selectedSim, t]);

  // Draw Horizon Chart
  useEffect(() => {
    const c = horizonCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 26;
    const padR = 8;
    const padT = 10;
    const padB = 18;
    const gW = W - padL - padR;
    const gH = H - padT - padB;
    const minEl = -6;
    const maxEl = 14;
    const mapY = (el: number) => padT + gH - ((el - minEl) / (maxEl - minEl)) * gH;

    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.lineWidth = 1;
    [0, 5, 10].forEach((deg) => {
      const y = mapY(deg);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`${deg}°`, 2, y + 3);
    });

    ctx.strokeStyle = 'rgba(56,189,248,0.35)';
    ctx.beginPath();
    ctx.moveTo(padL, mapY(0));
    ctx.lineTo(W - padR, mapY(0));
    ctx.stroke();

    ctx.fillStyle = 'rgba(251,191,36,0.55)';
    for (let i = 0; i < selectedSim.timeline.length; i += 2) {
      const pt = selectedSim.timeline[i];
      const x = padL + (pt.azIdx / 360) * gW;
      const y = mapY(Math.max(minEl, Math.min(maxEl, pt.sunElDeg)));
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.beginPath();
    ctx.moveTo(padL, H - padB);
    for (let az = 0; az < 360; az++) {
      const x = padL + (az / 359) * gW;
      const y = mapY(Math.max(minEl, Math.min(maxEl, selectedSim.horizonProfile[az])));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W - padR, H - padB);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, H - padB);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    [`0°${t('cardN')}`, `90°${t('cardE')}`, `180°${t('cardS')}`, `270°${t('cardW')}`, '360°'].forEach(
      (lbl, idx) => {
        ctx.fillText(lbl, padL + (idx / 4) * (gW - 22), H - 4);
      }
    );
  }, [selectedSim, t]);

  // Draw Timeline Chart
  useEffect(() => {
    const c = timelineCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 26;
    const padR = 8;
    const padT = 8;
    const padB = 18;
    const gW = W - padL - padR;
    const gH = H - padT - padB;
    const n = selectedSim.timeline.length;
    const barW = Math.max(1, gW / n);

    for (let i = 0; i < n; i++) {
      const x = padL + (i / n) * gW;
      if (selectedSim.timeline[i].sunVisible) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.65)';
        ctx.fillRect(x, padT, barW + 0.5, 7);
      }
      if (selectedSim.timeline[i].dteVisible) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.fillRect(x, padT + 9, barW + 0.5, 7);
      }
    }

    const socTop = padT + 20;
    const socH = gH - 20;
    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.beginPath();
    ctx.moveTo(padL, socTop + socH * 0.5);
    ctx.lineTo(W - padR, socTop + socH * 0.5);
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = padL + (i / (n - 1)) * gW;
      const y = socTop + socH - (selectedSim.timeline[i].soc / 100) * socH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText('100%', 2, socTop + 7);
    ctx.fillText('20%', 4, socTop + socH);
    ctx.fillText('Sun   DTE   SoC %', padL, H - 4);
  }, [selectedSim]);

  // Draw 2-Point Cross-Section
  useEffect(() => {
    const c = profileCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 34;
    const padR = 10;
    const padT = 12;
    const padB = 18;
    const gW = W - padL - padR;
    const gH = H - padT - padB;
    const span = Math.max(50, profileData.maxE - profileData.minE);
    const n = profileData.elevs.length;

    ctx.beginPath();
    ctx.moveTo(padL, H - padB);
    for (let i = 0; i < n; i++) {
      const x = padL + (i / (n - 1)) * gW;
      const y = padT + gH - ((profileData.elevs[i] - profileData.minE) / span) * gH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W - padR, H - padB);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, padT, 0, H - padB);
    grad.addColorStop(0, 'rgba(52, 211, 153, 0.45)');
    grad.addColorStop(1, 'rgba(6, 78, 59, 0.15)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText(`${profileData.maxE.toFixed(0)}m`, 2, padT + 6);
    ctx.fillText(`${profileData.minE.toFixed(0)}m`, 2, H - padB);
    ctx.fillText('A (0 km)', padL, H - 4);
    ctx.fillText(`B (${profileData.geo.distKm.toFixed(1)} km)`, W - 74, H - 4);
  }, [profileData]);

  const handleGoTo = () => {
    const parsed = parseCoordinateInput(gotoText);
    if (!parsed) {
      onNotify('Format: -89.45, -137.50');
      return;
    }
    const label = parsed.isDms
      ? `DMS (${parsed.lat.toFixed(3)}°, ${parsed.lon.toFixed(3)}°)`
      : `(${parsed.lat.toFixed(3)}°, ${parsed.lon.toFixed(3)}°)`;
    onSelectCoordinate(parsed.lat, parsed.lon, label, parsed.isDms ? 'DMS' : 'TARGET', true);
    onNotify(`${parsed.lat.toFixed(4)}°, ${parsed.lon.toFixed(4)}°`);
  };

  const handleQueryBackend = async () => {
    setApiStatus('loading');
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractPayload.request),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      setApiResponseOverride(data);
      setApiStatus('online');
      onNotify('AstroApex Server Simulation Engine (/api/simulate) verified.');
    } catch {
      setApiStatus('offline');
      onNotify('Offline CSPICE + LOLA DEM engine active.');
    }
  };

  const handleExportJSON = () => {
    const payload = apiResponseOverride || contractPayload;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astroapex_${selected.lat.toFixed(2)}_${selected.lon.toFixed(2)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('JSON exported.');
  };

  const specMeta = SPECTRUM_META[spectrum];
  const readoutLonNorm = ((readoutCoords.lon + 180) % 360 + 360) % 360 - 180;
  const readoutLon360 = (readoutLonNorm + 360) % 360;
  const readoutStereo = toSouthPoleStereo(readoutCoords.lat, readoutLonNorm);
  const slopeCat =
    selectedPhys.slopeDeg < 7
      ? t('slopeFlat')
      : selectedPhys.slopeDeg < 15
        ? t('slopeMod')
        : t('slopeSteep');

  return (
    <>
      {/* Top Camera Preset Strip */}
      <div
        className="panel-surface fixed top-16 z-10 hidden -translate-x-1/2 items-center gap-1 px-2 py-1 xl:flex"
        style={{
          left:
            leftOpen && rightOpen
              ? 'calc(50% - 41px)'
              : leftOpen
                ? 'calc(50% + 152px)'
                : rightOpen
                  ? 'calc(50% - 193px)'
                  : '50%',
        }}
      >
        <button
          type="button"
          onClick={() => onFlyToPreset('near')}
          className="whitespace-nowrap rounded-md border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
        >
          {t('camNear')}
        </button>
        <button
          type="button"
          onClick={() => onFlyToPreset('south')}
          className="whitespace-nowrap rounded-md border border-sky-400/50 bg-sky-500/20 px-2 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/30"
        >
          {t('camSouth')}
        </button>
        <button
          type="button"
          onClick={() => onFlyToPreset('southClose')}
          className="whitespace-nowrap rounded-md border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
        >
          {t('camSouthClose')}
        </button>
        <button
          type="button"
          onClick={() => onFlyToPreset('far')}
          className="whitespace-nowrap rounded-md border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
        >
          {t('camFar')}
        </button>
        <button
          type="button"
          onClick={() => onToggleMeasureMode()}
          className={`whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold ${
            measureMode
              ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
              : 'border-slate-700/60 bg-slate-900/70 text-slate-200 hover:bg-slate-800'
          }`}
        >
          {t('btnMeasure')}
        </button>
        <button
          type="button"
          onClick={onToggleGrid}
          className={`whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold ${
            showGrid
              ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
              : 'border-slate-700/60 bg-slate-900/70 text-slate-400'
          }`}
        >
          {t('btnGrid')}
        </button>
        <button
          type="button"
          onClick={onToggleLabels}
          className={`whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold ${
            showLabels
              ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
              : 'border-slate-700/60 bg-slate-900/70 text-slate-400'
          }`}
        >
          {t('btnLabels')}
        </button>
      </div>

      {/* Left Spectrum + GoTo + 90 Landmarks Dock */}
      <aside
        className={`panel-surface fixed bottom-[72px] left-3.5 top-16 z-10 flex w-[290px] max-w-[calc(100vw-28px)] flex-col gap-2.5 overflow-y-auto p-3 transition-transform duration-200 ${
          leftOpen ? 'translate-x-0 opacity-100' : '-translate-x-[320px] pointer-events-none opacity-0'
        }`}
        data-testid="atlas-left-dock"
      >
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>{t('hdrSpectrum')}</span>
          <span className="font-mono-tab text-sky-400" data-testid="active-spec-code">
            {specMeta.code}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {SPECTRUM_META.map((m, idx) => (
            <button
              key={m.code}
              type="button"
              onClick={() => onChangeSpectrum(idx)}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                spectrum === idx
                  ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-100'
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: m.swatch }}
                aria-hidden="true"
              />
              <span className="truncate">{t(`spec${idx}`)}</span>
            </button>
          ))}
        </div>

        <div className="panel-inset p-2">
          <div className="flex justify-between font-mono-tab text-[9.5px] text-slate-300">
            <span>{t(`leg${spectrum}Title`)}</span>
            <span>{specMeta.unit}</span>
          </div>
          <div className="my-1.5 h-1.5 rounded-full" style={{ background: specMeta.grad }} />
          <div className="flex justify-between font-mono-tab text-[9px] text-slate-400">
            <span>{t(`leg${spectrum}Min`)}</span>
            <span>{t(`leg${spectrum}Mid`)}</span>
            <span>{t(`leg${spectrum}Max`)}</span>
          </div>
        </div>

        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {t('hdrGoto')}
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={gotoText}
            onChange={(e) => setGotoText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGoTo()}
            placeholder={t('gotoPlaceholder')}
            aria-label={t('hdrGoto')}
            className="w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-1.5 font-mono-tab text-[11px] text-slate-100 outline-none focus:border-sky-400"
          />
          <button
            type="button"
            onClick={handleGoTo}
            className="shrink-0 rounded-lg border border-sky-400/50 bg-sky-500/20 px-2.5 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/30"
          >
            {t('btnGo')}
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>{t('hdrCatalog')}</span>
          <span className="font-mono-tab text-slate-300" data-testid="landmark-count">
            {filteredLandmarks.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {(['ALL', 'POLE', 'CRATER', 'MARE', 'LANDING'] as const).map((cat) => {
            const labelKey =
              cat === 'ALL'
                ? 'catAll'
                : cat === 'POLE'
                  ? 'catPole'
                  : cat === 'CRATER'
                    ? 'catCrater'
                    : cat === 'MARE'
                      ? 'catMare'
                      : 'catLanding';
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                className={`rounded-md border px-2 py-1 text-[10px] font-bold ${
                  catFilter === cat
                    ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('hdrCatalog')}
          className="w-full rounded-lg border border-slate-700/70 bg-slate-950/90 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
        />

        <div className="flex min-h-[110px] flex-1 flex-col gap-1 overflow-y-auto pr-0.5">
          {filteredLandmarks.map((lm) => (
            <button
              key={lm.id}
              type="button"
              onClick={() => onSelectCoordinate(lm.lat, lm.lon, lm.name, lm.cat, true)}
              className="flex w-full items-center justify-between gap-2 rounded-md bg-slate-900/50 px-2 py-1.5 text-left transition-colors hover:bg-sky-500/20"
            >
              <span className="truncate text-[11px] font-semibold text-slate-100">{lm.name}</span>
              <span className="shrink-0 font-mono-tab text-[9.5px] text-slate-400">
                {lm.lat.toFixed(1)}°, {lm.lon.toFixed(1)}°
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Dynamic Scale Bar */}
      <div
        className="pointer-events-none fixed bottom-[70px] z-10 flex -translate-x-1/2 flex-col items-center gap-1"
        style={{
          left:
            leftOpen && rightOpen
              ? 'calc(50% - 41px)'
              : leftOpen
                ? 'calc(50% + 152px)'
                : rightOpen
                  ? 'calc(50% - 193px)'
                  : '50%',
        }}
      >
        <div className="font-mono-tab text-[10px] font-bold text-slate-200">{scaleBar.text}</div>
        <div
          className="h-1.5 border-x-2 border-b-2 border-sky-400"
          style={{ width: `${scaleBar.widthPx}px` }}
        />
      </div>

      {/* Right Scientific Analysis Drawer */}
      <aside
        className={`panel-surface fixed bottom-[72px] right-3.5 top-16 z-10 flex w-[372px] max-w-[calc(100vw-28px)] flex-col overflow-hidden transition-transform duration-200 ${
          rightOpen ? 'translate-x-0 opacity-100' : 'translate-x-[400px] pointer-events-none opacity-0'
        }`}
        data-testid="atlas-right-drawer"
      >
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-3.5 py-2.5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              {selected.tag}
            </div>
            <h2 className="font-display text-sm font-bold text-white" data-testid="selected-site-title">
              {selected.name}
            </h2>
            <div className="mt-0.5 font-mono-tab text-[10.5px] text-slate-400" data-testid="selected-site-coords">
              {selected.lat.toFixed(4)}° {selected.lat >= 0 ? t('cardN') : t('cardS')},{' '}
              {selected.lon.toFixed(4)}° {selected.lon >= 0 ? t('cardE') : t('cardW')} ·{' '}
              {formatDMS(selected.lat, t('cardN'), t('cardS'))}
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleRightDrawer}
            aria-label="Close analysis panel"
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 border-b border-slate-800 bg-slate-950/60 px-3.5 py-2">
          <button
            type="button"
            onClick={onAddToComparison}
            className="whitespace-nowrap rounded-lg border border-emerald-400/45 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
          >
            {t('btnAddComp')}
          </button>
          <button
            type="button"
            onClick={onSendToFuel}
            className="whitespace-nowrap rounded-lg border border-amber-400/45 bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
          >
            {t('btnSendFuel')}
          </button>
        </div>

        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/40">
          {(['horizon', 'profile', 'ai', 'api'] as const).map((tabId) => {
            const labelKey =
              tabId === 'horizon'
                ? 'tabHorizon'
                : tabId === 'profile'
                  ? 'tabProfile'
                  : tabId === 'ai'
                    ? 'tabAi'
                    : 'tabApi';
            return (
              <button
                key={tabId}
                type="button"
                onClick={() => onChangeTab(tabId)}
                className={`border-b-2 py-2 text-[10.5px] font-bold transition-colors ${
                  activeTab === tabId
                    ? 'border-sky-400 bg-sky-500/10 text-sky-300'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3.5">
          {activeTab === 'horizon' && (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="panel-inset p-2">
                  <div className="text-[9px] uppercase text-slate-500">{t('kpiElev')}</div>
                  <div className="font-mono-tab text-[11px] font-bold text-slate-100">
                    {selectedPhys.elevM >= 0 ? '+' : ''}
                    {selectedPhys.elevM.toFixed(0)} m
                  </div>
                </div>
                <div className="panel-inset p-2">
                  <div className="text-[9px] uppercase text-slate-500">{t('kpiSlope')}</div>
                  <div className="font-mono-tab text-[11px] font-bold text-slate-100">
                    {selectedPhys.slopeDeg.toFixed(1)}° ({slopeCat})
                  </div>
                </div>
                <div className="panel-inset p-2">
                  <div className="text-[9px] uppercase text-slate-500">{t('kpiTemp')}</div>
                  <div className="font-mono-tab text-[11px] font-bold text-slate-100">
                    {selectedPhys.tempK.toFixed(0)} K ({selectedPhys.tempC.toFixed(0)}°C)
                  </div>
                </div>
                <div className="panel-inset p-2">
                  <div className="text-[9px] uppercase text-slate-500">{t('kpiMoist')}</div>
                  <div className="font-mono-tab text-[11px] font-bold text-violet-400">
                    {selectedPhys.moistureWtPct.toFixed(2)} wt% H₂O
                  </div>
                </div>
                <div className="panel-inset p-2">
                  <div className="text-[9px] uppercase text-slate-500">{t('kpiSun')}</div>
                  <div className="font-mono-tab text-[11px] font-bold text-amber-400">
                    {selectedSim.sunPct.toFixed(1)}%
                  </div>
                </div>
                <div className="panel-inset p-2">
                  <div className="text-[9px] uppercase text-slate-500">{t('kpiDte')}</div>
                  <div className="font-mono-tab text-[11px] font-bold text-sky-400">
                    {selectedSim.dtePct.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="panel-inset p-2.5">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>{t('chartHorizonTitle')}</span>
                  <span className="font-mono-tab text-amber-400">{t('chart360Rays')}</span>
                </div>
                <canvas
                  ref={horizonCanvasRef}
                  width={335}
                  height={110}
                  className="block h-[110px] w-full rounded"
                />
              </div>

              <div className="panel-inset p-2.5">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>{t('chartTimelineTitle')}</span>
                  <select
                    value={missionDays}
                    onChange={(e) => setMissionDays(Number(e.target.value) as 14 | 30)}
                    aria-label={t('chartTimelineTitle')}
                    className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono-tab text-[10px] text-slate-200"
                  >
                    <option value={14}>{t('opt14d')}</option>
                    <option value={30}>{t('opt30d')}</option>
                  </select>
                </div>
                <canvas
                  ref={timelineCanvasRef}
                  width={335}
                  height={110}
                  className="block h-[110px] w-full rounded"
                />
              </div>
            </>
          )}

          {activeTab === 'profile' && (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">{t('profPickHint')}</span>
                <button
                  type="button"
                  onClick={() => onToggleMeasureMode(true)}
                  className="rounded-lg border border-sky-400/50 bg-sky-500/20 px-2.5 py-1 text-[11px] font-semibold text-sky-100"
                >
                  {t('btnPickMap')}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="panel-inset p-2">
                  <div className="text-[9px] uppercase text-slate-500">{t('profDist')}</div>
                  <div className="font-mono-tab text-[11px] font-bold text-sky-400">
                    {profileData.geo.distKm >= 1
                      ? `${profileData.geo.distKm.toFixed(2)} km`
                      : `${(profileData.geo.distKm * 1000).toFixed(0)} m`}
                  </div>
                </div>
                <div className="panel-inset p-2">
                  <div className="text-[9px] uppercase text-slate-500">{t('profBearing')}</div>
                  <div className="font-mono-tab text-[11px] font-bold text-slate-100">
                    {profileData.geo.bearing.toFixed(1)}°
                  </div>
                </div>
                <div className="panel-inset p-2">
                  <div className="text-[9px] uppercase text-slate-500">{t('profMaxSlope')}</div>
                  <div className="font-mono-tab text-[11px] font-bold text-amber-400">
                    {profileData.maxSlope.toFixed(1)}°
                  </div>
                </div>
              </div>
              <div className="panel-inset p-2.5">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>{t('profChartTitle')}</span>
                  <span className="font-mono-tab text-emerald-400">
                    Δh: {profileData.deltaH >= 0 ? '+' : ''}
                    {profileData.deltaH.toFixed(0)} m
                  </span>
                </div>
                <canvas
                  ref={profileCanvasRef}
                  width={335}
                  height={130}
                  className="block h-[130px] w-full rounded"
                />
              </div>
              <div className="panel-inset p-2.5 font-mono-tab text-[10.5px] leading-relaxed">
                <div>
                  <strong className="text-emerald-400">{t('ptALbl')}</strong>{' '}
                  {pointA.lat.toFixed(4)}°, {pointA.lon.toFixed(4)}°
                </div>
                <div>
                  <strong className="text-amber-400">{t('ptBLbl')}</strong> {pointB.lat.toFixed(4)}°,{' '}
                  {pointB.lon.toFixed(4)}°
                </div>
              </div>
            </>
          )}

          {activeTab === 'ai' && (
            <>
              <p className="text-[11px] leading-relaxed text-slate-400">{t('aiDesc')}</p>
              <div className="panel-inset flex flex-col gap-2 p-2.5">
                <div className="flex justify-between text-[10.5px]">
                  <span>{t('aiWSun')}</span>
                  <span className="font-mono-tab text-amber-400">{aiRanking.nSun.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={wSun}
                  onChange={(e) => setWSun(Number(e.target.value))}
                  aria-label={t('aiWSun')}
                  className="astro-range w-full"
                />
                <div className="flex justify-between text-[10.5px]">
                  <span>{t('aiWDte')}</span>
                  <span className="font-mono-tab text-sky-400">{aiRanking.nDte.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={wDte}
                  onChange={(e) => setWDte(Number(e.target.value))}
                  aria-label={t('aiWDte')}
                  className="astro-range w-full"
                />
                <div className="flex justify-between text-[10.5px]">
                  <span>{t('aiWSlp')}</span>
                  <span className="font-mono-tab text-emerald-400">{aiRanking.nSlp.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={wSlp}
                  onChange={(e) => setWSlp(Number(e.target.value))}
                  aria-label={t('aiWSlp')}
                  className="astro-range w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                {aiRanking.list.map((item, idx) => (
                  <button
                    key={`${item.name}-${idx}`}
                    type="button"
                    onClick={() =>
                      onSelectCoordinate(item.lat, item.lon, item.name, `AI #${idx + 1}`, true)
                    }
                    className="panel-inset flex items-center justify-between gap-2 px-2.5 py-2 text-left hover:bg-sky-500/15"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-white">
                        #{idx + 1} {item.name}
                      </div>
                      <div className="font-mono-tab text-[9.5px] text-slate-400">
                        Sun {item.sunPct.toFixed(0)}% · DTE {item.dtePct.toFixed(0)}% · Slope{' '}
                        {item.slope.toFixed(1)}°
                      </div>
                    </div>
                    <span className="rounded border border-emerald-400/40 bg-emerald-500/15 px-1.5 py-0.5 font-mono-tab text-[10px] font-bold text-emerald-300">
                      {item.score.toFixed(1)}
                    </span>
                  </button>
                ))}
              </div>

              <LunarSearchPanel
                lang={lang}
                compact
                siteContext={{ name: selected.name, lat: selected.lat, lon: selected.lon }}
              />
            </>
          )}

          {activeTab === 'api' && (
            <>
              <div className="flex items-center justify-between font-mono-tab text-[11px]">
                <span className="text-sky-400">POST /api/simulate</span>
                <span className="text-emerald-400">
                  {apiStatus === 'online'
                    ? 'SERVER CSPICE ONLINE'
                    : apiStatus === 'loading'
                      ? 'QUERYING...'
                      : 'CLIENT + SERVER READY'}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleQueryBackend}
                  className="flex-1 rounded-lg border border-sky-400/50 bg-sky-500/20 px-2.5 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/30"
                >
                  {t('btnQueryApi')}
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  {t('btnExportJson')}
                </button>
              </div>
              <div className="text-[10.5px] text-slate-400">{t('apiContractNote')}</div>
              <pre className="panel-inset max-h-[190px] overflow-auto whitespace-pre-wrap p-2.5 font-mono-tab text-[10px] text-sky-200">
                {JSON.stringify(apiResponseOverride || contractPayload, null, 2)}
              </pre>
            </>
          )}
        </div>
      </aside>

      {/* Bottom Moon Trek Precision Coordinate & Solar Phase Bar */}
      <footer className="panel-surface fixed bottom-3 inset-x-3.5 z-10 flex flex-wrap items-center justify-between gap-3 px-3.5 py-2">
        <div className="flex flex-wrap items-center gap-4 font-mono-tab text-[10.5px]">
          <div className="flex flex-col">
            <span className="text-[8.5px] uppercase tracking-wider text-slate-500">
              {t('hudDecLbl')}
            </span>
            <span className="font-bold text-slate-100">
              {Math.abs(readoutCoords.lat).toFixed(4)}°{' '}
              {readoutCoords.lat >= 0 ? t('cardN') : t('cardS')},{' '}
              {Math.abs(readoutLonNorm).toFixed(4)}°{' '}
              {readoutLonNorm >= 0 ? t('cardE') : t('cardW')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8.5px] uppercase tracking-wider text-slate-500">
              {t('hudDmsLbl')}
            </span>
            <span className="font-bold text-slate-100">
              {formatDMS(readoutCoords.lat, t('cardN'), t('cardS'))},{' '}
              {formatDMS(readoutLonNorm, t('cardE'), t('cardW'))}
            </span>
          </div>
          <div className="hidden flex-col md:flex">
            <span className="text-[8.5px] uppercase tracking-wider text-slate-500">
              {t('hudLon360Lbl')}
            </span>
            <span className="font-bold text-slate-100">
              {readoutLon360.toFixed(4)}° {t('cardE')}
            </span>
          </div>
          <div className="hidden flex-col lg:flex">
            <span className="text-[8.5px] uppercase tracking-wider text-slate-500">
              {t('hudStereoLbl')}
            </span>
            <span className="font-bold text-slate-100">
              X: {readoutStereo.xKm.toFixed(1)} km, Y: {readoutStereo.yKm.toFixed(1)} km
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8.5px] uppercase tracking-wider text-slate-500">
              {t('hudPhysLbl')}
            </span>
            <span className="font-bold text-sky-400">
              {readoutPhys.elevM >= 0 ? '+' : ''}
              {readoutPhys.elevM.toFixed(0)} m · {readoutPhys.slopeDeg.toFixed(1)}° ·{' '}
              {readoutPhys.tempK.toFixed(0)} K · {readoutPhys.moistureWtPct.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex min-w-[92px] flex-col">
            <span className="text-[9px] font-bold uppercase text-amber-400">{t('sunAzLbl')}</span>
            <span className="font-mono-tab text-[10.5px] text-slate-300">
              {sunAngleDeg >= 0 ? '+' : ''}
              {sunAngleDeg}° (Sub-Solar)
            </span>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            value={sunAngleDeg}
            onChange={(e) => onChangeSunAngle(Number(e.target.value))}
            aria-label={t('sunAzLbl')}
            className="astro-range w-24"
          />
          <button
            type="button"
            onClick={onToggleSpin}
            aria-label="Toggle auto spin"
            className={`rounded-md border px-2 py-1 text-xs font-bold ${
              autoSpin
                ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                : 'border-slate-700 bg-slate-900 text-slate-300'
            }`}
          >
            {autoSpin ? '❚❚' : '▶'}
          </button>
          <button
            type="button"
            onClick={() => onAdjustZoom(-0.35)}
            aria-label="Zoom out"
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-slate-200 hover:bg-slate-800"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onAdjustZoom(0.35)}
            aria-label="Zoom in"
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-slate-200 hover:bg-slate-800"
          >
            +
          </button>
        </div>
      </footer>
    </>
  );
};
