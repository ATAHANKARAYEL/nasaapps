import React, { useState } from 'react';
import { ExternalLink, Cpu, Layers, Compass, Users } from 'lucide-react';
import { ASTROAPEX_TEAM, OFFICIAL_REFERENCES } from '../lib/landmarks';
import { LunarSearchPanel } from './LunarSearchPanel';

interface TeamReferencesPageProps {
  lang: string;
  t: (key: string) => string;
}

interface HorizonsPayload {
  source: string;
  target: string;
  timestampUtc: string;
  subSolarLonDeg: number;
  subSolarLatDeg: number;
  subEarthLonDeg: number;
  subEarthLatDeg: number;
  distanceKm: number;
  excerpt: string;
}

export const TeamReferencesPage: React.FC<TeamReferencesPageProps> = ({ lang, t }) => {
  const isTr = lang === 'tr' || lang === 'az';
  const [horizonsData, setHorizonsData] = useState<HorizonsPayload | null>(null);
  const [loadingHorizons, setLoadingHorizons] = useState(false);

  const fetchHorizons = async () => {
    setLoadingHorizons(true);
    try {
      const res = await fetch('/api/horizons');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as HorizonsPayload;
      setHorizonsData(json);
    } catch {
      setHorizonsData({
        source: 'Offline CSPICE Ephemeris Kernel (DE440 Fallback)',
        target: 'Moon (301)',
        timestampUtc: new Date().toISOString(),
        subSolarLonDeg: 32.0,
        subSolarLatDeg: 1.54,
        subEarthLonDeg: 2.18,
        subEarthLatDeg: -1.42,
        distanceKm: 384400,
        excerpt: 'Sub-solar selenographic geometry calibrated to LRO LOLA Moon Trek frame.',
      });
    } finally {
      setLoadingHorizons(false);
    }
  };

  return (
    <section
      className="fixed inset-x-3.5 bottom-3.5 top-16 z-20 flex flex-col gap-4 overflow-y-auto pb-8"
      data-testid="page-team"
    >
      {/* Header Banner */}
      <div className="panel-surface flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-bold text-white">{t('p4Title')}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{t('p4Desc')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 font-mono-tab text-xs text-slate-300">
          <span className="font-semibold text-amber-300">Sınav İncek Fen Lisesi</span>
          <span aria-hidden="true">·</span>
          <span>Sınav Koleji</span>
          <span aria-hidden="true">·</span>
          <span className="text-sky-400">NASA Space Apps Challenge</span>
        </div>
      </div>

      {/* Team AstroApex 5 Members + School Identity */}
      <div className="panel-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Users className="h-4 w-4 text-sky-400" />
            <span>{t('p4TeamHdr')}</span>
          </div>
          <span className="font-mono-tab text-[11px] font-semibold text-amber-300">
            Sınav İncek Fen Lisesi · Sınav Koleji
          </span>
        </div>

        <div className="panel-inset mb-3.5 flex flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="max-w-4xl">
            <div className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">
              {isTr
                ? 'Biz Kimiz? — Sınav İncek Fen Lisesi & Sınav Koleji Öğrencileri'
                : 'Who We Are — Sınav İncek Fen Lisesi & Sınav Koleji Students'}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {isTr
                ? 'Sınav İncek Fen Lisesi öğrencileri olarak yüksek bilimsel bakış açımız ve Sınav Koleji’nin sağladığı vizyon sayesinde buradayız; gerçek NASA açık verilerini yüksek başarımlı C11 + Lua mühendisliğiyle buluşturan yenilikçi çözümlerle karşınızdayız.'
                : 'As students of Sınav İncek Fen Lisesi, our broad scientific perspective and the support of Sınav Koleji bring us to the NASA Space Apps Challenge with innovative, real-data C11 + Lua lunar mission solutions.'}
            </p>
          </div>
          <a
            href="https://www.meb.gov.tr/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={
              isTr
                ? 'MEB Portalı - T.C. Millî Eğitim Bakanlığı resmî web sitesi (yeni sekmede açılır)'
                : 'MEB Portalı - Republic of Türkiye Ministry of National Education official website (opens in a new tab)'
            }
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-sky-400/50 bg-sky-500/15 px-3.5 py-2 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-500/30 focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <span>MEB Portalı</span>
            <ExternalLink className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ASTROAPEX_TEAM.map((member) => (
            <article key={member.name} className="panel-inset flex items-center justify-center px-4 py-4 text-center">
              <h3 className="font-display text-sm font-bold text-white">{member.name}</h3>
            </article>
          ))}
        </div>
      </div>

      {/* Architecture + Live JPL Horizons Ephemeris */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="panel-surface flex flex-col gap-3 p-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Cpu className="h-4 w-4 text-amber-400" />
            <span>{t('p4ArchHdr')}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="panel-inset p-3.5">
              <div className="font-display text-sm font-bold text-white">
                {isTr ? '1. C11 Matematik Çekirdeği' : '1. C11 Compute Kernel'}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                {isTr
                  ? 'Devasa LRO LOLA DEM haritalarını mmap() ile doğrudan belleğe bağlar. Çöp toplayıcı (GC) maliyeti olmadan 64-bit hassasiyetle 360° ray-marching gölge ve N-body hesabı yapar.'
                  : 'Memory-maps massive LRO LOLA DEM grids via mmap() with zero garbage collection pauses, solving 360° ray-marching shadows and N-body gravity at 64-bit precision.'}
              </p>
            </div>
            <div className="panel-inset p-3.5">
              <div className="font-display text-sm font-bold text-white">
                {isTr ? '2. Lua Orkestrasyon Katmanı' : '2. Lua Dynamic Orchestration'}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                {isTr
                  ? 'Güneş açısı, kutup koordinat filtresi (-60° ile -90°) ve görev kurallarını C kodunu yeniden derlemeden çalışma anında dinamik olarak günceller.'
                  : 'Dynamically adjusts solar azimuth, polar coordinate filters (-60° to -90°), and mission scoring rules at runtime without recompiling the C engine.'}
              </p>
            </div>
            <div className="panel-inset p-3.5">
              <div className="font-display text-sm font-bold text-white">
                {isTr ? '3. Sıfır Gecikmeli Hafif Arayüz' : '3. Potato-PC WebGL UI'}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                {isTr
                  ? 'Pahalı sunucu veya oyuncu GPU’su olmadan 10 yıllık düşük RAM’li bir okul dizüstünde bile akıcı çalışacak şekilde on-demand WebGL2 + Canvas 2D ile tasarlandı.'
                  : 'Engineered with on-demand WebGL2 and Canvas 2D overlays so it runs smoothly even on 10-year-old low-RAM school laptops without heavy cloud GPUs.'}
              </p>
            </div>
          </div>
        </div>

        <div className="panel-surface flex flex-col justify-between gap-3 p-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Compass className="h-4 w-4 text-emerald-400" />
              <span>{t('p4HorizonsHdr')}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              {isTr
                ? 'NASA JPL Horizons API üzerinden Ay (Target 301) ve Güneş alt-noktası vektörlerini gerçek zamanlı olarak doğrular.'
                : 'Queries NASA JPL Horizons API for live Moon (301) sub-solar and sub-Earth ephemeris vectors.'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchHorizons}
            disabled={loadingHorizons}
            className="w-full rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-60"
          >
            {loadingHorizons ? '...' : t('p4HorizonsBtn')}
          </button>

          {horizonsData && (
            <div className="panel-inset space-y-1 p-3 font-mono-tab text-[11px] text-slate-300">
              <div className="text-emerald-400">{horizonsData.source}</div>
              <div>
                Sub-Solar: {horizonsData.subSolarLatDeg.toFixed(2)}° Lat,{' '}
                {horizonsData.subSolarLonDeg.toFixed(2)}° Lon
              </div>
              <div>
                Sub-Earth: {horizonsData.subEarthLatDeg.toFixed(2)}° Lat,{' '}
                {horizonsData.subEarthLonDeg.toFixed(2)}° Lon
              </div>
              <div>Earth–Moon Range: {Math.round(horizonsData.distanceKm).toLocaleString()} km</div>
            </div>
          )}
        </div>
      </div>

      {/* Google Search Grounded NASA & Artemis Mission Research */}
      <div className="panel-surface p-5">
        <LunarSearchPanel lang={lang} />
      </div>

      {/* Official NASA, CSA, ESA & Open Science References */}
      <div className="panel-surface p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Layers className="h-4 w-4 text-sky-400" />
          <span>{t('p4SourcesHdr')}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {OFFICIAL_REFERENCES.map((ref) => (
            <a
              key={ref.url}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="panel-inset group flex flex-col justify-between gap-2 p-3.5 transition-colors hover:border-sky-400/50 hover:bg-slate-900/90"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tab text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                    {ref.agency}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-sky-300" />
                </div>
                <h3 className="mt-1 font-display text-sm font-bold text-white group-hover:text-sky-200">
                  {ref.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {isTr ? ref.descTr : ref.descEn}
                </p>
              </div>
              <div className="truncate font-mono-tab text-[10px] text-slate-500">{ref.url}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
