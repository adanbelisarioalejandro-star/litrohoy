// Datos sintéticos (formato real de la API del Ministerio) para los tests. Sin red.
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CARBURANTES, compactar, agregarCSV } from '../scripts/lib/fuente.mjs';

export function estacionRaw(i, o = {}) {
  const e = {
    'C.P.': '28001', 'Dirección': `CALLE MAYOR, ${i}`, 'Horario': 'L-D: 24H', 'Latitud': '40,416775', 'Localidad': 'VILLA',
    'Longitud (WGS84)': '-3,703790', 'Margen': 'D', 'Municipio': o.m ?? 'Villa', 'Provincia': 'MADRID', 'Remisión': 'dm',
    'Rótulo': o.r ?? 'REPSOL', 'Tipo Venta': 'P', 'IDEESS': String(i), 'IDMunicipio': o.mi ?? '1', 'IDProvincia': o.p ?? '28', 'IDCCAA': o.c ?? '13',
  };
  for (const k of Object.values(CARBURANTES)) e[k.campo] = '';
  e['Precio Gasoleo A'] = o.ga ?? '1,500';
  e['Precio Gasolina 95 E5'] = o.g95 ?? '1,600';
  return e;
}

export const rawCon = (lista, fecha = '16/11/2026 2:19:02') => ({ Fecha: fecha, ListaEESSPrecio: lista });
export const rawGrande = (n = 8100) => rawCon(Array.from({ length: n }, (_, i) => estacionRaw(i + 1, { mi: String((i % 50) + 1) })));

/** Crea un directorio de datos mínimo y coherente; devuelve su ruta. */
export function crearDatos({ conHaceUnAno = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'litrohoy-'));
  mkdirSync(join(dir, 'historico'));
  const raw = [
    estacionRaw(1, { mi: '1', m: 'Villa', ga: '1,500', g95: '1,600' }),
    estacionRaw(2, { mi: '1', m: 'Villa', ga: '1,400', g95: '1,550', r: 'BALLENOIL' }),
    estacionRaw(3, { mi: '1', m: 'Villa', ga: '1,450', g95: '1,580' }),
    estacionRaw(4, { mi: '2', m: 'Rozas de Madrid (Las)', ga: '1,520', g95: '1,610' }),
    estacionRaw(5, { mi: '2', m: 'Rozas de Madrid (Las)', ga: '1,530', g95: '1,620' }),
    estacionRaw(6, { mi: '3', m: 'Sevilla', p: '41', c: '01', ga: '1,480', g95: '1,590' }),
  ];
  const est = compactar(raw);
  writeFileSync(join(dir, 'actual.json'), JSON.stringify({ fecha: '2026-11-16', actualizado: '16/11/2026 2:19:02', estaciones: est }));
  writeFileSync(join(dir, 'municipios.json'), JSON.stringify({ 1: ['Villa', '28', '13'], 2: ['Rozas de Madrid (Las)', '28', '13'], 3: ['Sevilla', '41', '01'] }));
  writeFileSync(join(dir, 'publicadas.json'), JSON.stringify({ municipios: { 1: '2026-08-01', 3: '2026-11-01' } }));
  // 20 días de histórico diario: el diésel baja 1 céntimo/día hasta el precio de hoy
  for (let d = 0; d < 20; d++) {
    const fecha = new Date(Date.UTC(2026, 10, 16 - d)).toISOString().slice(0, 10);
    const desplazado = est.map((e) => ({ ...e, ga: +(e.ga + d * 0.01).toFixed(3) }));
    writeFileSync(join(dir, 'historico', `${fecha}.csv`), agregarCSV(desplazado));
  }
  if (conHaceUnAno) writeFileSync(join(dir, 'historico', '2025-11-14.csv'), agregarCSV(est.map((e) => ({ ...e, ga: 1.2 }))));
  return dir;
}
