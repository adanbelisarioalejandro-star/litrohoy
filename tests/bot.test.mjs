import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { elegir, puntuacionProvincias, bloqueadoReciente, cupoSemanal, MAX_SEMANAL } from '../scripts/expand.mjs';
import { revisar, firma, similitud, controlar, tipo } from '../scripts/qc.mjs';
import { enlacesRotos, comprobarOnline } from '../scripts/vigilar.mjs';
import { decidirRetiradas } from '../scripts/mejorar.mjs';
import { porRuta, jwtCuentaServicio, SCOPE_GSC } from '../scripts/medir.mjs';
import { generar } from '../scripts/informe.mjs';
import { conBase } from '../scripts/base.mjs';

const pagina = (url, cuerpo, extra = '') => `<html><head><title>T ${url}</title><meta name="description" content="Descripción suficientemente larga para ${url} con datos reales de precios."><link rel="canonical" href="https://x.es${url}">${extra}</head><body><main><h1>H</h1>${cuerpo}</main></body></html>`;
const texto = (n, semilla = '') => Array.from({ length: n }, (_, i) => `palabra${semilla}${i}`).join(' ');
const datos = (n) => Array.from({ length: n }, (_, i) => `1,${String(400 + i).padStart(3, '0')} €`).join(' ');

test('ampliar: máximo semanal, prioriza provincias con impresiones y respeta bloqueos', () => {
  const cands = Array.from({ length: 100 }, (_, i) => ({ id: String(i), prov: i < 50 ? '28' : '41', url: `/m${i}/`, est: { length: 100 - i } }));
  const puntos = puntuacionProvincias({ gsc: { '/m60/': { impresiones: 500 } } }, cands);
  assert.deepEqual(puntos, { 41: 500 });
  const e = elegir(cands, puntos, MAX_SEMANAL);
  assert.equal(e.length, 40);
  assert.equal(e[0].prov, '41');
  assert.ok(bloqueadoReciente({ 5: { fecha: '2026-11-10' } }, '5', '2026-11-16'));
  assert.ok(!bloqueadoReciente({ 5: { fecha: '2026-09-01' } }, '5', '2026-11-16'));
  // varias ejecuciones en la misma semana no superan el máximo
  const pub = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i), '2026-11-14']));
  assert.equal(cupoSemanal(pub, '2026-11-16'), 10);
  assert.equal(cupoSemanal(pub, '2026-11-20'), 10);
  assert.equal(cupoSemanal(pub, '2026-11-21'), 40); // 7 días después vuelve el cupo completo
  assert.equal(cupoSemanal({ ...pub, n1: '2026-11-16', n2: '2026-11-16', n3: '2026-11-16', n4: '2026-11-16', n5: '2026-11-16', n6: '2026-11-16', n7: '2026-11-16', n8: '2026-11-16', n9: '2026-11-16', n10: '2026-11-16', n11: '2026-11-16' }, '2026-11-16'), 0);
});

test('QC: bloquea páginas de datos sin fuente, con pocos datos o escasas', () => {
  const ok = pagina('/gasolineras/a/b/', `<p class="fuente"><time datetime="2026-11-16">x</time></p><svg class="graf"></svg>${datos(10)} ${texto(300)}`);
  assert.deepEqual(revisar('/gasolineras/a/b/', ok).fallos, []);
  const sinFuente = revisar('/gasolineras/a/b/', pagina('/gasolineras/a/b/', `${datos(10)} ${texto(300)}`));
  assert.match(sinFuente.fallos.join(), /fuente/);
  const pocos = revisar('/gasolineras/a/b/', pagina('/gasolineras/a/b/', `<p class="fuente"><time datetime="2026-11-16">x</time></p><svg class="graf"></svg>${datos(2)} ${texto(300)}`));
  assert.match(pocos.fallos.join(), /datos insuficientes/);
  assert.match(revisar('/guias/x/', pagina('/guias/x/', texto(50))).fallos.join(), /contenido escaso/);
  assert.equal(tipo('/gasolineras/madrid/'), 'datos');
  assert.equal(tipo('/gasolineras/madrid/mostoles/'), 'municipio');
});

test('QC: detecta páginas casi idénticas y títulos duplicados', () => {
  const a = texto(400), b = texto(400, 'x');
  assert.equal(similitud(firma(a), firma(a)), 1);
  assert.ok(similitud(firma(a), firma(b)) < 0.2);
  const dir = mkdtempSync(join(tmpdir(), 'qc-'));
  const cuerpo = `<p class="fuente"><time datetime="2026-11-16">x</time></p><svg class="graf"></svg>${datos(10)} ${a}`;
  for (const u of ['gasolineras/p/uno', 'gasolineras/p/dos']) { mkdirSync(join(dir, u), { recursive: true }); writeFileSync(join(dir, u, 'index.html'), pagina(`/${u}/`, cuerpo)); }
  const res = controlar(dir);
  assert.equal(res.filter((r) => r.fallos.some((f) => f.startsWith('casi idéntica'))).length, 1);
});

test('vigilar: encuentra enlaces internos rotos', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vig-'));
  mkdirSync(join(dir, 'a'));
  writeFileSync(join(dir, 'index.html'), '<a href="/a/">ok</a><a href="/no-existe/">roto</a><a href="https://fuera.es/">ext</a><link href="/favicon.svg">');
  writeFileSync(join(dir, 'a', 'index.html'), '<a href="/">ok</a>');
  writeFileSync(join(dir, 'favicon.svg'), '<svg/>');
  assert.deepEqual(enlacesRotos(dir), [{ desde: '/', a: '/no-existe/' }]);
});

test('vigilar: comprobación en línea con servidor simulado', async () => {
  const resp = (ok, texto) => ({ ok, status: ok ? 200 : 503, text: async () => texto });
  const bien = async (u) => resp(true, u.endsWith('sitemap.xml') ? '<loc>https://x.es/a/</loc>' : 'LitroHoy');
  assert.deepEqual(await comprobarOnline('https://x.es', bien), []);
  const caido = async () => resp(false, '');
  assert.ok((await comprobarOnline('https://x.es', caido)).length >= 3);
});

test('medir: JWT de cuenta de servicio válido y solo lectura; filas de Search Console por ruta', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwt = jwtCuentaServicio({ client_email: 'bot@x.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }, SCOPE_GSC, 1000);
  const [h, p, s] = jwt.split('.');
  assert.ok(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, s, 'base64url'));
  const claims = JSON.parse(Buffer.from(p, 'base64url'));
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/webmasters.readonly');
  assert.equal(claims.exp, 4600);
  assert.deepEqual(porRuta([{ keys: ['https://x.es/a/'], clicks: 2, impressions: 50, position: 7.234 }]), { '/a/': { clics: 2, impresiones: 50, posicion: 7.2 } });
});

test('mejorar: retira tras 90 días sin impresiones y reincorpora si vuelven', () => {
  const muns = [{ id: '1', url: '/a/', desde: '2026-01-01' }, { id: '2', url: '/b/', desde: '2026-11-01' }, { id: '3', url: '/c/', desde: '2026-01-01' }];
  const r = decidirRetiradas(muns, { '/c/': { imp90: 4 } }, ['3'], '2026-11-16');
  assert.deepEqual([...r].sort(), ['1']);
});

test('informe: refleja páginas, errores y tareas pendientes', () => {
  const { informe, siguiente } = generar({
    hoy: '2026-11-16', fechaDatos: '2026-11-16', nEstaciones: 11505,
    municipios: [{ id: '1', url: '/a/', publicada: true, desde: '2026-11-15' }, { id: '2', url: '/b/', publicada: false }],
    candidatos: 1, qc: { paginas: 10, fallos: [{ url: '/x/', motivos: ['contenido escaso'] }] },
    // CTR 0,3 % en el top 10 -> debe sugerir revisar el título
    met: { gsc: { '/a/': { clics: 1, impresiones: 300, posicion: 4 } }, adsense: { total: { ingresos: 1.5, paginas: 100, clics: 2 } }, errores: [], historico: [] },
    bloq: {}, retiradas: [], avisos: '', env: {},
  });
  assert.match(informe, /Municipios nuevos esta semana \| 1/);
  assert.match(informe, /QC \/x\/: contenido escaso/);
  assert.match(informe, /1,50\s€/); // toLocaleString usa espacio irrompible
  assert.match(siguiente, /Dominio y despliegue/);
  assert.match(siguiente, /Revisar títulos/);
});

test('vista previa: añade la ruta base a enlaces internos, fetch, JSON y URL absolutas, sin tocar externos', () => {
  const S = 'https://u.github.io';
  const html = `<a href="/gasolineras/">x</a><link href="/_astro/a.css"><a href="https://fuera.es/">e</a><a href="//cdn.x/">c</a><script>fetch(\`/datos/\${id}.json\`);fetch('/datos/provincias.json')</script><link rel="canonical" href="${S}/marcas/"><a href="${S}/litrohoy/ya/">y</a>`;
  assert.equal(conBase(html, '.html', '/litrohoy', S),
    `<a href="/litrohoy/gasolineras/">x</a><link href="/litrohoy/_astro/a.css"><a href="https://fuera.es/">e</a><a href="//cdn.x/">c</a><script>fetch(\`/litrohoy/datos/\${id}.json\`);fetch('/litrohoy/datos/provincias.json')</script><link rel="canonical" href="${S}/litrohoy/marcas/"><a href="${S}/litrohoy/ya/">y</a>`);
  assert.equal(conBase('[["Repsol","C/ Mayor",1.5,"/gasolineras/a/b/"]]', '.json', '/litrohoy/', S), '[["Repsol","C/ Mayor",1.5,"/litrohoy/gasolineras/a/b/"]]');
  assert.equal(conBase(`<loc>${S}/a/</loc>`, '.xml', '/litrohoy', S), `<loc>${S}/litrohoy/a/</loc>`);
});
