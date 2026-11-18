// Congela el informe semanal de hoy en data/informes/AAAA-MM-DD.json (URL permanente /informe-semanal/AAAA-MM-DD/).
// Uno por semana ISO: si esta semana ya tiene informe, no hace nada (los informes publicados no se reescriben).
import { mkdirSync, writeFileSync } from 'node:fs';
import { calcularInforme, informesArchivados, semanaISO, DIR_INFORMES } from '../src/lib/informe.mjs';

const inf = calcularInforme();
const misma = informesArchivados.find((i) => semanaISO(i.fecha) === semanaISO(inf.fecha));
if (misma) {
  console.log(`La semana ${semanaISO(inf.fecha)} ya tiene informe (${misma.fecha}): no se toca.`);
} else {
  mkdirSync(DIR_INFORMES, { recursive: true });
  writeFileSync(`${DIR_INFORMES}/${inf.fecha}.json`, JSON.stringify(inf) + '\n');
  console.log(`Informe semanal archivado: ${DIR_INFORMES}/${inf.fecha}.json`);
}
