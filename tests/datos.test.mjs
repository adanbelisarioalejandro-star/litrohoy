import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearDatos } from './fixture.mjs';

process.env.DATA_DIR = crearDatos();
const d = await import('../src/lib/datos.mjs');

test('direcciones de la fuente se normalizan', () => {
  const casos = {
    'CALLE CALLE DE LADERA DE LOS ALMENDROS, 34': 'Calle de Ladera de los Almendros, 34',
    'CALLE JOSE PAULETE,': 'Calle Jose Paulete',
    'CARRETERA N-III KM. 11,8': 'Carretera N-III km 11,8',
    'CALLE E, 7': 'Calle E, 7',
    'CR A-5, 21': 'Ctra. A-5, km 21',
    'CR A-5, 369,8': 'Ctra. A-5, km 369,8',
    'CARRETERA NACIONAL VKM 19 KM.': 'Carretera Nacional V km 19',
    'NACIONAL VI km 386.200': 'Nacional VI km 386,200',
    'C/ MAYOR S/N': 'Calle Mayor s/n',
    'CAMINO A TOLEDO': 'Camino a Toledo',
  };
  for (const [ent, sal] of Object.entries(casos)) assert.equal(d.direccion(ent), sal, ent);
});

test('nombres de municipio con artículo pospuesto', () => {
  assert.equal(d.nombreMunicipio('Coruña (A)'), 'A Coruña');
  assert.equal(d.nombreMunicipio("Hospitalet de Llobregat (L')"), "L'Hospitalet de Llobregat");
  assert.equal(d.nombreMunicipio('Noáin (Valle de Elorz)'), 'Noáin (Valle de Elorz)');
  assert.equal(d.munPorId['2'].nombre, 'Las Rozas de Madrid');
  assert.equal(d.munPorId['2'].slug, 'las-rozas-de-madrid');
});

test('estadísticas por municipio', () => {
  const m = d.munPorId['1'];
  assert.equal(m.stats.ga.min, 1.4);
  assert.equal(m.stats.ga.barata.r, 'BALLENOIL');
  assert.ok(Math.abs(m.stats.ga.media - 1.45) < 1e-9);
});

test('series históricas salen del CSV oficial y las variaciones exigen un dato real cercano', () => {
  const s = d.serieMunicipio('1', 'ga');
  assert.equal(s.at(-1)[0], '2026-11-16');
  assert.ok(d.variacion(s, 7) < 0); // el fixture baja 1 céntimo al día
  assert.notEqual(d.variacion(s, 365), null); // hay dato de 2025-11-14 (2 días antes del objetivo)
  assert.equal(d.variacion(s, 60), null); // no hay ningún dato cerca de hace 60 días: no se inventa
});

test('control de publicación: datos suficientes y lista de publicadas', () => {
  assert.deepEqual(d.motivosNoApta(d.munPorId['1']), []);
  assert.match(d.motivosNoApta(d.munPorId['3']).join(), /solo 1 gasolinera/);
  assert.match(d.motivosNoApta(d.munPorId['2']).join(), /solo 2 gasolinera.*mínimo 3/); // 2 ya no basta
  assert.deepEqual(d.municipiosPublicados.map((m) => m.id), ['1']); // el 3 está en publicadas pero no es apto
});

test('zona de referencia para uniprovinciales', () => {
  assert.equal(d.provPorId['28'].ref, 'la Comunidad de Madrid');
  assert.equal(d.comunidades.find((c) => c.id === '13').uni, true);
});

test('carreteras: red principal con punto kilométrico, nombres unificados', () => {
  const c = (x) => d.carreteraDe(x);
  assert.deepEqual(c('CARRETERA N-340 KM. 702,1'), { nombre: 'N-340', km: 702.1 });
  assert.deepEqual(c('AUTOVIA E-5/A-4 KM. 357,8'), { nombre: 'A-4', km: 357.8 }); // la europea no cuenta
  assert.equal(c('CARRETERA N-2 KM 30').nombre, 'N-II'); // radiales siempre en romanos
  assert.equal(c('N-II KM 728').nombre, 'N-II');
  assert.equal(c('CTRA. N-VI KM 386.200').km, 386.2);
  assert.equal(c('AUTOVIA A52 KM 292').nombre, 'A-52');
  assert.equal(c('CARRETERA A-315 KM. 90'), null); // autonómica de 3 cifras
  assert.equal(c('AUTOPISTA A6 KM 0'), null); // km 0: dato dudoso
  assert.equal(c('CARRETERA N-340'), null); // sin km no se sabe dónde está
  assert.equal(c('CAMINO A TOLEDO KM 3'), null);
});

test('fiscalidad: fichero válido, tipo vigente por fecha y aviso de caducidad', async () => {
  const f = await import('../src/lib/fiscal.mjs');
  assert.deepEqual(f.validarFiscal(), []);
  const hoy = f.fiscal('2026-11-16');
  assert.ok(hoy.rebaja);
  assert.equal(+hoy.ieh.ga.toFixed(5), 0.179); // 144,99 + 34,01 (RDL 25/2026)
  assert.equal(+hoy.ieh.g95.toFixed(5), 0.27269); // 231,15 + 41,54
  assert.equal(hoy.iva, 21);
  assert.equal(f.fiscal('2026-04-15').iva, 10); // RDL 7/2026
  assert.equal(+f.fiscal('2027-01-05').ieh.ga.toFixed(5), 0.379); // sin rebaja: tipos normales de la Ley 38/1992
  assert.equal(f.estadoFiscal('2026-11-16').aviso, null);
  assert.equal(f.estadoFiscal('2026-12-24').aviso, 'caduca');
  assert.equal(f.estadoFiscal('2027-01-02').aviso, 'caducada');
  const malo = { normal: f.FISCAL.normal, periodos: [{ ...f.FISCAL.periodos[0], hasta: '2026-12-31' }, f.FISCAL.periodos[1]] };
  assert.match(f.validarFiscal(malo).join(), /solapa/);
});

