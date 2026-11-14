import React from 'react';
import { ArrowRight, Compass, Flame, Layers, Users } from 'lucide-react';
import nasaLunarCover from '../assets/images/nasa_lunar_cover_1794677657576.jpg';
import { LANGUAGES } from '../lib/i18n';
import { ASTROAPEX_TEAM } from '../lib/landmarks';

interface CoverPageProps {
  lang: string;
  onChangeLang: (lang: string) => void;
  t: (key: string) => string;
  onOpenAtlas: () => void;
  onNavigatePage: (page: 1 | 2 | 3 | 4) => void;
}

export const CoverPage: React.FC<CoverPageProps> = ({
  lang,
  onChangeLang,
  t,
  onOpenAtlas,
  onNavigatePage,
}) => {
  const isTr = lang === 'tr' || lang === 'az';

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-[#03060f] text-slate-100"
      data-testid="cover-page"
    >
      {/* Institutional Portal Header (MEB / School Portal Style) */}
      <header className="border-b border-slate-800/90 bg-[#060b18]">
        {/* Top institutional identity stripe */}
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 border-b border-slate-800/70 px-6 py-2 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-2 font-medium text-slate-300">
            <span className="font-semibold text-amber-300">Sınav İncek Fen Lisesi</span>
            <span aria-hidden="true">·</span>
            <span>Sınav Koleji</span>
            <span aria-hidden="true">·</span>
            <span>NASA Space Apps Challenge</span>
          </div>
          <div className="font-mono-tab text-[11px] text-slate-400">
            CLPS Lunar Mission Browser · LRO LOLA DEM / Diviner / JPL Horizons
          </div>
        </div>

        {/* Main 3-zone portal navbar */}
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-display text-base font-extrabold tracking-wider text-white whitespace-nowrap">
              {t('brandTitle')}
            </span>
            <span className="hidden text-xs text-slate-500 sm:inline" aria-hidden="true">
              /
            </span>
            <span className="hidden text-xs font-medium text-slate-300 sm:inline whitespace-nowrap">
              {isTr ? 'Ay Görev Portalı' : 'Lunar Mission Portal'}
            </span>
          </div>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Portal sections">
            <button
              type="button"
              onClick={onOpenAtlas}
              className="whitespace-nowrap shrink-0 text-xs font-semibold text-sky-300 underline-offset-4 hover:text-white hover:underline"
            >
              {isTr ? 'Ay Atlası' : t('navPage1')}
            </button>
            <button
              type="button"
              onClick={() => onNavigatePage(2)}
              className="whitespace-nowrap shrink-0 text-xs font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
            >
              {t('navPage2')}
            </button>
            <button
              type="button"
              onClick={() => onNavigatePage(3)}
              className="whitespace-nowrap shrink-0 text-xs font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
            >
              {t('navPage3')}
            </button>
            <button
              type="button"
              onClick={() => onNavigatePage(4)}
              className="whitespace-nowrap shrink-0 text-xs font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
            >
              {t('navPage4')}
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <select
              value={lang}
              onChange={(e) => onChangeLang(e.target.value)}
              aria-label="Language"
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 outline-none focus:border-sky-400"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onOpenAtlas}
              className="whitespace-nowrap shrink-0 rounded-lg border border-sky-400/60 bg-sky-500/20 px-4 py-1.5 text-xs font-bold text-sky-100 transition-colors hover:bg-sky-500/30"
            >
              {isTr ? 'AY ATLASI' : 'LUNAR ATLAS'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Cover Content */}
      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col justify-center gap-6 px-6 py-8">
        {/* 2-Column Hero Cover */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.05fr_1.15fr]">
          {/* Left Hero Column */}
          <div className="flex flex-col justify-between gap-6 rounded-xl border border-slate-800/90 bg-[#080e1d] p-7">
            <div>
              <div className="flex flex-wrap items-center gap-2 font-mono-tab text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                <span>NASA SPACE APPS CHALLENGE</span>
                <span aria-hidden="true">·</span>
                <span>ARTEMİS GÜNEY KUTBU</span>
              </div>

              <h1
                className="mt-3 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl"
                style={{ textWrap: 'balance' }}
              >
                {isTr ? 'AY ATLASI' : 'LUNAR ATLAS'}
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
                {isTr
                  ? 'Sınav İncek Fen Lisesi öğrencileri olarak yüksek bilimsel bakış açımız ve Sınav Koleji’nin desteğiyle geliştirdiğimiz; gerçek NASA LRO LOLA DEM, Diviner ve JPL Horizons verilerini C11 + Lua + hafif WebGL2 motoruyla işleyen Ay görevi planlama platformu.'
                  : 'Built by Sınav İncek Fen Lisesi & Sınav Koleji students for the NASA Space Apps Challenge — processing real NASA LRO LOLA DEM, Diviner, and JPL Horizons datasets through a C11 + Lua + lightweight WebGL2 mission browser.'}
              </p>

              {/* Primary Dominant CTA */}
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onOpenAtlas}
                  data-testid="cover-open-atlas-btn"
                  className="inline-flex items-center gap-3 rounded-lg border border-sky-400/70 bg-sky-500/25 px-7 py-3.5 font-display text-base font-extrabold tracking-wide text-white transition-colors hover:bg-sky-500/40 focus-visible:outline-2 focus-visible:outline-sky-400"
                >
                  <span>{isTr ? 'AY ATLASI’NI AÇ' : 'OPEN LUNAR ATLAS'}</span>
                  <ArrowRight className="h-5 w-5 text-sky-300" />
                </button>
              </div>
            </div>

            {/* Clean School & Team Names Row (Names Only) */}
            <div className="border-t border-slate-800 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span>{isTr ? 'AstroApex Ekibi' : 'Team AstroApex'}</span>
                <span className="text-amber-300">Sınav İncek Fen Lisesi · Sınav Koleji</span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm font-semibold text-slate-100">
                {ASTROAPEX_TEAM.map((member, idx) => (
                  <React.Fragment key={member.name}>
                    <span>{member.name}</span>
                    {idx < ASTROAPEX_TEAM.length - 1 && (
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Right NASA Lunar Photography Cover */}
          <button
            type="button"
            onClick={onOpenAtlas}
            aria-label={isTr ? 'Ay Atlası uygulamasını aç' : 'Open Lunar Atlas'}
            className="group relative flex min-h-[340px] flex-col overflow-hidden rounded-xl border border-slate-800/90 bg-[#050914] text-left focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <img
              src={nasaLunarCover}
              alt="NASA Artemis Lunar South Pole and Shackleton Crater Horizon with Earthrise"
              className="h-full w-full flex-1 object-cover transition-transform duration-300 group-hover:scale-[1.015]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#03060f] via-[#03060f]/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6">
              <div>
                <div className="font-mono-tab text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                  89.90° S · Shackleton Krateri & Güney Kutbu
                </div>
                <div className="mt-1 font-display text-xl font-bold text-white">
                  {isTr ? '3B İnteraktif Ay Atlası’na Giriş' : 'Enter 3D Interactive Lunar Atlas'}
                </div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-sky-400/50 bg-[#060b18]/90 px-4 py-2 text-xs font-bold text-sky-100 group-hover:bg-sky-500/25">
                <span>{isTr ? 'AY ATLASI' : 'LUNAR ATLAS'}</span>
                <ArrowRight className="h-4 w-4 text-sky-300" />
              </span>
            </div>
          </button>
        </div>

        {/* Bottom 4 Portal Module Cards (MEB Portal Module Strip) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={onOpenAtlas}
            className="flex flex-col justify-between gap-3 rounded-xl border border-sky-400/40 bg-[#081124] p-4 text-left transition-colors hover:border-sky-400/70 hover:bg-[#0b1730]"
          >
            <div className="flex items-center justify-between">
              <Compass className="h-5 w-5 text-sky-400" />
              <span className="font-mono-tab text-[11px] text-sky-300">01</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white">
                {isTr ? 'AY ATLASI (3B)' : '3D LUNAR ATLAS'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {isTr
                  ? '6 spektrum, 90 IAU yer şekli ve 360° LOLA ufuk maskeleme.'
                  : '6 spectra, 90 IAU landmarks, and 360° LOLA horizon masking.'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigatePage(2)}
            className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-[#080e1d] p-4 text-left transition-colors hover:border-slate-600 hover:bg-[#0c152b]"
          >
            <div className="flex items-center justify-between">
              <Layers className="h-5 w-5 text-emerald-400" />
              <span className="font-mono-tab text-[11px] text-slate-400">02</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white">{t('navPage2')}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {isTr
                  ? 'Çoklu iniş bölgesi karşılaştırma ve su buzu / eğim analizi.'
                  : 'Multi-site suitability matrix and water-ice / slope scoring.'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigatePage(3)}
            className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-[#080e1d] p-4 text-left transition-colors hover:border-slate-600 hover:bg-[#0c152b]"
          >
            <div className="flex items-center justify-between">
              <Flame className="h-5 w-5 text-amber-400" />
              <span className="font-mono-tab text-[11px] text-slate-400">03</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white">{t('navPage3')}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {isTr
                  ? 'Tsiolkovsky roket yakıtı, benzin eşdeğeri (L) ve rover rotası.'
                  : 'Tsiolkovsky propellant, liter equivalent, and rover traverse.'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigatePage(4)}
            className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-[#080e1d] p-4 text-left transition-colors hover:border-slate-600 hover:bg-[#0c152b]"
          >
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 text-violet-400" />
              <span className="font-mono-tab text-[11px] text-slate-400">04</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white">{t('navPage4')}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {isTr
                  ? 'AstroApex ekibi, C11 + Lua mimarisi ve 8 resmi NASA/CSA/ESA kaynağı.'
                  : 'Team AstroApex, C11 + Lua architecture, and 8 NASA/CSA/ESA sources.'}
              </p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};
