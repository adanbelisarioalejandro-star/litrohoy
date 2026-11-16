// Descarga, validación y agregación de los precios oficiales de carburantes (MITECO / Geoportal).
export const API = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';

export const CARBURANTES = {
  g95: { campo: 'Precio Gasolina 95 E5', nombre: 'Gasolina 95' },
  ga: { campo: 'Precio Gasoleo A', nombre: 'Gasóleo A (diésel)' },
  g98: { campo: 'Precio Gasolina 98 E5', nombre: 'Gasolina 98' },
  gp: { campo: 'Precio Gasoleo Premium', nombre: 'Diésel premium' },
  glp: { campo: 'Precio Gases licuados del petróleo', nombre: 'GLP / autogás' },
  gb: { campo: 'Precio Gasoleo B', nombre: 'Gasóleo B (agrícola)' },
};
const CLAVES = Object.keys(CARBURANTES);
const OBLIGATORIOS = ['IDEESS', 'IDMunicipio', 'Municipio', 'IDProvincia', 'Provincia', 'IDCCAA', 'Rótulo',
  'Dirección', 'Horario', 'C.P.', 'Latitud', 'Longitud (WGS84)', ...CLAVES.map((k) => CARBURANTES[k].campo)];

export class FormatoError extends Error {}

const num = (s) => (s ? Number(String(s).replace(',', '.')) : null);

/** Descarga con reintentos. fecha: 'DD-MM-YYYY' para el histórico, o null para hoy. */
export async function descargar(fecha = null, intentos = 3) {
  const url = fecha ? `${API}/EstacionesTerrestresHist/${fecha}` : `${API}/EstacionesTerrestres/`;
  let ultimo;
  for (let i = 1; i <= intentos; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(180_000), headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
      return await r.json();
    } catch (e) {
      ultimo = e;
      if (i < intentos) await new Promise((res) => setTimeout(res, 5000 * i));
    }
  }
  throw new Error(`No se pudo descargar ${url}: ${ultimo?.message}`);
}

/** Comprueba que la fuente mantiene el formato esperado. Lanza FormatoError con el detalle. */
export function validar(raw, minEstaciones = 8000) {
  if (!raw || typeof raw.Fecha !== 'string' || !/^\d{2}\/\d{2}\/\d{4}/.test(raw.Fecha))
    throw new FormatoError('Falta el campo "Fecha" o no tiene formato DD/MM/AAAA');
  const lista = raw.ListaEESSPrecio;
  if (!Array.isArray(lista)) throw new FormatoError('Falta la lista "ListaEESSPrecio"');
  if (lista.length < minEstaciones)
    throw new FormatoError(`Solo ${lista.length} estaciones (mínimo esperado ${minEstaciones})`);
  const faltan = OBLIGATORIOS.filter((k) => !(k in lista[0]));
  if (faltan.length) throw new FormatoError(`Campos desaparecidos o renombrados: ${faltan.join(', ')}`);
  let conDiesel = 0;
  for (const s of lista) {
    for (const k of CLAVES) {
      const p = num(s[CARBURANTES[k].campo]);
      if (p !== null && !(p > 0.3 && p < 5)) throw new FormatoError(`Precio fuera de rango (${p}) en estación ${s.IDEESS}`);
    }
    if (s['Precio Gasoleo A']) conDiesel++;
  }
  if (conDiesel / lista.length < 0.8) throw new FormatoError(`Solo ${conDiesel} estaciones con gasóleo A: posible cambio de formato`);
  return lista;
}

/** '16/11/2026 2:19:02' -> '2026-11-16' */
export function fechaISO(fecha) {
  const [d, m, y] = fecha.split(' ')[0].split('/');
  return `${y}-${m}-${d}`;
}

/** Registro compacto por estación (lo que necesita el sitio). */
export function compactar(lista) {
  return lista.map((s) => {
    const e = {
      id: s.IDEESS, r: s['Rótulo'].trim(), d: s['Dirección'].trim(), l: s.Localidad?.trim() ?? '', cp: s['C.P.'],
      h: s.Horario, mi: s.IDMunicipio, m: s.Municipio.trim(), p: s.IDProvincia, c: s.IDCCAA,
      lat: num(s.Latitud), lon: num(s['Longitud (WGS84)']),
    };
    for (const k of CLAVES) { const v = num(s[CARBURANTES[k].campo]); if (v) e[k] = v; }
    return e;
  });
}

export const CSV_CABECERA = ['id', ...CLAVES.flatMap((k) => [k, 'n' + k])].join(',');

/** Media y nº de estaciones por municipio y carburante -> CSV (una línea por municipio). */
export function agregarCSV(estaciones) {
  const acc = new Map();
  for (const e of estaciones) {
    let a = acc.get(e.mi);
    if (!a) acc.set(e.mi, (a = Object.fromEntries(CLAVES.map((k) => [k, [0, 0]]))));
    for (const k of CLAVES) if (e[k]) { a[k][0] += e[k]; a[k][1]++; }
  }
  const filas = [...acc].sort((x, y) => Number(x[0]) - Number(y[0])).map(([id, a]) =>
    [id, ...CLAVES.flatMap((k) => (a[k][1] ? [(a[k][0] / a[k][1]).toFixed(3), a[k][1]] : ['', '']))].join(','));
  return [CSV_CABECERA, ...filas].join('\n') + '\n';
}

export function leerCSV(texto) {
  const [cab, ...filas] = texto.trim().split('\n');
  const cols = cab.split(',');
  return filas.map((f) => {
    const v = f.split(',');
    const o = { id: v[0] };
    cols.forEach((c, i) => { if (i && v[i] !== '') o[c] = Number(v[i]); });
    return o;
  });
}
