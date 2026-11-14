import React, { useState } from 'react';
import { ExternalLink, Globe, Search } from 'lucide-react';

interface SearchSource {
  title: string;
  uri: string;
}

interface SearchResult {
  model: string;
  answer: string;
  sources: SearchSource[];
  webSearchQueries: string[];
}

interface LunarSearchPanelProps {
  lang: string;
  compact?: boolean;
  siteContext?: { name: string; lat: number; lon: number };
}

export const LunarSearchPanel: React.FC<LunarSearchPanelProps> = ({
  lang,
  compact = false,
  siteContext,
}) => {
  const isTr = lang === 'tr' || lang === 'az';
  const [queryInput, setQueryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);

  const runSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? queryInput).trim();
    if (!q && !siteContext?.name) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/lunar-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          siteName: siteContext?.name,
          lat: siteContext?.lat,
          lon: siteContext?.lon,
          lang,
        }),
      });
      const data = (await res.json()) as Partial<SearchResult> & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setResult({
        model: data.model || 'gemini-4-hydrogen',
        answer: data.answer || '',
        sources: Array.isArray(data.sources) ? data.sources : [],
        webSearchQueries: Array.isArray(data.webSearchQueries) ? data.webSearchQueries : [],
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isTr
            ? 'Google Search sorgusu tamamlanamadı.'
            : 'Google Search grounding request failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const quickTopics = isTr
    ? [
        'NASA Artemis III Güney Kutbu iniş adayları güncel durum',
        'NASA CLPS Ay görevleri 2025 2026 güncel gelişmeler',
        'LRO LOLA ve Diviner Shackleton Krateri su buzu bulguları',
      ]
    : [
        'NASA Artemis III South Pole landing sites latest update',
        'NASA CLPS lunar lander missions 2025 2026 updates',
        'LRO LOLA and Diviner Shackleton Crater water ice findings',
      ];

  return (
    <div className={compact ? 'panel-inset flex flex-col gap-2 p-2.5' : 'flex flex-col gap-3'}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-sky-300">
          <Globe className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
          <span>
            {isTr ? 'Güncel NASA Web Araştırması' : 'Live NASA Web Grounding'}
          </span>
        </div>
        <span className="font-mono-tab text-[9.5px] text-slate-400">Google Search</span>
      </div>

      {compact ? (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() =>
              runSearch(
                siteContext
                  ? isTr
                    ? `${siteContext.name} için güncel NASA Artemis / CLPS / LRO bulguları`
                    : `Latest NASA Artemis / CLPS / LRO updates for ${siteContext.name}`
                  : undefined
              )
            }
            disabled={loading}
            data-testid="atlas-search-btn"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-sky-400/50 bg-sky-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100 transition-colors hover:bg-sky-500/30 disabled:opacity-60"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {loading
                ? isTr
                  ? 'Aranıyor...'
                  : 'Searching...'
                : isTr
                  ? `${siteContext?.name.split('(')[0].trim() || 'Bölge'} Güncel Bilgisini Ara`
                  : `Search Latest Info: ${siteContext?.name.split('(')[0].trim() || 'Site'}`}
            </span>
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-slate-400">
            {isTr
              ? 'NASA Artemis, CLPS iniş görevleri ve LRO bilimsel bulguları hakkında Google Search destekli güncel bilgileri ve kaynak bağlantılarını getirir.'
              : 'Retrieves up-to-date NASA Artemis, CLPS mission status, and LRO research backed by Google Search citations.'}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder={
                isTr
                  ? 'Örn: Artemis III Shackleton Rim güncel durum...'
                  : 'e.g., Artemis III Shackleton Rim latest updates...'
              }
              aria-label={isTr ? 'NASA Web Arama Sorgusu' : 'NASA Web Search Query'}
              data-testid="team-search-input"
              className="w-full rounded-lg border border-slate-700/80 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              disabled={loading}
              data-testid="team-search-submit"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-400/50 bg-sky-500/20 px-3.5 py-2 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-500/30 disabled:opacity-60"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{loading ? '...' : isTr ? 'Ara' : 'Search'}</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {quickTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                disabled={loading}
                onClick={() => {
                  setQueryInput(topic);
                  runSearch(topic);
                }}
                className="rounded-md border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-left text-[11px] text-slate-300 transition-colors hover:border-sky-400/40 hover:text-white disabled:opacity-60"
              >
                {topic}
              </button>
            ))}
          </div>
        </>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-[11px] text-rose-200"
        >
          {errorMsg}
        </div>
      )}

      {result && (
        <div
          className="panel-inset space-y-2.5 p-3 text-xs text-slate-200"
          data-testid={compact ? 'atlas-search-result' : 'team-search-result'}
        >
          <div className="whitespace-pre-wrap leading-relaxed text-slate-200">{result.answer}</div>

          {result.sources.length > 0 && (
            <div className="border-t border-slate-800 pt-2">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isTr ? 'Doğrulanmış Web Kaynakları' : 'Grounded Web Sources'}
              </div>
              <div className="flex flex-col gap-1">
                {result.sources.slice(0, compact ? 4 : 6).map((src) => (
                  <a
                    key={src.uri}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded border border-slate-800/80 bg-slate-950/60 px-2.5 py-1.5 text-[11px] text-sky-300 transition-colors hover:border-sky-400/50 hover:text-sky-200"
                  >
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
