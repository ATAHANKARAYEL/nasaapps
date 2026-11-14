import React, { useCallback, useEffect, useState } from 'react';
import { AtlasPage } from './components/AtlasPage';
import { ComparisonPage } from './components/ComparisonPage';
import { CoverPage } from './components/CoverPage';
import { FuelSimulatorPage } from './components/FuelSimulatorPage';
import { CameraTarget, LunarGlobeCanvas } from './components/LunarGlobeCanvas';
import { TeamReferencesPage } from './components/TeamReferencesPage';
import { LANGUAGES, translate } from './lib/i18n';
import { ComparisonSiteInput, DEG2RAD } from './lib/lunarPhysics';

type MainPage = 0 | 1 | 2 | 3 | 4;

const DEFAULT_COMPARISON_SITES: ComparisonSiteInput[] = [
  { name: 'Shackleton Krateri (Rim)', lat: -89.9, lon: 0.0 },
  { name: 'Connecting Ridge (Artemis III)', lat: -89.45, lon: -137.5 },
  { name: 'Mons Mouton Platosu (VIPER)', lat: -84.95, lon: 31.0 },
  { name: 'Shackleton Tabanı (PSR Buz)', lat: -89.65, lon: 115.0 },
];

export function App() {
  const [lang, setLang] = useState<string>('tr');
  const [currentPage, setCurrentPage] = useState<MainPage>(0);
  const [hasEnteredApp, setHasEnteredApp] = useState<boolean>(false);
  const [spectrum, setSpectrum] = useState<number>(0);
  const [sunAngleDeg, setSunAngleDeg] = useState<number>(32);
  const [autoSpin, setAutoSpin] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [measureMode, setMeasureMode] = useState<boolean>(false);
  const [nextMeasurePoint, setNextMeasurePoint] = useState<'A' | 'B'>('A');
  const [leftOpen, setLeftOpen] = useState<boolean>(true);
  const [rightOpen, setRightOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'horizon' | 'profile' | 'ai' | 'api'>('horizon');

  const [cameraTarget, setCameraTarget] = useState<CameraTarget>({
    yaw: 0.0,
    pitch: -Math.PI * 0.485,
    zoom: 1.65,
  });
  const [cameraSeq, setCameraSeq] = useState<number>(0);

  const [selected, setSelected] = useState({
    lat: -89.9,
    lon: 0.0,
    name: 'Shackleton Krateri (Rim)',
    tag: 'ARTEMİS III ADAY BÖLGESİ',
  });
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [pointA, setPointA] = useState({ lat: -89.9, lon: 0.0 });
  const [pointB, setPointB] = useState({ lat: -89.45, lon: -137.5 });
  const [scaleBar, setScaleBar] = useState({ text: '500 km', widthPx: 110 });

  const [comparisonSites, setComparisonSites] = useState<ComparisonSiteInput[]>(
    DEFAULT_COMPARISON_SITES
  );
  const [fuelLat, setFuelLat] = useState<number>(-89.9);
  const [fuelLon, setFuelLon] = useState<number>(0.0);
  const [toastMsg, setToastMsg] = useState<string>('');

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  useEffect(() => {
    const langOpt = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = langOpt?.rtl ? 'rtl' : 'ltr';
  }, [lang]);

  // Dynamic canonical URL, OpenGraph URL/image, and per-view document title
  useEffect(() => {
    const isTr = lang === 'tr' || lang === 'az';
    const pageTitles: Record<MainPage, string> = isTr
      ? {
          0: 'AstroApex Ay Atlası — CLPS Lunar Mission Browser',
          1: '1. Ay Atlası (3B) | AstroApex — CLPS Lunar Mission Browser',
          2: '2. Bölge Karşılaştırma | AstroApex — CLPS Lunar Mission Browser',
          3: '3. Yakıt & Δv Planlayıcı | AstroApex — CLPS Lunar Mission Browser',
          4: '4. Ekip & NASA Kaynakçası | AstroApex — CLPS Lunar Mission Browser',
        }
      : {
          0: 'AstroApex Ay Atlası — CLPS Lunar Mission Browser',
          1: '1. 3D Lunar Atlas | AstroApex — CLPS Lunar Mission Browser',
          2: '2. Site Comparison | AstroApex — CLPS Lunar Mission Browser',
          3: '3. Fuel & Δv Planner | AstroApex — CLPS Lunar Mission Browser',
          4: '4. Team & NASA Sources | AstroApex — CLPS Lunar Mission Browser',
        };
    document.title = pageTitles[currentPage];

    const origin = window.location.origin;
    const canonicalHref =
      currentPage === 0
        ? `${origin}${window.location.pathname}`
        : `${origin}${window.location.pathname}?page=${currentPage}`;

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonicalHref;

    const upsertMeta = (attr: 'property' | 'name', key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    upsertMeta('property', 'og:url', canonicalHref);
    upsertMeta('property', 'og:image', `${origin}/og-cover.jpg`);
    upsertMeta('name', 'twitter:image', `${origin}/og-cover.jpg`);
  }, [currentPage, lang]);

  // Support ?page=1|2|3|4 or ?autostart=1 deep links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = Number(params.get('page'));
    if (p === 1 || p === 2 || p === 3 || p === 4) {
      setCurrentPage(p);
      setHasEnteredApp(true);
    } else if (params.get('autostart') === '1') {
      setCurrentPage(1);
      setHasEnteredApp(true);
    }
  }, []);

  const navigateToPage = useCallback((page: MainPage) => {
    setCurrentPage(page);
    if (page >= 1) {
      setHasEnteredApp(true);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const id = window.setTimeout(() => setToastMsg(''), 3000);
    return () => clearTimeout(id);
  }, [toastMsg]);

  const handleSelectCoordinate = useCallback(
    (latDeg: number, lonDeg: number, name = 'Target', tag = 'SELENOGRAPHIC', fly = false) => {
      const lonNorm = ((lonDeg + 180) % 360 + 360) % 360 - 180;
      const latClamp = Math.max(-90, Math.min(90, latDeg));
      setSelected({ lat: latClamp, lon: lonNorm, name, tag });
      if (fly) {
        setAutoSpin(false);
        setCameraTarget((prev) => ({
          yaw: lonNorm * DEG2RAD,
          pitch: latClamp * DEG2RAD,
          zoom: prev.zoom < 2.4 ? 3.2 : prev.zoom,
        }));
        setCameraSeq((s) => s + 1);
      }
      if (!rightOpen) setRightOpen(true);
    },
    [rightOpen]
  );

  const handleFlyToPreset = useCallback((preset: 'near' | 'south' | 'southClose' | 'far') => {
    setAutoSpin(false);
    if (preset === 'near') {
      setCameraTarget({ yaw: 0.0, pitch: 0.0, zoom: 1.05 });
    } else if (preset === 'south') {
      setCameraTarget({ yaw: 0.0, pitch: -Math.PI * 0.485, zoom: 1.65 });
    } else if (preset === 'southClose') {
      setCameraTarget({ yaw: 0.0, pitch: -Math.PI * 0.498, zoom: 5.4 });
    } else if (preset === 'far') {
      setCameraTarget({ yaw: Math.PI, pitch: -0.15, zoom: 1.05 });
    }
    setCameraSeq((s) => s + 1);
  }, []);

  const handleAdjustZoom = useCallback((delta: number) => {
    setCameraTarget((prev) => ({
      ...prev,
      zoom: Math.max(0.75, Math.min(18.0, prev.zoom * (delta > 0 ? 1.32 : 0.76))),
    }));
    setCameraSeq((s) => s + 1);
  }, []);

  const handleMeasureClick = useCallback(
    (lat: number, lon: number) => {
      if (nextMeasurePoint === 'A') {
        setPointA({ lat, lon });
        setNextMeasurePoint('B');
        showToast('A → B (1/2)');
      } else {
        setPointB({ lat, lon });
        setNextMeasurePoint('A');
        showToast('A → B (2/2)');
      }
      setActiveTab('profile');
      setRightOpen(true);
    },
    [nextMeasurePoint, showToast]
  );

  const handleAddToComparison = useCallback(
    (site?: ComparisonSiteInput) => {
      const target = site || { name: selected.name, lat: selected.lat, lon: selected.lon };
      setComparisonSites((prev) => {
        if (
          prev.some(
            (s) => Math.abs(s.lat - target.lat) < 0.01 && Math.abs(s.lon - target.lon) < 0.01
          )
        ) {
          return prev;
        }
        const next = prev.length >= 5 ? prev.slice(1) : [...prev];
        return [...next, target];
      });
      showToast(`+ ${target.name}`);
      setCurrentPage(2);
    },
    [selected.lat, selected.lon, selected.name, showToast]
  );

  const handleSendToFuel = useCallback((lat?: number, lon?: number, name?: string) => {
    if (typeof lat === 'number' && typeof lon === 'number') {
      setSelected({ lat, lon, name: name || 'Target', tag: 'FUEL TARGET' });
      setFuelLat(Number(lat.toFixed(4)));
      setFuelLon(Number(lon.toFixed(4)));
    } else {
      setFuelLat(Number(selected.lat.toFixed(4)));
      setFuelLon(Number(selected.lon.toFixed(4)));
    }
    setCurrentPage(3);
  }, [selected.lat, selected.lon]);

  const handleScaleUpdate = useCallback((text: string, widthPx: number) => {
    setScaleBar((prev) =>
      prev.text === text && prev.widthPx === widthPx ? prev : { text, widthPx }
    );
  }, []);

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-[#03060f] text-slate-100"
      data-page={currentPage}
    >
      {currentPage === 0 && (
        <CoverPage
          lang={lang}
          onChangeLang={setLang}
          t={t}
          onOpenAtlas={() => navigateToPage(1)}
          onNavigatePage={(p) => navigateToPage(p)}
        />
      )}

      {/* Persistent WebGL Moon Sphere & 2D HUD Canvas (mounted once user enters workspace) */}
      {hasEnteredApp && (
        <LunarGlobeCanvas
          active={currentPage === 1}
          cameraTarget={cameraTarget}
          cameraSeq={cameraSeq}
          spectrum={spectrum}
          sunAngleDeg={sunAngleDeg}
          autoSpin={autoSpin}
          showGrid={showGrid}
          showLabels={showLabels}
          measureMode={measureMode}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          selected={selected}
          pointA={pointA}
          pointB={pointB}
          cardinals={{ N: t('cardN'), S: t('cardS'), E: t('cardE'), W: t('cardW') }}
          onHoverCoords={setHoverCoords}
          onSelectCoords={(lat, lon, name, tag) => handleSelectCoordinate(lat, lon, name, tag, false)}
          onMeasureClick={handleMeasureClick}
          onScaleUpdate={handleScaleUpdate}
        />
      )}

      {/* Non-blocking Toast */}
      {toastMsg && (
        <div
          role="status"
          className="panel-surface fixed left-1/2 top-16 z-50 -translate-x-1/2 border-sky-400/50 px-4 py-2 text-xs font-semibold text-sky-100"
        >
          {toastMsg}
        </div>
      )}

      {/* Top Navigation Bar (3-Zone Clean Structure) */}
      {currentPage !== 0 && (
      <header className="panel-surface fixed inset-x-3.5 top-3 z-30 flex items-center justify-between gap-4 px-3.5 py-2">
        <div className="flex items-center gap-2.5 shrink-0">
          {currentPage === 1 && (
            <button
              type="button"
              onClick={() => setLeftOpen((o) => !o)}
              aria-label="Toggle spectrum & catalog panel"
              className="rounded-md border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-xs font-bold text-slate-200 hover:bg-slate-800"
            >
              ☰
            </button>
          )}
          <button
            type="button"
            onClick={() => navigateToPage(0)}
            title={lang === 'tr' ? 'Ana Kapağa Dön' : 'Return to Cover'}
            className="font-display text-sm font-extrabold tracking-wider text-white whitespace-nowrap shrink-0 hover:text-sky-300"
          >
            {t('brandTitle')}
          </button>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Main navigation">
          {([1, 2, 3, 4] as const).map((pNum) => (
            <button
              key={pNum}
              type="button"
              onClick={() => setCurrentPage(pNum)}
              className={`whitespace-nowrap shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                currentPage === pNum
                  ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                  : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {t(`navPage${pNum}`)}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="lang-select" className="sr-only">
            Language
          </label>
          <select
            id="lang-select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="rounded-lg border border-sky-400/35 bg-slate-950/90 px-2.5 py-1 text-[11px] font-bold text-sky-100 outline-none focus:border-sky-400"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          {currentPage === 1 && (
            <button
              type="button"
              onClick={() => setRightOpen((o) => !o)}
              className={`whitespace-nowrap shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                rightOpen
                  ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              {t('btnAnalysis')}
            </button>
          )}
        </div>
      </header>
      )}

      {/* Active Page Content */}
      {currentPage === 1 && (
        <AtlasPage
          lang={lang}
          t={t}
          spectrum={spectrum}
          onChangeSpectrum={setSpectrum}
          sunAngleDeg={sunAngleDeg}
          onChangeSunAngle={setSunAngleDeg}
          autoSpin={autoSpin}
          onToggleSpin={() => setAutoSpin((s) => !s)}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid((g) => !g)}
          showLabels={showLabels}
          onToggleLabels={() => setShowLabels((l) => !l)}
          measureMode={measureMode}
          onToggleMeasureMode={(force) => {
            const next = typeof force === 'boolean' ? force : !measureMode;
            setMeasureMode(next);
            if (next) {
              setNextMeasurePoint('A');
              showToast('A → B');
            }
          }}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          onToggleRightDrawer={() => setRightOpen((o) => !o)}
          selected={selected}
          hoverCoords={hoverCoords}
          pointA={pointA}
          pointB={pointB}
          scaleBar={scaleBar}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onFlyToPreset={handleFlyToPreset}
          onAdjustZoom={handleAdjustZoom}
          onSelectCoordinate={handleSelectCoordinate}
          onAddToComparison={() => handleAddToComparison()}
          onSendToFuel={() => handleSendToFuel()}
          onNotify={showToast}
        />
      )}

      {currentPage === 2 && (
        <ComparisonPage
          t={t}
          sunAngleDeg={sunAngleDeg}
          sites={comparisonSites}
          onAddSite={handleAddToComparison}
          onRemoveSite={(idx) =>
            setComparisonSites((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
          }
          onResetSites={() => setComparisonSites(DEFAULT_COMPARISON_SITES)}
          onViewIn3D={(lat, lon, name) => {
            handleSelectCoordinate(lat, lon, name, '3D', true);
            setCurrentPage(1);
          }}
          onSendToFuel={(lat, lon, name) => handleSendToFuel(lat, lon, name)}
          onNotify={showToast}
        />
      )}

      {currentPage === 3 && (
        <FuelSimulatorPage
          t={t}
          sunAngleDeg={sunAngleDeg}
          selectedSite={selected}
          atlasPointA={pointA}
          atlasPointB={pointB}
          fuelLat={fuelLat}
          fuelLon={fuelLon}
          onChangeFuelCoords={(lat, lon) => {
            setFuelLat(lat);
            setFuelLon(lon);
          }}
          onSyncFromAtlas={() => {
            setFuelLat(Number(selected.lat.toFixed(4)));
            setFuelLon(Number(selected.lon.toFixed(4)));
          }}
        />
      )}

      {currentPage === 4 && <TeamReferencesPage lang={lang} t={t} />}
    </div>
  );
}

export default App;
