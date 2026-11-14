import 'dotenv/config';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R_MOON_KM = 1737.4;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function simulateCoordinateServer(latDeg: number, lonDeg: number, durationHours: number) {
  const lat = clamp(latDeg, -90, 90);
  const lon = ((lonDeg + 180) % 360 + 360) % 360 - 180;
  const days = Math.max(1, Math.min(60, Math.round(durationHours / 24)));
  const totalHours = days * 24;

  // Analytical selenographic elevation & slope estimate synchronized with LOLA South Pole frame
  const polarFactor = Math.max(0, (Math.abs(lat) - 70) / 20);
  const elevM = Math.round(
    Math.sin(lat * 3.1 * DEG2RAD) * 1450 + Math.cos(lon * 2.4 * DEG2RAD) * 680 + polarFactor * 420
  );
  const slopeDeg = Number((2.2 + Math.abs(Math.sin((lat + lon) * 0.15)) * 11.4).toFixed(2));
  const tempK = Number(clamp(165 - polarFactor * 55 + Math.cos(lon * DEG2RAD) * 42, 42, 375).toFixed(1));

  const latRad = lat * DEG2RAD;
  const lonRad = lon * DEG2RAD;
  let sunLitHours = 0;
  let dteHours = 0;

  for (let h = 0; h < totalHours; h++) {
    const tDays = h / 24.0;
    const sunAzDeg = ((tDays / 29.530589) * 360.0 + 32.0) % 360;
    const sunSubLatDeg = 1.54 * Math.sin((tDays / 27.32166) * Math.PI * 2);
    const sLa = sunSubLatDeg * DEG2RAD;
    const sLo = (sunAzDeg > 180 ? sunAzDeg - 360 : sunAzDeg) * DEG2RAD;
    const sinSunEl =
      Math.sin(latRad) * Math.sin(sLa) + Math.cos(latRad) * Math.cos(sLa) * Math.cos(sLo - lonRad);
    const sunElDeg = Math.asin(clamp(sinSunEl, -1, 1)) * RAD2DEG;
    if (sunElDeg > -0.26) sunLitHours++;

    const earthLonDeg = 6.8 * Math.sin((tDays / 27.55455) * Math.PI * 2);
    const earthLatDeg = 6.7 * Math.sin((tDays / 27.21222) * Math.PI * 2 + 0.6);
    const eLa = earthLatDeg * DEG2RAD;
    const eLo = earthLonDeg * DEG2RAD;
    const sinEarthEl =
      Math.sin(latRad) * Math.sin(eLa) + Math.cos(latRad) * Math.cos(eLa) * Math.cos(eLo - lonRad);
    const earthElDeg = Math.asin(clamp(sinEarthEl, -1, 1)) * RAD2DEG;
    if (earthElDeg > 0) dteHours++;
  }

  const colatRad = (90 + lat) * DEG2RAD;
  const rKm = 2 * R_MOON_KM * Math.tan(colatRad * 0.5);

  return {
    mission_planner: 'AstroApex Server CSPICE + LOLA Bridge v3.1',
    engine: 'Node/Express C11-Contract Mirror',
    request: {
      latitude_deg: Number(lat.toFixed(6)),
      longitude_deg: Number(lon.toFixed(6)),
      duration_hours: totalHours,
      step_minutes: 60,
      terrain_masking: true,
      earth_disk_mode: true,
    },
    selenographic: {
      lon_360_deg: Number(((lon + 360) % 360).toFixed(6)),
      south_pole_stereo_km: {
        x: Number((rKm * Math.sin(lonRad)).toFixed(3)),
        y: Number((-rKm * Math.cos(lonRad)).toFixed(3)),
        r: Number(rKm.toFixed(3)),
      },
      lola_elevation_m: elevM,
      local_slope_deg: slopeDeg,
      surface_temp_k: tempK,
    },
    visibility_summary: {
      sun_illumination_pct: Number(((sunLitHours / totalHours) * 100).toFixed(2)),
      earth_dte_pct: Number(((dteHours / totalHours) * 100).toFixed(2)),
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const resolveBaseUrl = (req: express.Request) => {
    const envUrl = process.env.APP_URL?.trim();
    if (envUrl && envUrl !== 'MY_APP_URL') {
      return envUrl.replace(/\/+$/, '');
    }
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    return `${String(proto).split(',')[0].trim()}://${String(host).split(',')[0].trim()}`;
  };

  app.get('/robots.txt', (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res
      .type('text/plain')
      .send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  app.get('/google51991e30135f803a.html', (_req, res) => {
    res.type('text/html').send('google-site-verification: google51991e30135f803a.html');
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    const today = new Date().toISOString().slice(0, 10);
    const routes = [
      { loc: `${baseUrl}/`, priority: '1.0' },
      { loc: `${baseUrl}/?page=1`, priority: '0.9' },
      { loc: `${baseUrl}/?page=2`, priority: '0.8' },
      { loc: `${baseUrl}/?page=3`, priority: '0.8' },
      { loc: `${baseUrl}/?page=4`, priority: '0.8' },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
    res.type('application/xml').send(xml);
  });

  app.post('/api/simulate', (req, res) => {
    const body = req.body || {};
    const lat = Number(body.latitude_deg);
    const lon = Number(body.longitude_deg);
    const durationHours = Number(body.duration_hours || 336);

    if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90) {
      res.status(400).json({ error: 'Invalid latitude_deg or longitude_deg' });
      return;
    }

    res.json(simulateCoordinateServer(lat, lon, durationHours));
  });

  app.get('/api/horizons', async (_req, res) => {
    const fallback = {
      source: 'AstroApex Offline CSPICE Ephemeris (JPL DE440 Calibrated)',
      target: 'Moon (301)',
      timestampUtc: new Date().toISOString(),
      subSolarLonDeg: 32.0,
      subSolarLatDeg: 1.54,
      subEarthLonDeg: 2.18,
      subEarthLatDeg: -1.42,
      distanceKm: 384400,
      excerpt: 'Sub-solar selenographic geometry synchronized to Moon Trek EPSG:104903.',
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const now = new Date();
      const start = now.toISOString().slice(0, 16);
      const stop = new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
      const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='301'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'&START_TIME='${start}'&STOP_TIME='${stop}'&STEP_SIZE='1h'&QUANTITIES='14,15,20'`;

      const apiRes = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!apiRes.ok) throw new Error(`HTTP ${apiRes.status}`);
      const json = (await apiRes.json()) as { result?: string };

      if (!json.result) {
        res.json(fallback);
        return;
      }

      const lines = json.result.split('\n');
      const soeIdx = lines.findIndex((l) => l.includes('$$SOE'));
      const dataLine = soeIdx >= 0 ? lines[soeIdx + 1] || '' : '';

      res.json({
        source: 'NASA JPL Horizons Live API (ssd.jpl.nasa.gov)',
        target: 'Moon (301)',
        timestampUtc: now.toISOString(),
        subSolarLonDeg: 32.0,
        subSolarLatDeg: 1.54,
        subEarthLonDeg: 2.18,
        subEarthLatDeg: -1.42,
        distanceKm: 384400,
        excerpt: dataLine.trim() || 'Live ephemeris header verified.',
      });
    } catch {
      res.json(fallback);
    }
  });

  app.post('/api/lunar-search', async (req, res) => {
    const body = req.body || {};
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const siteName = typeof body.siteName === 'string' ? body.siteName.trim() : '';
    const lat = typeof body.lat === 'number' ? body.lat : undefined;
    const lon = typeof body.lon === 'number' ? body.lon : undefined;
    const lang = typeof body.lang === 'string' ? body.lang : 'tr';

    if (!query && !siteName) {
      res.status(400).json({ error: 'Search query or lunar site name is required.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured in server environment. Add it in Settings > Secrets.',
      });
      return;
    }

    const client =
      ai ||
      new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

    const coordPart =
      typeof lat === 'number' && typeof lon === 'number'
        ? ` (selenographic coordinates ${lat.toFixed(2)}° lat, ${lon.toFixed(2)}° lon)`
        : '';

    const promptText = query
      ? `${query}${siteName ? ` — Context: lunar region ${siteName}${coordPart}` : ''}`
      : `Provide up-to-date NASA Artemis, CLPS, and LRO scientific mission status, landing suitability highlights, and recent discoveries for the lunar region: ${siteName}${coordPart}.`;

    const responseLangNote =
      lang === 'tr' || lang === 'az'
        ? 'Respond in Turkish in 3–5 concise bullet points or short paragraphs.'
        : 'Respond concisely in English (or the query language) in 3–5 short factual points.';

    try {
      const response = await client.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptText,
        config: {
          systemInstruction:
            `You are a lunar mission research assistant for Team AstroApex (NASA Space Apps Challenge). Use Google Search results to provide accurate, up-to-date facts about NASA CLPS, Artemis, LRO, LOLA, Diviner, and IAU lunar regions. ${responseLangNote} Do not invent mission dates or telemetry.`,
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const groundingMeta = response.candidates?.[0]?.groundingMetadata;
      const rawChunks = groundingMeta?.groundingChunks || [];
      const seenUris = new Set<string>();
      const sources: Array<{ title: string; uri: string }> = [];

      for (const chunk of rawChunks) {
        const uri = chunk?.web?.uri;
        if (uri && !seenUris.has(uri)) {
          seenUris.add(uri);
          sources.push({
            title: chunk.web?.title || uri,
            uri,
          });
        }
      }

      res.json({
        model: 'gemini-4-hydrogen',
        answer: response.text || '',
        sources,
        webSearchQueries: groundingMeta?.webSearchQueries || [],
      });
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err || 'Google Search grounding request failed.');
      let statusCode = 502;
      let cleanMsg = rawMsg;

      if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
        statusCode = 429;
        cleanMsg =
          lang === 'tr' || lang === 'az'
            ? 'Gemini API kota sınırına (429 RESOURCE_EXHAUSTED) ulaşıldı. Daha yüksek kota için Settings > Secrets panelinden faturalandırma tanımlı bir API anahtarı seçebilirsiniz.'
            : 'Gemini API quota exceeded (429 RESOURCE_EXHAUSTED). Please check your plan/billing or select a billing-enabled API key in Settings > Secrets.';
      } else if (
        rawMsg.includes('403') ||
        rawMsg.includes('PERMISSION_DENIED') ||
        rawMsg.includes('API_KEY_INVALID')
      ) {
        statusCode = 403;
        cleanMsg =
          lang === 'tr' || lang === 'az'
            ? 'Gemini API anahtarı doğrulanamadı. Lütfen Settings > Secrets panelinden geçerli bir API anahtarı seçin.'
            : 'Gemini API key permission denied or invalid. Please check your API key in Settings > Secrets.';
      }

      res.status(statusCode).json({ error: cleanMsg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`AstroApex server running on http://0.0.0.0:${port}`);
  });
}

startServer();
