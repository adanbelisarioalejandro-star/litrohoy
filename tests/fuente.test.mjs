import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validar, compactar, agregarCSV, leerCSV, fechaISO, FormatoError } from '../scripts/lib/fuente.mjs';
import { actualizar, haceDias } from '../scripts/update.mjs';
import { estacionRaw, rawCon, rawGrande } from './fixture.mjs';

test('validar acepta el formato real', () => {
  assert.equal(validar(rawCon([estacionRaw(1), estacionRaw(2)]), 2).length, 2);
});

test('validar detecta cambios de formato', () => {
  assert.throws(() => validar({ ListaEESSPrecio: [] }, 1), FormatoError);
  assert.throws(() => validar(rawCon([estacionRaw(1)]), 100), /Solo 1 estaciones/);
  const sinCampo = estacionRaw(1); delete sinCampo['Precio Gasoleo A'];
  assert.throws(() => validar(rawCon([sinCampo]), 1), /Precio Gasoleo A/);
  assert.throws(() => validar(rawCon([estacionRaw(1, { ga: '15,000' })]), 1), /fuera de rango/);
  assert.throws(() => validar(rawCon([estacionRaw(1, { ga: '' }), estacionRaw(2, { ga: '' })]), 1), /gasóleo A/);
});

test('fechaISO y haceDias', () => {
  assert.equal(fechaISO('16/11/2026 2:19:02'), '2026-11-16');
  assert.deepEqual(haceDias('2026-11-16', 365), { iso: '2025-11-16', api: '16-11-2025' });
});

test('compactar convierte comas decimales y omite precios vacíos', () => {
  const [e] = compactar([estacionRaw(7, { ga: '1,459', g95: '' })]);
  assert.equal(e.ga, 1.459);
  assert.equal(e.g95, undefined);
  assert.equal(e.lat, 40.416775);
});

test('agregarCSV calcula medias y recuentos por municipio y leerCSV lo recupera', () => {
  const est = compactar([estacionRaw(1, { ga: '1,400' }), estacionRaw(2, { ga: '1,600' }), estacionRaw(3, { mi: '9', ga: '1,500' })]);
  const filas = leerCSV(agregarCSV(est));
  const m1 = filas.find((f) => f.id === '1');
  assert.equal(m1.ga, 1.5);
  assert.equal(m1.nga, 2);
  assert.equal(filas.find((f) => f.id === '9').nga, 1);
});

test('actualizar escribe histórico, municipios y foto del día (sin red)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'upd-'));
  const r = await actualizar(null, dir, rawGrande());
  assert.equal(r.fecha, '2026-11-16');
  assert.ok(existsSync(join(dir, 'historico', '2026-11-16.csv')));
  assert.equal(JSON.parse(readFileSync(join(dir, 'actual.json'), 'utf8')).estaciones.length, 8100);
  assert.equal(Object.keys(JSON.parse(readFileSync(join(dir, 'municipios.json'), 'utf8'))).length, 50);
});

test('actualizar con fecha histórica no toca la foto del día', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'upd-'));
  await actualizar('01-10-2026', dir, { ...rawGrande(), Fecha: '01/10/2026 0:00:00' });
  assert.ok(existsSync(join(dir, 'historico', '2026-10-01.csv')));
  assert.ok(!existsSync(join(dir, 'actual.json')));
});

test('actualizar rechaza datos con formato roto', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'upd-'));
  await assert.rejects(actualizar(null, dir, rawCon([estacionRaw(1)])), FormatoError);
});
