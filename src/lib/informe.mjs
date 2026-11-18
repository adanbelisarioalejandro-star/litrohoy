// Informe semanal: se calcula con los datos del día y se congela cada semana en data/informes/AAAA-MM-DD.json,
// para que cada informe tenga una URL permanente que no cambie con los precios de los días siguientes.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { provincias, marcas, municipios, municipiosPublicados, dispersionMunicipal, MIN_GASOLINERAS_COMPARAR, nacional,
  serieNacional, serieProvincia, ultimosDias, variacion, FECHA } from './datos.mjs';

const D = process.env.DATA_DIR ?? 'data';
export const DIR_INFORMES = `${D}/informes`;
const r3 = (x) => (x == null ? null : +x.toFixed(4));

export function calcularInforme() {
  const desde = new Date(new Date(FECHA).getTime() - 7 * 864e5).toISOString().slice(0, 10);
  const ranking = (f) => provincias.map((p) => ({ nombre: p.nombre, url: p.url, precio: r3(p.stats[f]?.media), v: r3(variacion(serieProvincia(p.id, f), 7)) }))
    .filter((x) => x.v != null && x.precio).sort((a, b) => b.v - a.v);
  const nac = Object.fromEntries(['ga', 'g95'].map((f) => [f, { media: r3(nacional.stats[f].media), n: nacional.stats[f].n, v: r3(variacion(serieNacional(f), 7)) }]));
  return {
    fecha: FECHA, desde, nac,
    provs: { ga: ranking('ga'), g95: ranking('g95') },
    marcas: marcas.filter((m) => m.stats.ga).sort((a, b) => a.stats.ga.media - b.stats.ga.media)
      .map((m) => ({ nombre: m.nombre, url: m.url, media: r3(m.stats.ga.media), est: m.est.length })),
    ahorro: { n: dispersionMunicipal.n, min: MIN_GASOLINERAS_COMPARAR, mediaMin: r3(dispersionMunicipal.mediaMin), maxMin: r3(dispersionMunicipal.maxMin) },
    mayor: municipios.filter((m) => m.stats.ga?.n >= MIN_GASOLINERAS_COMPARAR)
      .sort((a, b) => (b.stats.ga.max - b.stats.ga.min) - (a.stats.ga.max - a.stats.ga.min)).slice(0, 5)
      .map((m) => ({ nombre: m.nombre, url: m.url, prov: provincias.find((p) => p.id === m.prov).nombre, min: m.stats.ga.min, max: m.stats.ga.max })),
    serie: { ga: ultimosDias(serieNacional('ga'), 30), g95: ultimosDias(serieNacional('g95'), 30) },
  };
}

/** Informes congelados, del más reciente al más antiguo. */
export const informesArchivados = existsSync(DIR_INFORMES)
  ? readdirSync(DIR_INFORMES).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse()
    .map((f) => JSON.parse(readFileSync(`${DIR_INFORMES}/${f}`, 'utf8')))
  : [];

/** Año y número de semana ISO ('2026-W47'): un informe por semana. */
export function semanaISO(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)); // jueves de esa semana
  const semana = 1 + Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 6048e5);
  return `${d.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

// enlaces de un informe antiguo: solo a páginas que siguen existiendo hoy (un municipio o una marca pueden despublicarse)
export const urlsVivas = new Set([...provincias.map((p) => p.url), ...marcas.map((m) => m.url), ...municipiosPublicados.map((m) => m.url)]);
