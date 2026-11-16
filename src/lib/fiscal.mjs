// Tipos vigentes por fecha (data/fiscalidad.json). Lo usan las guías y la comprobación diaria del bot (scripts/fiscal.mjs).
import { readFileSync } from 'node:fs';

export const FISCAL = JSON.parse(readFileSync(new URL('../../data/fiscalidad.json', import.meta.url), 'utf8'));
export const CARB_FISCAL = ['g95', 'g98', 'ga', 'gb', 'glp'];

/** Errores de estructura: periodos ordenados, sin solaparse, con norma, enlace, IVA y todos los tipos. */
export function validarFiscal(f = FISCAL) {
  const err = [];
  const comprobar = (p, n) => {
    if (!p.norma || !/^https:\/\//.test(p.url ?? '')) err.push(`${n}: falta norma o enlace oficial`);
    if (!(p.iva > 0 && p.iva < 30)) err.push(`${n}: IVA no válido`);
    for (const c of CARB_FISCAL) {
      const v = p.tipos?.[c];
      const ok = c === 'glp' ? v >= 0 : Array.isArray(v) && v.length === 2 && v.every((x) => x >= 0);
      if (!ok) err.push(`${n}: tipo de ${c} no válido`);
    }
  };
  comprobar(f.normal ?? {}, 'normal');
  (f.periodos ?? []).forEach((p, i, l) => {
    const n = `periodo ${p.desde ?? i}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.desde) || !/^\d{4}-\d{2}-\d{2}$/.test(p.hasta) || p.hasta < p.desde) err.push(`${n}: fechas no válidas`);
    if (i && p.desde <= l[i - 1].hasta) err.push(`${n}: se solapa con el anterior o no está ordenado`);
    comprobar(p, n);
  });
  return err;
}

/** Régimen aplicable en una fecha: el periodo de rebaja que la cubre o, si no hay, los tipos normales. */
export function fiscal(fecha, f = FISCAL) {
  const p = f.periodos.find((x) => x.desde <= fecha && fecha <= x.hasta);
  const r = p ?? f.normal;
  // €/l de impuesto especial (gasolinas y gasóleos); GLP queda en €/t
  const ieh = Object.fromEntries(CARB_FISCAL.filter((c) => c !== 'glp').map((c) => [c, (r.tipos[c][0] + r.tipos[c][1]) / 1000]));
  return { ...r, rebaja: !!p, ieh, glp: r.tipos.glp, factorIva: 1 + r.iva / 100 };
}
export const NORMAL = fiscal('1900-01-01');

/** Estado para el bot: avisa si la rebaja vigente caduca pronto o si acaba de caducar sin otra que la siga. */
export function estadoFiscal(hoy, f = FISCAL, diasAviso = 10) {
  const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
  const actual = f.periodos.find((x) => x.desde <= hoy && hoy <= x.hasta);
  const siguiente = actual && f.periodos.find((x) => x.desde > actual.hasta);
  if (actual && !siguiente && dias(hoy, actual.hasta) <= diasAviso)
    return { aviso: 'caduca', titulo: `La rebaja fiscal de los carburantes caduca el ${actual.hasta}`, periodo: actual };
  const ultima = [...f.periodos].reverse().find((x) => x.hasta < hoy);
  if (!actual && ultima && dias(ultima.hasta, hoy) <= 45)
    return { aviso: 'caducada', titulo: `La rebaja fiscal de los carburantes caducó el ${ultima.hasta}`, periodo: ultima };
  return { aviso: null };
}
