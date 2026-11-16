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
