// Comprobación diaria de data/fiscalidad.json: estructura válida (si no, falla el bot) y aviso cuando una rebaja
// temporal caduca en 10 días o menos, o ha caducado sin otra que la siga. El aviso lo convierte en issue el workflow.
import { writeFileSync } from 'node:fs';
import { validarFiscal, estadoFiscal, fiscal, FISCAL } from '../src/lib/fiscal.mjs';

const hoy = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const errores = validarFiscal();
if (errores.length) {
  console.error('data/fiscalidad.json no es válido:\n- ' + errores.join('\n- '));
  process.exit(1);
}
const vigente = fiscal(hoy);
console.log(`Fiscalidad ${hoy}: ${vigente.rebaja ? `rebaja temporal (${vigente.norma}, hasta el ${vigente.hasta})` : `tipos normales (${vigente.norma})`}, IVA ${vigente.iva} %`);
const e = estadoFiscal(hoy);
if (e.aviso) {
  const texto = [
    `**${e.titulo}.**`, '',
    `Norma: [${e.periodo.norma}](${e.periodo.url}).`,
    e.aviso === 'caduca'
      ? 'Antes de esa fecha, comprueba en el BOE y en la Agencia Tributaria si hay prórroga o nuevos tipos.'
      : 'El sitio ya calcula las guías con los tipos normales de la Ley 38/1992 y el IVA del 21 %. Comprueba en el BOE si se ha aprobado una prórroga o nuevos tipos.',
    'Si los hay, añade el periodo a `data/fiscalidad.json` (tipos en euros por 1.000 litros, con su norma y enlace) y cierra este aviso.',
    `Última revisión del fichero: ${FISCAL.revisado}.`,
  ].join('\n');
  writeFileSync('aviso-fiscal.md', texto + '\n');
  writeFileSync('aviso-fiscal-titulo.txt', e.titulo + '\n');
  console.log(`Aviso: ${e.titulo}`);
}
