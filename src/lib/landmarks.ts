export type LandmarkCategory = 'POLE' | 'LANDING' | 'CRATER' | 'MARE';

export interface LunarLandmark {
  id: string;
  name: string;
  cat: LandmarkCategory;
  prio: 1 | 2 | 3;
  lat: number;
  lon: number;
  diam: number;
}

export const LANDMARKS: LunarLandmark[] = [
  // South Pole & Artemis III Candidate Regions
  { id: 'shackleton', name: 'Shackleton Krateri (Rim)', cat: 'POLE', prio: 1, lat: -89.90, lon: 0.00, diam: 21.0 },
  { id: 'shackleton_psr', name: 'Shackleton Tabanı (PSR Buz)', cat: 'POLE', prio: 2, lat: -89.65, lon: 115.00, diam: 14.0 },
  { id: 'connecting_ridge', name: 'Connecting Ridge (Artemis III)', cat: 'POLE', prio: 1, lat: -89.45, lon: -137.50, diam: 18.0 },
  { id: 'mons_mouton', name: 'Mons Mouton Platosu (VIPER)', cat: 'POLE', prio: 1, lat: -84.95, lon: 31.00, diam: 60.0 },
  { id: 'malapert_peak', name: 'Malapert Masifi (Zirve)', cat: 'POLE', prio: 1, lat: -86.00, lon: 0.00, diam: 35.0 },
  { id: 'malapert_crater', name: 'Malapert Krateri', cat: 'POLE', prio: 2, lat: -84.90, lon: 12.90, diam: 69.0 },
  { id: 'de_gerlache', name: 'De Gerlache Rimi', cat: 'POLE', prio: 1, lat: -88.50, lon: -88.30, diam: 32.4 },
  { id: 'cabeus', name: 'Cabeus Krateri (LCROSS)', cat: 'POLE', prio: 1, lat: -84.90, lon: -35.50, diam: 98.0 },
  { id: 'nobile', name: 'Nobile Rimi', cat: 'POLE', prio: 1, lat: -85.20, lon: 53.50, diam: 73.0 },
  { id: 'haworth', name: 'Haworth Krateri (PSR)', cat: 'POLE', prio: 2, lat: -87.45, lon: -5.17, diam: 51.4 },
  { id: 'shoemaker', name: 'Shoemaker Krateri (PSR)', cat: 'POLE', prio: 2, lat: -88.10, lon: 44.90, diam: 50.9 },
  { id: 'faustini', name: 'Faustini Krateri', cat: 'POLE', prio: 2, lat: -87.30, lon: 77.00, diam: 39.0 },
  { id: 'slater', name: 'Slater Krateri', cat: 'POLE', prio: 3, lat: -88.10, lon: 111.30, diam: 24.0 },
  { id: 'sverdrup', name: 'Sverdrup Krateri', cat: 'POLE', prio: 3, lat: -88.50, lon: -152.00, diam: 35.0 },
  { id: 'amundsen', name: 'Amundsen Krateri', cat: 'POLE', prio: 2, lat: -84.50, lon: 82.80, diam: 101.0 },
  { id: 'scott', name: 'Scott Krateri', cat: 'POLE', prio: 2, lat: -82.10, lon: 48.50, diam: 103.0 },
  { id: 'wiechert', name: 'Wiechert Krateri', cat: 'POLE', prio: 3, lat: -84.50, lon: 165.00, diam: 41.0 },
  { id: 'leibnitz_plat', name: 'Leibnitz Platosu (Montes)', cat: 'POLE', prio: 2, lat: -85.50, lon: 31.20, diam: 42.0 },
  { id: 'mons_epsilon', name: 'Mons Epsilon (Kutup Sırtı)', cat: 'POLE', prio: 3, lat: -88.80, lon: -124.00, diam: 15.0 },
  { id: 'koch_pole', name: 'Ideler L & H Bölgesi', cat: 'POLE', prio: 3, lat: -84.10, lon: 25.40, diam: 28.0 },

  // Historic & Modern Landing Sites
  { id: 'apollo11', name: 'Apollo 11 (Mare Tranquillitatis)', cat: 'LANDING', prio: 1, lat: 0.6741, lon: 23.4730, diam: 1.0 },
  { id: 'apollo12', name: 'Apollo 12 (Oceanus Procellarum)', cat: 'LANDING', prio: 2, lat: -3.0124, lon: -23.4216, diam: 1.0 },
  { id: 'apollo14', name: 'Apollo 14 (Fra Mauro)', cat: 'LANDING', prio: 2, lat: -3.6453, lon: -17.4714, diam: 1.0 },
  { id: 'apollo15', name: 'Apollo 15 (Hadley–Apennine)', cat: 'LANDING', prio: 2, lat: 26.1322, lon: 3.6339, diam: 1.0 },
  { id: 'apollo16', name: 'Apollo 16 (Descartes Yaylası)', cat: 'LANDING', prio: 2, lat: -8.9730, lon: 15.5002, diam: 1.0 },
  { id: 'apollo17', name: 'Apollo 17 (Taurus–Littrow)', cat: 'LANDING', prio: 2, lat: 20.1908, lon: 30.7717, diam: 1.0 },
  { id: 'chandrayaan3', name: 'Chandrayaan-3 (Shiv Shakti)', cat: 'LANDING', prio: 1, lat: -69.3730, lon: 32.3190, diam: 1.0 },
  { id: 'im1_odysseus', name: 'IM-1 Odysseus (Malapert A)', cat: 'LANDING', prio: 1, lat: -80.1300, lon: 1.4400, diam: 1.0 },
  { id: 'change3', name: "Chang'e 3 (Mare Imbrium)", cat: 'LANDING', prio: 3, lat: 44.1214, lon: -19.5116, diam: 1.0 },
  { id: 'change4', name: "Chang'e 4 (Von Kármán)", cat: 'LANDING', prio: 2, lat: -45.4570, lon: 177.5880, diam: 1.0 },
  { id: 'change5', name: "Chang'e 5 (Mons Rümker)", cat: 'LANDING', prio: 3, lat: 43.0576, lon: -51.9161, diam: 1.0 },
  { id: 'change6', name: "Chang'e 6 (Apollo Havzası)", cat: 'LANDING', prio: 2, lat: -41.6385, lon: -153.9852, diam: 1.0 },
  { id: 'slim', name: 'JAXA SLIM (Shioli Krateri)', cat: 'LANDING', prio: 3, lat: -13.3160, lon: 25.2510, diam: 1.0 },
  { id: 'luna24', name: 'Luna 24 (Mare Crisium)', cat: 'LANDING', prio: 3, lat: 12.7145, lon: 62.2129, diam: 1.0 },
  { id: 'surveyor7', name: 'Surveyor 7 (Tycho Kuzey Rimi)', cat: 'LANDING', prio: 3, lat: -40.8600, lon: -11.4700, diam: 1.0 },

  // Major Craters, Valleys & Mountain Ranges
  { id: 'tycho', name: 'Tycho Krateri', cat: 'CRATER', prio: 1, lat: -43.31, lon: -11.36, diam: 85.0 },
  { id: 'copernicus', name: 'Copernicus Krateri', cat: 'CRATER', prio: 1, lat: 9.62, lon: -20.08, diam: 93.0 },
  { id: 'aristarchus', name: 'Aristarchus Krateri', cat: 'CRATER', prio: 1, lat: 23.73, lon: -47.49, diam: 40.0 },
  { id: 'plato', name: 'Plato Krateri', cat: 'CRATER', prio: 1, lat: 51.62, lon: -9.38, diam: 101.0 },
  { id: 'clavius', name: 'Clavius Krateri', cat: 'CRATER', prio: 1, lat: -58.40, lon: -14.40, diam: 231.0 },
  { id: 'newton', name: 'Newton Krateri', cat: 'CRATER', prio: 2, lat: -76.70, lon: -16.90, diam: 78.0 },
  { id: 'moretus', name: 'Moretus Krateri', cat: 'CRATER', prio: 2, lat: -70.60, lon: -5.80, diam: 114.0 },
  { id: 'schrodinger', name: 'Schrödinger Havzası', cat: 'CRATER', prio: 1, lat: -75.00, lon: 132.40, diam: 312.0 },
  { id: 'zeeman', name: 'Zeeman Krateri', cat: 'CRATER', prio: 2, lat: -75.20, lon: -133.60, diam: 190.0 },
  { id: 'drygalski', name: 'Drygalski Krateri', cat: 'CRATER', prio: 2, lat: -79.30, lon: -84.90, diam: 149.0 },
  { id: 'kepler', name: 'Kepler Krateri', cat: 'CRATER', prio: 2, lat: 8.12, lon: -38.01, diam: 32.0 },
  { id: 'grimaldi', name: 'Grimaldi Krateri', cat: 'CRATER', prio: 2, lat: -5.20, lon: -68.60, diam: 174.0 },
  { id: 'ptolemaeus', name: 'Ptolemaeus Krateri', cat: 'CRATER', prio: 2, lat: -9.20, lon: -1.80, diam: 154.0 },
  { id: 'alphonsus', name: 'Alphonsus Krateri', cat: 'CRATER', prio: 3, lat: -13.40, lon: -2.80, diam: 119.0 },
  { id: 'arzachel', name: 'Arzachel Krateri', cat: 'CRATER', prio: 3, lat: -18.20, lon: -1.90, diam: 96.0 },
  { id: 'archimedes', name: 'Archimedes Krateri', cat: 'CRATER', prio: 2, lat: 29.72, lon: -3.99, diam: 81.0 },
  { id: 'eratosthenes', name: 'Eratosthenes Krateri', cat: 'CRATER', prio: 2, lat: 14.47, lon: -11.32, diam: 59.0 },
  { id: 'theophilus', name: 'Theophilus Krateri', cat: 'CRATER', prio: 2, lat: -11.45, lon: 26.28, diam: 100.0 },
  { id: 'petavius', name: 'Petavius Krateri', cat: 'CRATER', prio: 2, lat: -25.30, lon: 60.40, diam: 184.0 },
  { id: 'langrenus', name: 'Langrenus Krateri', cat: 'CRATER', prio: 2, lat: -8.90, lon: 60.90, diam: 132.0 },
  { id: 'gassendi', name: 'Gassendi Krateri', cat: 'CRATER', prio: 2, lat: -17.55, lon: -39.96, diam: 111.0 },
  { id: 'schickard', name: 'Schickard Krateri', cat: 'CRATER', prio: 2, lat: -44.38, lon: -55.11, diam: 212.0 },
  { id: 'bailly', name: 'Bailly Krateri', cat: 'CRATER', prio: 2, lat: -66.80, lon: -68.90, diam: 300.0 },
  { id: 'tsiolkovskiy', name: 'Tsiolkovskiy (Uzak Yüz)', cat: 'CRATER', prio: 1, lat: -20.40, lon: 129.10, diam: 184.0 },
  { id: 'hertzsprung', name: 'Hertzsprung Havzası', cat: 'CRATER', prio: 2, lat: 1.37, lon: -128.66, diam: 536.0 },
  { id: 'korolev', name: 'Korolev Havzası', cat: 'CRATER', prio: 2, lat: -4.00, lon: -157.40, diam: 423.0 },
  { id: 'apenninus', name: 'Montes Apenninus Dağları', cat: 'CRATER', prio: 2, lat: 19.87, lon: -0.03, diam: 600.0 },
  { id: 'carpatus', name: 'Montes Carpatus Dağları', cat: 'CRATER', prio: 3, lat: 14.57, lon: -23.62, diam: 361.0 },
  { id: 'caucasus', name: 'Montes Caucasus Dağları', cat: 'CRATER', prio: 3, lat: 37.50, lon: 9.90, diam: 445.0 },
  { id: 'jura', name: 'Montes Jura (Sinus Iridum)', cat: 'CRATER', prio: 2, lat: 47.10, lon: -34.00, diam: 422.0 },
  { id: 'vallis_alpes', name: 'Vallis Alpes (Alp Vadisi)', cat: 'CRATER', prio: 3, lat: 49.21, lon: 3.63, diam: 166.0 },
  { id: 'vallis_schroteri', name: 'Vallis Schröteri Vadisi', cat: 'CRATER', prio: 3, lat: 26.20, lon: -50.80, diam: 185.0 },
  { id: 'rupes_recta', name: 'Rupes Recta (Düz Duvar)', cat: 'CRATER', prio: 3, lat: -22.10, lon: -7.80, diam: 110.0 },
  { id: 'mons_huygens', name: 'Mons Huygens (En Yüksek Dağ)', cat: 'CRATER', prio: 2, lat: 19.92, lon: -2.86, diam: 40.0 },
  { id: 'mons_pico', name: 'Mons Pico Zirvesi', cat: 'CRATER', prio: 3, lat: 45.70, lon: -8.90, diam: 25.0 },
  { id: 'mendeleev', name: 'Mendeleev Krateri', cat: 'CRATER', prio: 3, lat: 5.38, lon: 141.17, diam: 331.0 },
  { id: 'daedalus', name: 'Daedalus Krateri (Uzak Yüz)', cat: 'CRATER', prio: 2, lat: -5.90, lon: 179.40, diam: 93.0 },

  // Lunar Maria & Mega-Basins
  { id: 'procellarum', name: 'Oceanus Procellarum', cat: 'MARE', prio: 1, lat: 18.40, lon: -57.40, diam: 2568.0 },
  { id: 'imbrium', name: 'Mare Imbrium (Yağmurlar Denizi)', cat: 'MARE', prio: 1, lat: 32.80, lon: -15.60, diam: 1146.0 },
  { id: 'serenitatis', name: 'Mare Serenitatis (Dinginlik)', cat: 'MARE', prio: 1, lat: 28.00, lon: 17.50, diam: 674.0 },
  { id: 'tranquillitatis', name: 'Mare Tranquillitatis (Sükunet)', cat: 'MARE', prio: 1, lat: 8.50, lon: 31.40, diam: 873.0 },
  { id: 'crisium', name: 'Mare Crisium (Bunalımlar Denizi)', cat: 'MARE', prio: 1, lat: 17.00, lon: 59.10, diam: 556.0 },
  { id: 'fecunditatis', name: 'Mare Fecunditatis (Bereket)', cat: 'MARE', prio: 2, lat: -7.80, lon: 51.30, diam: 840.0 },
  { id: 'nectaris', name: 'Mare Nectaris (Nektar Denizi)', cat: 'MARE', prio: 2, lat: -15.20, lon: 35.50, diam: 339.0 },
  { id: 'nubium', name: 'Mare Nubium (Bulutlar Denizi)', cat: 'MARE', prio: 2, lat: -21.30, lon: -16.60, diam: 715.0 },
  { id: 'humorum', name: 'Mare Humorum (Nemler Denizi)', cat: 'MARE', prio: 2, lat: -24.40, lon: -38.60, diam: 389.0 },
  { id: 'frigoris', name: 'Mare Frigoris (Soğuk Deniz)', cat: 'MARE', prio: 2, lat: 56.00, lon: 1.40, diam: 1446.0 },
  { id: 'vaporum', name: 'Mare Vaporum (Buharlar Denizi)', cat: 'MARE', prio: 3, lat: 13.30, lon: 3.60, diam: 245.0 },
  { id: 'cognitum', name: 'Mare Cognitum', cat: 'MARE', prio: 3, lat: -10.50, lon: -22.30, diam: 376.0 },
  { id: 'orientale', name: 'Mare Orientale (Doğu Denizi)', cat: 'MARE', prio: 1, lat: -19.40, lon: -92.80, diam: 327.0 },
  { id: 'moscoviense', name: 'Mare Moscoviense (Uzak Yüz)', cat: 'MARE', prio: 2, lat: 27.30, lon: 147.90, diam: 277.0 },
  { id: 'australi', name: 'Mare Australe (Güney Denizi)', cat: 'MARE', prio: 2, lat: -47.77, lon: 91.99, diam: 996.0 },
  { id: 'sinus_medii', name: 'Sinus Medii (Merkez Körfezi)', cat: 'MARE', prio: 3, lat: 1.60, lon: -1.00, diam: 287.0 },
  { id: 'spa_basin', name: 'Güney Kutbu–Aitken Havzası', cat: 'MARE', prio: 1, lat: -53.00, lon: -169.00, diam: 2500.0 },
];

export interface SpectrumMeta {
  code: string;
  unit: string;
  grad: string;
  swatch: string;
}

export const SPECTRUM_META: SpectrumMeta[] = [
  {
    code: 'WAC-643nm',
    unit: '0.04 – 0.42',
    grad: 'linear-gradient(90deg, #1e293b, #64748b, #cbd5e1, #f8fafc)',
    swatch: '#cbd5e1',
  },
  {
    code: 'LOLA-DEM',
    unit: '-9.12 .. +10.76 km',
    grad: 'linear-gradient(90deg, #1e1b4b, #2563eb, #06b6d4, #10b981, #eab308, #ef4444, #f8fafc)',
    swatch: 'linear-gradient(90deg,#2563eb,#10b981,#ef4444)',
  },
  {
    code: 'SLOPE-DEG',
    unit: '0° – 35°+',
    grad: 'linear-gradient(90deg, #059669, #10b981 35%, #f59e0b 65%, #ef4444 85%, #9f1239)',
    swatch: 'linear-gradient(90deg,#10b981,#f59e0b,#ef4444)',
  },
  {
    code: 'DIVINER-K',
    unit: '35 K – 390 K',
    grad: 'linear-gradient(90deg, #312e81, #0284c7 28%, #38bdf8 35%, #64748b 55%, #f97316 82%, #fef08a)',
    swatch: 'linear-gradient(90deg,#38bdf8,#4f46e5,#f97316)',
  },
  {
    code: 'M3-H2O-WT%',
    unit: '0.01 – 8.5 wt%',
    grad: 'linear-gradient(90deg, #d97706, #64748b 35%, #3b82f6 70%, #22d3ee)',
    swatch: 'linear-gradient(90deg,#d97706,#6366f1,#22d3ee)',
  },
  {
    code: 'SOLAR-DTE',
    unit: '0% – 100%',
    grad: 'linear-gradient(90deg, #090d16, #1e3a8a 30%, #d97706 70%, #fef08a)',
    swatch: 'linear-gradient(90deg,#0f172a,#f59e0b,#fef08a)',
  },
];

export interface VehicleProfile {
  key: 'clps' | 'hls' | 'cargo';
  labelKey: string;
  dryMassKg: number;
  propCapacityKg: number;
  ispSec: number;
  densityKgPerL: number;
}

export const VEHICLES: Record<'clps' | 'hls' | 'cargo', VehicleProfile> = {
  clps: {
    key: 'clps',
    labelKey: 'vehClps',
    dryMassKg: 540,
    propCapacityKg: 660,
    ispSec: 320,
    densityKgPerL: 0.75,
  },
  hls: {
    key: 'hls',
    labelKey: 'vehHls',
    dryMassKg: 6800,
    propCapacityKg: 9200,
    ispSec: 450,
    densityKgPerL: 0.42,
  },
  cargo: {
    key: 'cargo',
    labelKey: 'vehCargo',
    dryMassKg: 2850,
    propCapacityKg: 3650,
    ispSec: 345,
    densityKgPerL: 0.78,
  },
};

export interface TeamMember {
  name: string;
}

export const ASTROAPEX_TEAM: TeamMember[] = [
  { name: 'Atahan Karayel' },
  { name: 'Burak Karabay' },
  { name: 'Ferman Ali Aslan' },
  { name: 'Melih Oğuz' },
  { name: 'Bora Sancak' },
];

export interface OfficialReference {
  title: string;
  agency: string;
  url: string;
  descTr: string;
  descEn: string;
}

export const OFFICIAL_REFERENCES: OfficialReference[] = [
  {
    title: 'NASA Moon Trek Portal',
    agency: 'NASA / JPL',
    url: 'https://trek.nasa.gov/moon/#v=0.1&x=0&y=0&z=1&p=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104903&d=&locale=&b=moon&e=-253.12499527831596%2C-142.73437233749482%2C253.12499527831596%2C142.73437233749482&sfz=&w=',
    descTr: 'Güney Kutbu stereografik projeksiyonu, LRO LOLA DEM katmanları ve koordinat standartları.',
    descEn: 'South Pole stereographic projection, LRO LOLA DEM layers, and selenographic coordinate standards.',
  },
  {
    title: 'LROC QuickMap',
    agency: 'ASU / NASA LRO',
    url: 'https://quickmap.lroc.im-ldi.com/?prjExtent=-2031120.5130134%2C-1284425.3189988%2C2264399.2309866%2C1192914.0730012&earthShadowEnabled=true&proj=10&',
    descTr: 'Yüksek çözünürlüklü LROC WAC/NAC optik haritaları, krater eğimleri ve Dünya gölge analizleri.',
    descEn: 'High-resolution LROC WAC/NAC optical mosaics, slope overlays, and Earth shadow geometry.',
  },
  {
    title: 'NASA JPL Horizons System',
    agency: 'NASA / JPL',
    url: 'https://ssd.jpl.nasa.gov/horizons/',
    descTr: 'Güneş, Dünya ve Ay arasındaki anlık efemeris konumları ve sub-solar açılar için resmi kaynak.',
    descEn: 'Official ephemeris service for real-time Sun, Earth, and Moon vectors and sub-solar angles.',
  },
  {
    title: 'NASA Planetary Data System (PDS)',
    agency: 'NASA',
    url: 'https://pds.nasa.gov/',
    descTr: 'LRO LOLA, Diviner Termal Radyometre ve M3 su buzu ham bilimsel veri arşivleri.',
    descEn: 'Primary archive for LRO LOLA, Diviner thermal radiometer, and M3 water-ice datasets.',
  },
  {
    title: 'CSA Moon Exploration Portal',
    agency: 'Canadian Space Agency (ASC-CSA)',
    url: 'https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/',
    descTr: 'Artemis iş birliği, ay yüzeyi keşif araçları ve kutup görev araştırmaları.',
    descEn: 'Artemis lunar surface exploration research, rover autonomy, and polar mission studies.',
  },
  {
    title: 'CSA RADARSAT-1 Open Dataset',
    agency: 'Canadian Space Agency (ASC-CSA)',
    url: 'https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1',
    descTr: 'Sentetik açıklıklı radar (SAR) geri saçılım ve yüzey pürüzlülük analiz metodolojisi.',
    descEn: 'Synthetic Aperture Radar (SAR) backscatter and surface roughness analysis datasets.',
  },
  {
    title: 'ESA Open Science Data Catalogue',
    agency: 'European Space Agency (ESA)',
    url: 'https://opensciencedata.esa.int/',
    descTr: 'Avrupa Uzay Ajansı açık gezegen bilimi, SMART-1 ve uzay ortamı veri kümeleri.',
    descEn: 'ESA open planetary science, SMART-1 observations, and lunar environment datasets.',
  },
  {
    title: 'AstroApex Demo Repository',
    agency: 'Team AstroApex (GitHub)',
    url: 'https://github.com/Nasa-AstroApex/demo-repository.git',
    descTr: 'C11 matematik çekirdeği, Lua konfigürasyon betikleri ve görev simülasyonu kaynak deposu.',
    descEn: 'C11 mathematical kernel, Lua orchestration scripts, and mission simulation source repository.',
  },
];
