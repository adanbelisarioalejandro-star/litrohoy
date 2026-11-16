// Carga y agrega todos los datos para el build. Se ejecuta una vez por build (caché de módulo).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { leerCSV, CARBURANTES } from '../../scripts/lib/fuente.mjs';
import { PROVINCIAS, CCAA, slug } from './geo.mjs';

const D = process.env.DATA_DIR ?? 'data';
const json = (f, def) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : def);

export const FUELS = Object.keys(CARBURANTES);
export const NOMBRE = Object.fromEntries(FUELS.map((k) => [k, CARBURANTES[k].nombre]));
export const FUENTE = 'Ministerio para la Transición Ecológica y el Reto Demográfico (Geoportal de Hidrocarburos)';
export const FUENTE_URL = 'https://geoportalgasolineras.es/';

const actual = json(`${D}/actual.json`, null);
if (!actual) throw new Error(`Falta ${D}/actual.json: ejecuta "npm run update"`);
export const FECHA = actual.fecha;
export const ACTUALIZADO = actual.actualizado;
export const estaciones = actual.estaciones;

// Criterios del control de calidad (los usan también qc.mjs y expand.mjs)
export const MIN_ESTACIONES = 2;
export const MIN_DIAS_HISTORICO = 14;
export const MIN_ESTACIONES_MARCA = 25;

// ---------- utilidades ----------
export const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const eur = (p, d = 3) => (p == null ? '—' : p.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' €');
export const pct = (x, d = 1) => (x == null ? '—' : (x > 0 ? '+' : '') + x.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d }) + ' %');
export const fechaLarga = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'a', 'en', 'e', 'o', 'km', 'n']);
export const titulo = (s) => s.toLowerCase().replace(/[\p{L}\d.ºª]+/gu, (w, i) =>
  (i > 0 && MENORES.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)).replace(/\bKm\b/g, 'km');

// Direcciones de la fuente (en mayúsculas y con abreviaturas): las normaliza para mostrarlas.
const ABREV = { 'C/': 'Calle', CR: 'Ctra.', CTRA: 'Ctra.', 'CTRA.': 'Ctra.', CL: 'Calle', C: 'Calle', AV: 'Avda.', AVDA: 'Avda.', 'AVDA.': 'Avda.', PZ: 'Plaza', PZA: 'Plaza', PG: 'Pol.', POL: 'Pol.', 'POL.': 'Pol.', PS: 'Paseo', AU: 'Autovía', AUT: 'Autovía' };
const VIA = /^(CALLE|CARRETERA|AVENIDA|PLAZA|PASEO|CAMINO|RONDA|TRAVESIA|TRAVESÍA|AUTOVIA|AUTOVÍA|POLIGONO|POLÍGONO|GLORIETA)$/;
export function direccion(s) {
  let t0 = s.toUpperCase()
    .replace(/\b([IVXL]+)KM\b/g, '$1 KM')            // "NACIONAL VKM 19" (errata de la fuente) -> "NACIONAL V KM 19"
    .replace(/\bP\.?K\.?(?=\s*\d)/g, 'KM')            // punto kilométrico
    .replace(/(\d)[,.](\d)/g, '$1\u0000$2')           // decimal sin espacios ("369,8", "23.5") -> se protege
    .replace(/\s*,\s*/g, ', ').replace(/(,\s*)?\bKM\.?\s*$/, '').replace(/[\s,]+$/, '').replace(/\s+/g, ' ').trim();
  // "CR A-5, 21": en carreteras, un número tras el código de vía sin "KM" es el punto kilométrico
  if (!/\bKM\b/.test(t0)) t0 = t0.replace(/^((?:CR|CTRA\.?|CARRETERA|AUTOVIA|AUTOVÍA|AU|AUT)\s+[A-Z]{1,3}-[\dIVXL]+[A-Z]?),\s*(\d[\d\u0000]*)(?=,|$)/, '$1, KM $2');
  let w = t0.split(' ').map((x) => x.replace(/\u0000/g, ','));
  if (ABREV[w[0]]) w[0] = ABREV[w[0]];
  // "CALLE CALLE DE ..." / "CALLE AVENIDA ..." -> se queda el segundo tipo de vía
  if (w.length > 2 && (VIA.test(w[0]) || /^(Calle|Ctra\.|Avda\.|Plaza|Paseo)$/.test(w[0])) && VIA.test(w[1].replace(',', ''))) w = w.slice(1);
  const out = w.map((t, i) => {
    const limpio = t.replace(/,$/, '');
    const coma = t.endsWith(',') ? ',' : '';
    if (/^[A-Z]{1,3}-?\d+[A-Z]?$/.test(limpio) && /\d/.test(limpio) && limpio.includes('-')) return limpio + coma; // A-5, CM-332
    if (/^[A-Z]{1,3}-[IVXL]+$/.test(limpio)) return limpio + coma; // N-III
    if (/^[IVXL]+$/.test(limpio) && w[i - 1] === 'NACIONAL') return limpio + coma; // Nacional VI
    if (limpio === 'S/N' || limpio === 'SN') return 's/n' + coma;
    if (limpio === 'KM' || limpio === 'KM.') return 'km' + coma;
    if (/^\d/.test(limpio) || /^[A-Z][a-z]+\.$/.test(limpio)) return t; // números, abreviaturas ya normalizadas
    const lw = limpio.toLowerCase();
    const siguiente = w[i + 1];
    // letra suelta como nombre de calle ("CALLE E, 7") en mayúscula; conjunciones/preposiciones en minúscula
    if (limpio.length === 1 && (coma || !siguiente || /^\d/.test(siguiente))) return limpio + coma;
    if (i > 0 && MENORES.has(lw)) return lw + coma;
    return lw.charAt(0).toUpperCase() + lw.slice(1) + coma;
  });
  return out.join(' ');
}

/** "la provincia de Sevilla", o el nombre de la comunidad si es uniprovincial ("la Comunidad de Madrid"). */
export function refZona(p, ccaaNombre, uniprovincial) {
  if (!uniprovincial) return `la provincia de ${p.nombre}`;
  if (/^(Comunidad|Región|Comunitat)/.test(ccaaNombre)) return `la ${ccaaNombre}`;
  if (ccaaNombre.startsWith('Illes')) return `las ${ccaaNombre}`;
  return ccaaNombre;
}

/** Estadísticas por carburante de una lista de estaciones. */
export function stats(lista) {
  const o = {};
  for (const f of FUELS) {
    const con = lista.filter((e) => e[f]);
    if (!con.length) continue;
    const ps = con.map((e) => e[f]);
    const min = Math.min(...ps), max = Math.max(...ps);
    o[f] = { media: media(ps), min, max, n: con.length, barata: con.find((e) => e[f] === min), cara: con.find((e) => e[f] === max) };
  }
  return o;
}

// ---------- histórico ----------
const ficheros = existsSync(`${D}/historico`) ? readdirSync(`${D}/historico`).filter((f) => f.endsWith('.csv')).sort() : [];
export const FECHAS_HIST = ficheros.map((f) => f.slice(0, 10));
const munInfo = json(`${D}/municipios.json`, {});
const hist = { nat: {}, prov: {}, ccaa: {}, mun: {} };
{
  const push = (obj, k, f, fecha, v) => (((obj[k] ??= {})[f] ??= []).push([fecha, v]));
  for (const fich of ficheros) {
    const fecha = fich.slice(0, 10);
    const acc = { nat: {}, prov: {}, ccaa: {} };
    for (const r of leerCSV(readFileSync(`${D}/historico/${fich}`, 'utf8'))) {
      const info = munInfo[r.id];
      const p = info?.[1], c = info?.[2];
      for (const f of FUELS) {
        if (r[f] == null) continue;
        const n = r['n' + f];
        push(hist.mun, r.id, f, fecha, r[f]);
        for (const [nivel, k] of [['nat', 'es'], ['prov', p], ['ccaa', c]]) {
          if (!k) continue;
          const a = ((acc[nivel][k] ??= {})[f] ??= [0, 0]);
          a[0] += r[f] * n; a[1] += n;
        }
      }
    }
    for (const nivel of ['nat', 'prov', 'ccaa'])
      for (const [k, fs] of Object.entries(acc[nivel]))
        for (const [f, [s, n]] of Object.entries(fs)) {
          const destino = nivel === 'nat' ? hist.nat : (hist[nivel][k] ??= {});
          (destino[f] ??= []).push([fecha, +(s / n).toFixed(3)]);
        }
  }
}
export const serieNacional = (f) => hist.nat[f] ?? [];
export const serieProvincia = (p, f) => hist.prov[p]?.[f] ?? [];
export const serieCCAA = (c, f) => hist.ccaa[c]?.[f] ?? [];
export const serieMunicipio = (id, f) => hist.mun[id]?.[f] ?? [];
/** Solo los puntos diarios recientes (los meses antiguos son 1 punto/mes). */
export const ultimosDias = (serie, dias) => {
  if (!serie.length) return serie;
  const corte = new Date(new Date(serie.at(-1)[0]).getTime() - dias * 864e5).toISOString().slice(0, 10);
  return serie.filter(([d]) => d >= corte);
};
/** Variación porcentual entre el último valor y el de hace `dias` (el punto más cercano anterior). */
export function variacion(serie, dias) {
  if (serie.length < 2) return null;
  const [ultF, ultV] = serie.at(-1);
  const obj = new Date(new Date(ultF).getTime() - dias * 864e5).toISOString().slice(0, 10);
  const prev = [...serie].reverse().find(([d]) => d <= obj);
  if (!prev) return null;
  // solo con un dato oficial de como mucho 3 días antes de la fecha objetivo; si no, no se muestra
  if ((new Date(obj) - new Date(prev[0])) / 864e5 > 3) return null;
  return ((ultV - prev[1]) / prev[1]) * 100;
}
const diasDiarios = (serie) => ultimosDias(serie, 120).length;

// ---------- entidades ----------
const porProv = new Map();
const porMun = new Map();
for (const e of estaciones) {
  if (!porProv.has(e.p)) porProv.set(e.p, []);
  porProv.get(e.p).push(e);
  if (!porMun.has(e.mi)) porMun.set(e.mi, []);
  porMun.get(e.mi).push(e);
}
const ordenar = (lista) => lista.sort((a, b) => (a.ga ?? 9) - (b.ga ?? 9) || (a.g95 ?? 9) - (b.g95 ?? 9));

export const provincias = Object.entries(PROVINCIAS).map(([id, [nombre, ccaa]]) => {
  const est = ordenar(porProv.get(id) ?? []);
  return { id, nombre, ccaa, slug: slug(nombre), url: `/gasolineras/${slug(nombre)}/`, est, stats: stats(est) };
}).filter((p) => p.est.length);
export const provPorId = Object.fromEntries(provincias.map((p) => [p.id, p]));

export const comunidades = Object.entries(CCAA).map(([id, nombre]) => {
  const provs = provincias.filter((p) => p.ccaa === id);
  const est = provs.flatMap((p) => p.est);
  // Comunidades de una sola provincia: sin página propia (sería un duplicado); su URL es la de la provincia
  const uni = provs.length === 1;
  return { id, nombre, slug: slug(nombre), url: uni ? provs[0]?.url : `/comunidad/${slug(nombre)}/`, uni, provs, est, stats: stats(est) };
}).filter((c) => c.est.length);
export const ccaaPorId = Object.fromEntries(comunidades.map((c) => [c.id, c]));
// p.ref: cómo nombrar la zona de referencia en los textos ("la provincia de Sevilla" / "la Comunidad de Madrid")
for (const p of provincias) { const c = ccaaPorId[p.ccaa]; p.ref = refZona(p, c.nombre, c.provs.length === 1); }

const publicadas = json(`${D}/publicadas.json`, { municipios: {} }).municipios;
export const retiradas = new Set(json(`${D}/retiradas.json`, []));

export const municipios = [];
for (const p of provincias) {
  const usados = new Set();
  const lista = [...new Set(p.est.map((e) => e.mi))].map((id) => porMun.get(id));
  lista.sort((a, b) => b.length - a.length);
  for (const est of lista) {
    const id = est[0].mi;
    const nombre = est[0].m;
    let s = slug(nombre);
    if (usados.has(s)) s = `${s}-${id}`;
    usados.add(s);
    const m = {
      id, nombre, prov: p.id, ccaa: p.ccaa, slug: s, url: `${p.url}${s}/`, est: ordenar([...est]), stats: stats(est),
      publicada: id in publicadas, desde: publicadas[id] ?? null, retirada: retiradas.has(id),
    };
    m.diasHist = diasDiarios(serieMunicipio(id, 'ga').length ? serieMunicipio(id, 'ga') : serieMunicipio(id, 'g95'));
    municipios.push(m);
  }
}
export const munPorId = Object.fromEntries(municipios.map((m) => [m.id, m]));

/** ¿Tiene el municipio datos suficientes para merecer página propia? Devuelve lista de motivos si no. */
export function motivosNoApta(m) {
  const fallos = [];
  const conPrecio = m.est.filter((e) => e.ga || e.g95).length;
  if (conPrecio < MIN_ESTACIONES) fallos.push(`solo ${conPrecio} gasolinera(s) con precio (mínimo ${MIN_ESTACIONES})`);
  if (m.diasHist < MIN_DIAS_HISTORICO) fallos.push(`solo ${m.diasHist} días de histórico (mínimo ${MIN_DIAS_HISTORICO})`);
  if (!m.stats.ga && !m.stats.g95) fallos.push('sin precios de gasolina 95 ni gasóleo A');
  return fallos;
}
export const municipiosPublicados = municipios.filter((m) => m.publicada && !motivosNoApta(m).length);

// ---------- marcas ----------
const normMarca = (r) => r.toUpperCase().replace(/\s+/g, ' ').trim();
const nombreMarca = (r) => (r.length <= 3 ? r : titulo(r));
export const marcas = (() => {
  const g = new Map();
  for (const e of estaciones) {
    const k = normMarca(e.r);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(e);
  }
  return [...g].filter(([, est]) => est.filter((e) => e.ga || e.g95).length >= MIN_ESTACIONES_MARCA).map(([k, est]) => ({
    clave: k, nombre: nombreMarca(k), slug: slug(k), url: `/marca/${slug(k)}/`, est, stats: stats(est),
    provs: Object.entries(Object.groupBy(est, (e) => e.p)).map(([p, l]) => ({ prov: provPorId[p], est: l, stats: stats(l) }))
      .filter((x) => x.prov).sort((a, b) => b.est.length - a.est.length),
  })).sort((a, b) => b.est.length - a.est.length);
})();
export const marcaDe = (e) => marcas.find((m) => m.clave === normMarca(e.r));

export const nacional = { stats: stats(estaciones) };

/** Frase comparativa "un 2,3 % más barato que la media de X". */
export function comparar(valor, ref, nombreRef) {
  if (valor == null || ref == null) return '';
  const d = ((valor - ref) / ref) * 100;
  if (Math.abs(d) < 0.25) return `prácticamente igual que la media de ${nombreRef}`;
  return `un ${Math.abs(d).toLocaleString('es-ES', { maximumFractionDigits: 1 })} % ${d < 0 ? 'más barato' : 'más caro'} que la media de ${nombreRef}`;
}
export function tendencia(serie, dias = 30) {
  const v = variacion(serie, dias);
  if (v == null) return null;
  if (Math.abs(v) < 0.3) return `se ha mantenido estable en los últimos ${dias} días (${pct(v)})`;
  return `ha ${v > 0 ? 'subido' : 'bajado'} un ${Math.abs(v).toLocaleString('es-ES', { maximumFractionDigits: 1 })} % en los últimos ${dias} días`;
}
