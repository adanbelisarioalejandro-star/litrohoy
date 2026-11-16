// Tarea diaria del bot: descarga los precios de hoy, los valida y guarda instantánea + histórico.
// Uso: node scripts/update.mjs            (hoy)
//      node scripts/update.mjs 01-10-2026 (un día del histórico oficial, sin tocar actual.json)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { descargar, validar, compactar, agregarCSV, fechaISO, FormatoError } from './lib/fuente.mjs';

export async function actualizar(fechaHist = null, dir = 'data', raw = null) {
  raw ??= await descargar(fechaHist);
  const est = compactar(validar(raw));
  const fecha = fechaISO(raw.Fecha);
  mkdirSync(`${dir}/historico`, { recursive: true });
  writeFileSync(`${dir}/historico/${fecha}.csv`, agregarCSV(est));

  const fMun = `${dir}/municipios.json`;
  const mun = existsSync(fMun) ? JSON.parse(readFileSync(fMun, 'utf8')) : {};
  for (const e of est) mun[e.mi] = [e.m, e.p, e.c];
  // claves ordenadas, una por línea -> diffs pequeños en git
  writeFileSync(fMun, '{\n' + Object.keys(mun).sort((a, b) => a - b).map((k) => `${JSON.stringify(k)}:${JSON.stringify(mun[k])}`).join(',\n') + '\n}\n');

  if (!fechaHist) writeFileSync(`${dir}/actual.json`, JSON.stringify({ fecha, actualizado: raw.Fecha, estaciones: est }));
  return { fecha, estaciones: est.length };
}

/** Fecha ISO -> 'DD-MM-AAAA' de hace `dias` días (formato del endpoint histórico). */
export function haceDias(iso, dias) {
  const d = new Date(new Date(iso + 'T12:00:00Z').getTime() - dias * 864e5).toISOString().slice(0, 10);
  return { iso: d, api: d.split('-').reverse().join('-') };
}

if (process.argv[1]?.endsWith('update.mjs')) {
  actualizar(process.argv[2] ?? null)
    .then(async (r) => {
      console.log(`OK ${r.fecha}: ${r.estaciones} estaciones`);
      // El dato oficial exacto de hace un año, para la variación anual (si falla, no bloquea la actualización)
      const h = haceDias(r.fecha, 365);
      if (!process.argv[2] && !existsSync(`data/historico/${h.iso}.csv`))
        await actualizar(h.api).then((x) => console.log(`OK histórico ${x.fecha}`), (e) => console.error(`Aviso: sin histórico de ${h.iso}: ${e.message}`));
    })
    .catch((e) => {
      console.error(e instanceof FormatoError ? `CAMBIO DE FORMATO EN LA FUENTE: ${e.message}` : `ERROR: ${e.message}`);
      process.exit(e instanceof FormatoError ? 2 : 1);
    });
}
