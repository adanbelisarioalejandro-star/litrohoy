// Control de calidad del sitio generado. Bloquea páginas sin datos suficientes o casi idénticas a otra.
// Uso: node scripts/qc.mjs dist              -> exit 1 si hay fallos
//      node scripts/qc.mjs dist --corregir   -> despublica los municipios que fallan y sale con 3 (hay que reconstruir)
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const UMBRAL_SIMILITUD = 0.9;
const MIN_PALABRAS = { datos: 250, guia: 400, otra: 120 };
const NOINDEX = /<meta name="robots" content="noindex/;

export function paginas(dir, base = dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...paginas(p, base));
    else if (f === 'index.html') out.push({ fichero: p, url: '/' + p.slice(base.length + 1).replace(/\\/g, '/').replace(/index\.html$/, '') });
  }
  return out;
}

export const textoPrincipal = (html) => (html.match(/<main[^>]*>([\s\S]*)<\/main>/)?.[1] ?? '')
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();

export const tipo = (url) => (/^\/gasolineras\/[^/]+\/[^/]+\/$/.test(url) ? 'municipio'
  : /^\/carretera\/[^/]+\/$/.test(url) ? 'carretera'
  : /^\/(gasolineras|comunidad|marca|carreteras|informe-semanal|portugal)\//.test(url) ? 'datos' : url.startsWith('/guias/') && url !== '/guias/' ? 'guia' : 'otra');

// MinHash (64 permutaciones) sobre trigramas de palabras: estima la similitud de Jaccard sin comparar conjuntos enteros
const K = 64;
const SEMILLAS = Array.from({ length: K }, (_, i) => (Math.imul(i + 1, 0x9e3779b1) >>> 0));
function fnv(s, semilla) {
  let h = (0x811c9dc5 ^ semilla) >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
export function firma(texto) {
  const w = texto.toLowerCase().split(' ');
  const min = new Array(K).fill(0xffffffff);
  for (let i = 0; i + 2 < w.length; i++) {
    const sh = w[i] + ' ' + w[i + 1] + ' ' + w[i + 2];
    for (let k = 0; k < K; k++) { const h = fnv(sh, SEMILLAS[k]); if (h < min[k]) min[k] = h; }
  }
  return min;
}
export const similitud = (a, b) => a.reduce((n, v, i) => n + (v === b[i]), 0) / K;

/** Revisa una página. Devuelve lista de motivos de fallo (vacía = OK). */
export function revisar(url, html) {
  const fallos = [];
  const t = tipo(url);
  const titulo = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1]?.trim();
  if (!titulo) fallos.push('sin <title>');
  if (!desc || desc.length < 50) fallos.push('sin meta description (o demasiado corta)');
  if (!/<link rel="canonical" href="https?:\/\/[^"]+"/.test(html)) fallos.push('sin canonical');
  if (!/<h1[\s>]/.test(html)) fallos.push('sin <h1>');
  const texto = textoPrincipal(html);
  const palabras = texto.split(' ').length;
  const min = t === 'guia' ? MIN_PALABRAS.guia : t === 'otra' ? MIN_PALABRAS.otra : MIN_PALABRAS.datos;
  if (palabras < min) fallos.push(`contenido escaso: ${palabras} palabras (mínimo ${min})`);
  if (t === 'municipio' || t === 'datos' || t === 'carretera') {
    if (!html.includes('class="fuente"') || !/<time datetime="\d{4}-\d{2}-\d{2}"/.test(html)) fallos.push('no muestra la fuente y la fecha de actualización');
    const precios = (texto.match(/\d,\d{3} €/g) ?? []).length;
    if (precios < 6) fallos.push(`datos insuficientes: solo ${precios} precios en la página`);
  }
  if (t === 'municipio' && !/<svg class="graf"/.test(html)) fallos.push('sin gráfico de evolución (falta histórico)');
  return { fallos, titulo, desc, texto, t };
}

export function controlar(dir) {
  const res = [];
  for (const p of paginas(dir)) {
    const html = readFileSync(p.fichero, 'utf8');
    // retiradas: fuera del índice, no cuentan. En la vista previa (BASE_PATH) todo es noindex y se revisa todo igual
    if (!process.env.BASE_PATH && NOINDEX.test(html)) continue;
    res.push({ url: p.url, ...revisar(p.url, html) });
  }
  // títulos y descripciones únicos
  for (const campo of ['titulo', 'desc']) {
    const vistos = new Map();
    for (const r of res) { if (!r[campo]) continue; if (vistos.has(r[campo])) r.fallos.push(`${campo === 'titulo' ? 'título' : 'descripción'} duplicado con ${vistos.get(r[campo])}`); else vistos.set(r[campo], r.url); }
  }
  // casi duplicados entre páginas del mismo tipo de plantilla
  for (const t of ['municipio', 'datos', 'guia']) {
    const grupo = res.filter((r) => r.t === t).map((r) => ({ r, f: firma(r.texto) }));
    for (let i = 0; i < grupo.length; i++)
      for (let j = i + 1; j < grupo.length; j++) {
        const s = similitud(grupo[i].f, grupo[j].f);
        if (s >= UMBRAL_SIMILITUD) grupo[j].r.fallos.push(`casi idéntica a ${grupo[i].r.url} (similitud ${s.toFixed(2)})`);
      }
  }
  return res;
}

if (process.argv[1]?.endsWith('qc.mjs')) {
  const dir = process.argv[2] ?? 'dist';
  const corregir = process.argv.includes('--corregir');
  const res = controlar(dir);
  const malas = res.filter((r) => r.fallos.length);
  const D = process.env.DATA_DIR ?? 'data';
  writeFileSync(`${D}/qc.json`, JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), paginas: res.length,
    fallos: malas.map((r) => ({ url: r.url, motivos: r.fallos })) }, null, 1) + '\n');
  console.log(`QC: ${res.length} páginas revisadas, ${malas.length} con fallos`);
  for (const r of malas) console.log(`  ✗ ${r.url}: ${r.fallos.join('; ')}`);
  if (!malas.length) process.exit(0);
  const mun = malas.filter((r) => r.t === 'municipio' || r.t === 'carretera');
  if (corregir && mun.length === malas.length) {
    // Solo fallan municipios o carreteras: se despublican (bloqueados 28 días) y hay que reconstruir
    const { municipios, carreteras } = await import('../src/lib/datos.mjs');
    const pub = JSON.parse(readFileSync(`${D}/publicadas.json`, 'utf8'));
    const bloq = existsSync(`${D}/bloqueadas.json`) ? JSON.parse(readFileSync(`${D}/bloqueadas.json`, 'utf8')) : {};
    const hoy = new Date().toISOString().slice(0, 10);
    for (const r of mun) {
      const c = r.t === 'carretera' && carreteras.find((x) => x.url === r.url);
      const m = !c && municipios.find((x) => x.url === r.url);
      if (c) { delete pub.carreteras?.[c.id]; bloq[`c:${c.id}`] = { fecha: hoy, url: r.url, motivo: r.fallos.join('; ') }; }
      if (m) { delete pub.municipios[m.id]; bloq[m.id] = { fecha: hoy, url: r.url, motivo: r.fallos.join('; ') }; }
    }
    writeFileSync(`${D}/publicadas.json`, JSON.stringify(pub, null, 0).replace(/,"/g, ',\n"') + '\n');
    writeFileSync(`${D}/bloqueadas.json`, JSON.stringify(bloq, null, 1) + '\n');
    console.log(`Despublicadas ${mun.length} páginas (municipios o carreteras). Reconstruye el sitio.`);
    process.exit(3);
  }
  process.exit(1);
}
