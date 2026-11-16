// Tarea semanal: publica como máximo MAX municipios nuevos que pasen el control de calidad.
// Uso: node scripts/expand.mjs            (semanal, máximo 40)
//      node scripts/expand.mjs --inicial  (lanzamiento: municipios con 10+ gasolineras)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const D = process.env.DATA_DIR ?? 'data';
const json = (f, def) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : def);
export const MAX_SEMANAL = 40;
export const MAX_CARRETERAS_SEMANA = 10;
const DIAS_BLOQUEO = 28;

/** Puntuación por provincia = impresiones medias por página publicada en esa provincia (Search Console). */
export function puntuacionProvincias(metricas, municipios) {
  const acc = {};
  for (const m of municipios) {
    const imp = metricas?.gsc?.[m.url]?.impresiones;
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

/** Cupo de esta semana: MAX menos lo publicado en los 7 días anteriores (aunque el bot se lance varias veces). */
export function cupoSemanal(publicadas, hoy, max = MAX_SEMANAL) {
  const recientes = Object.values(publicadas).filter((f) => (new Date(hoy) - new Date(f)) / 864e5 < 7).length;
  return Math.max(0, max - recientes);
}

export function bloqueadoReciente(bloq, id, hoy) {
  const b = bloq[id];
  return !!b && (new Date(hoy) - new Date(b.fecha)) / 864e5 < DIAS_BLOQUEO;
}

if (process.argv[1]?.endsWith('expand.mjs')) {
  const { municipios, motivosNoApta, carreteras, FECHA } = await import('../src/lib/datos.mjs');
  const fPub = `${D}/publicadas.json`;
  const pub = json(fPub, { municipios: {} });
  const bloq = json(`${D}/bloqueadas.json`, {});
  const inicial = process.argv.includes('--inicial');
  const candidatos = municipios.filter((m) => !(m.id in pub.municipios) && !bloqueadoReciente(bloq, m.id, FECHA) && !motivosNoApta(m).length);
  const elegidos = inicial
    ? candidatos.filter((m) => m.est.length >= 10)
    : elegir(candidatos, puntuacionProvincias(json(`${D}/metricas.json`, null), municipios), cupoSemanal(pub.municipios, FECHA));
  for (const m of elegidos) pub.municipios[m.id] = FECHA;
  console.log(`Publicados ${elegidos.length} municipios nuevos (total ${Object.keys(pub.municipios).length}; candidatos aptos restantes ${candidatos.length - elegidos.length})`);
  for (const m of elegidos) console.log(`  + ${m.url}`);
  // carreteras: cupo propio de 10 por semana; ya vienen filtradas por datos suficientes y ordenadas por nº de gasolineras
  pub.carreteras ??= {};
  const candC = carreteras.filter((c) => !(c.id in pub.carreteras) && !bloqueadoReciente(bloq, `c:${c.id}`, FECHA));
  const elegC = candC.slice(0, cupoSemanal(pub.carreteras, FECHA, MAX_CARRETERAS_SEMANA));
  for (const c of elegC) pub.carreteras[c.id] = FECHA;
  console.log(`Publicadas ${elegC.length} carreteras nuevas (total ${Object.keys(pub.carreteras).length}; aptas restantes ${candC.length - elegC.length})`);
  for (const c of elegC) console.log(`  + ${c.url}`);
  writeFileSync(fPub, JSON.stringify(pub, null, 0).replace(/,"/g, ',\n"') + '\n');
}
