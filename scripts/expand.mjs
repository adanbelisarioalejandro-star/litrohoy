// Tarea semanal: publica como máximo MAX municipios nuevos que pasen el control de calidad.
// Uso: node scripts/expand.mjs            (semanal, máximo 40)
//      node scripts/expand.mjs --inicial  (lanzamiento: municipios con 10+ gasolineras)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const D = process.env.DATA_DIR ?? 'data';
const json = (f, def) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : def);
export const MAX_SEMANAL = 40;
const DIAS_BLOQUEO = 28;

/** Puntuación por provincia = impresiones medias por página publicada en esa provincia (Search Console). */
export function puntuacionProvincias(metricas, municipios) {
  const acc = {};
  for (const m of municipios) {
    const imp = metricas?.paginas?.[m.url]?.impresiones;
    if (imp == null) continue;
    const a = (acc[m.prov] ??= [0, 0]);
    a[0] += imp; a[1]++;
  }
  return Object.fromEntries(Object.entries(acc).map(([p, [s, n]]) => [p, s / n]));
}

/** Ordena candidatos: primero provincias que mejor funcionan, después municipios con más gasolineras. */
export function elegir(candidatos, puntos, max) {
  return [...candidatos].sort((a, b) => (puntos[b.prov] ?? 0) - (puntos[a.prov] ?? 0) || b.est.length - a.est.length).slice(0, max);
}

export function bloqueadoReciente(bloq, id, hoy) {
  const b = bloq[id];
  return !!b && (new Date(hoy) - new Date(b.fecha)) / 864e5 < DIAS_BLOQUEO;
}

if (process.argv[1]?.endsWith('expand.mjs')) {
  const { municipios, motivosNoApta, FECHA } = await import('../src/lib/datos.mjs');
  const fPub = `${D}/publicadas.json`;
  const pub = json(fPub, { municipios: {} });
  const bloq = json(`${D}/bloqueadas.json`, {});
  const inicial = process.argv.includes('--inicial');
  const candidatos = municipios.filter((m) => !(m.id in pub.municipios) && !bloqueadoReciente(bloq, m.id, FECHA) && !motivosNoApta(m).length);
  const elegidos = inicial
    ? candidatos.filter((m) => m.est.length >= 10)
    : elegir(candidatos, puntuacionProvincias(json(`${D}/metricas.json`, null), municipios), MAX_SEMANAL);
  for (const m of elegidos) pub.municipios[m.id] = FECHA;
  writeFileSync(fPub, JSON.stringify(pub, null, 0).replace(/,"/g, ',\n"') + '\n');
  console.log(`Publicados ${elegidos.length} municipios nuevos (total ${Object.keys(pub.municipios).length}; candidatos aptos restantes ${candidatos.length - elegidos.length})`);
  for (const m of elegidos) console.log(`  + ${m.url}`);
}
