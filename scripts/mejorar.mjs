// Tarea semanal: con datos de Search Console, retira del índice (noindex + fuera del sitemap) los municipios
// publicados hace 90+ días sin ninguna impresión, y reincorpora los retirados que vuelven a tener impresiones.
// Las páginas siguen existiendo (no hay enlaces rotos) y se reevalúan cada semana.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const D = process.env.DATA_DIR ?? 'data';
export const DIAS_SIN_VISITAS = 90;

/** Devuelve el nuevo conjunto de retiradas. municipios: [{id, url, desde}], gsc: {ruta: {imp90}} */
export function decidirRetiradas(municipios, gsc, retiradasActuales, hoy) {
  const nuevas = new Set(retiradasActuales);
  for (const m of municipios) {
    if (!m.desde) continue;
    const dias = (new Date(hoy) - new Date(m.desde)) / 864e5;
    const imp = gsc[m.url]?.imp90 ?? 0;
    if (imp > 0) nuevas.delete(m.id);
    else if (dias >= DIAS_SIN_VISITAS) nuevas.add(m.id);
  }
  return nuevas;
}

if (process.argv[1]?.endsWith('mejorar.mjs')) {
  const met = existsSync(`${D}/metricas.json`) ? JSON.parse(readFileSync(`${D}/metricas.json`, 'utf8')) : null;
  if (!met?.gsc) { console.log('Mejorar: sin datos de Search Console, no se retira nada'); process.exit(0); }
  const { municipios, FECHA } = await import('../src/lib/datos.mjs');
  const antes = existsSync(`${D}/retiradas.json`) ? JSON.parse(readFileSync(`${D}/retiradas.json`, 'utf8')) : [];
  const despues = decidirRetiradas(municipios.filter((m) => m.publicada), met.gsc, antes, FECHA);
  writeFileSync(`${D}/retiradas.json`, JSON.stringify([...despues].sort((a, b) => a - b)) + '\n');
  console.log(`Mejorar: ${despues.size} municipios retirados del índice (antes ${antes.length})`);
}
