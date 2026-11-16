// Tarea semanal: precios medios nacionales de Portugal y España del Boletín Petrolero de la Comisión Europea
// (Weekly Oil Bulletin, DG ENER; reutilización autorizada citando la fuente, CC BY 4.0) -> data/europa.json.
// Si la fuente falla o cambia de formato, se avisa y se conserva el fichero anterior (no bloquea el despliegue).
import { writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { aviso } from './lib/aviso.mjs';

export const URL_WOB = 'https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en?filename=Weekly_Oil_Bulletin_Prices_History_maticni_4web.xlsx';
const COLS = { pt95: 'PT_price_with_tax_euro95', ptga: 'PT_price_with_tax_diesel', es95: 'ES_price_with_tax_euro95', esga: 'ES_price_with_tax_diesel' };

/** Lee los ficheros de un .zip (lo justo para un .xlsx: sin cifrado, deflate o sin comprimir). */
export function unzip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('no es un zip');
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = {};
  for (let i = 0; i < n; i++) {
    const metodo = buf.readUInt16LE(p + 10), tam = buf.readUInt32LE(p + 20);
    const ln = buf.readUInt16LE(p + 28), le = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const nombre = buf.toString('utf8', p + 46, p + 46 + ln);
    const ini = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const datos = buf.subarray(ini, ini + tam);
    out[nombre] = metodo === 8 ? inflateRawSync(datos) : datos;
    p += 46 + ln + le + lc;
  }
  return out;
}

const fechaExcel = (n) => new Date(Date.UTC(1899, 11, 30) + n * 864e5).toISOString().slice(0, 10);

/** Serie [[fecha, pt95, ptga, es95, esga], ...] en €/l, de más antigua a más reciente. */
export function serieWOB(sharedXml, hojaXml) {
  const ss = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
  const celdas = (fila) => Object.fromEntries([...fila.matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(?:<f>[\s\S]*?<\/f>)?<v>([^<]*)<\/v>/g)]
    .map(([, col, attr, v]) => [col, attr.includes('t="s"') ? ss[+v] : v]));
  const filas = [...hojaXml.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)].map((m) => celdas(m[1]));
  const cab = filas[0] ?? {};
  const col = Object.fromEntries(Object.entries(COLS).map(([k, nombre]) => [k, Object.keys(cab).find((c) => cab[c] === nombre)]));
  const falta = Object.entries(col).filter(([, c]) => !c).map(([k]) => COLS[k]);
  if (falta.length) throw new Error(`faltan columnas: ${falta.join(', ')}`);
  const serie = [];
  for (const f of filas) {
    if (!/^\d{5}$/.test(f.A ?? '')) continue;
    const v = Object.keys(COLS).map((k) => +(+f[col[k]] / 1000).toFixed(3));
    if (v.some((x) => !(x > 0.5 && x < 4))) continue; // semana sin dato de alguno de los dos países
    serie.push([fechaExcel(+f.A), ...v]);
  }
  return serie.sort((a, b) => a[0].localeCompare(b[0]));
}

if (process.argv[1]?.endsWith('europa.mjs')) {
  const D = process.env.DATA_DIR ?? 'data';
  try {
    const r = await fetch(URL_WOB, { signal: AbortSignal.timeout(120000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const z = unzip(Buffer.from(await r.arrayBuffer()));
    const serie = serieWOB(z['xl/sharedStrings.xml'].toString('utf8'), z['xl/worksheets/sheet1.xml'].toString('utf8'));
    if (serie.length < 52) throw new Error(`solo ${serie.length} semanas con datos`);
    const ultima = serie.at(-1)[0];
    if ((Date.now() - new Date(ultima)) / 864e5 > 30) throw new Error(`el dato más reciente es del ${ultima}`);
    writeFileSync(`${D}/europa.json`, JSON.stringify({ fuente: 'Comisión Europea, Weekly Oil Bulletin (DG ENER)', url: URL_WOB, semana: ultima, serie: serie.slice(-110) }) + '\n');
    console.log(`Boletín Petrolero UE: ${serie.length} semanas, la última del ${ultima}`);
  } catch (e) {
    aviso('Boletín Petrolero de la UE no actualizado', String(e.message ?? e), 'La comparativa con Portugal sigue con la última semana guardada. Revisa si ha cambiado la URL o el formato del fichero en https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en');
    console.log(`Aviso: Boletín Petrolero no actualizado (${e.message ?? e})`);
  }
}
