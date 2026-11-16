// Tarea semanal: lee visitas/posiciones (Search Console) e ingresos (AdSense). SOLO LECTURA.
// Sin credenciales no hace nada (el resto del bot sigue funcionando).
// Secretos (GitHub → Settings → Secrets):
//   GSC_CREDENTIALS  JSON de una cuenta de servicio añadida a Search Console con permiso restringido (lectura)
//   GSC_SITE         p. ej. "sc-domain:litrohoy.com"
//   ADSENSE_CLIENT_ID, ADSENSE_CLIENT_SECRET, ADSENSE_REFRESH_TOKEN  OAuth con scope adsense.readonly
// Nunca usa scopes de escritura: el bot no puede tocar cobros ni ajustes.
import { createSign } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const D = process.env.DATA_DIR ?? 'data';
export const SCOPE_GSC = 'https://www.googleapis.com/auth/webmasters.readonly';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** JWT firmado (RS256) para el flujo de cuenta de servicio de Google. */
export function jwtCuentaServicio(cred, scope, ahora = Math.floor(Date.now() / 1000)) {
  const datos = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: cred.client_email, scope, aud: cred.token_uri ?? 'https://oauth2.googleapis.com/token', iat: ahora, exp: ahora + 3600 })}`;
  return `${datos}.${createSign('RSA-SHA256').update(datos).sign(cred.private_key, 'base64url')}`;
}

async function token(body) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`token: ${r.status} ${j.error ?? ''} ${j.error_description ?? ''}`);
  return j.access_token;
}

const dia = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

/** Filas de Search Console (dimensión page) -> { ruta: { clics, impresiones, posicion } } */
export function porRuta(filas) {
  const o = {};
  for (const r of filas ?? []) {
    const ruta = new URL(r.keys[0]).pathname;
    o[ruta] = { clics: r.clicks, impresiones: r.impressions, posicion: +r.position.toFixed(1) };
  }
  return o;
}

async function gsc() {
  const cred = JSON.parse(process.env.GSC_CREDENTIALS);
  const site = process.env.GSC_SITE;
  const t = await token({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwtCuentaServicio(cred, SCOPE_GSC) });
  const q = async (desde) => {
    const r = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: dia(desde), endDate: dia(3), dimensions: ['page'], rowLimit: 25000 }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`Search Console: ${r.status} ${j.error?.message ?? ''}`);
    return porRuta(j.rows);
  };
  const s28 = await q(31), s90 = await q(93);
  const out = {};
  for (const [ruta, v] of Object.entries(s90)) out[ruta] = { ...(s28[ruta] ?? { clics: 0, impresiones: 0, posicion: null }), imp90: v.impresiones, clics90: v.clics };
  return out;
}

async function adsense() {
  const t = await token({ grant_type: 'refresh_token', client_id: process.env.ADSENSE_CLIENT_ID, client_secret: process.env.ADSENSE_CLIENT_SECRET, refresh_token: process.env.ADSENSE_REFRESH_TOKEN });
  const get = async (u) => { const r = await fetch(u, { headers: { Authorization: `Bearer ${t}` } }); const j = await r.json(); if (!r.ok) throw new Error(`AdSense: ${r.status} ${j.error?.message ?? ''}`); return j; };
  const cuentas = await get('https://adsense.googleapis.com/v2/accounts');
  const cuenta = cuentas.accounts?.[0]?.name;
  if (!cuenta) throw new Error('AdSense: no hay cuentas accesibles');
  const base = `https://adsense.googleapis.com/v2/${cuenta}/reports:generate?dateRange=LAST_28_DAYS&metrics=ESTIMATED_EARNINGS&metrics=PAGE_VIEWS&metrics=CLICKS`;
  const tot = await get(base);
  const c = tot.totals?.cells ?? [];
  const res = { total: { ingresos: +(c[0]?.value ?? 0), paginas: +(c[1]?.value ?? 0), clics: +(c[2]?.value ?? 0) }, paginas: {} };
  try { // desglose por URL (si la API no lo permite para la cuenta, se queda en totales)
    const pu = await get(`${base}&dimensions=PAGE_URL`);
    for (const row of pu.rows ?? []) { const [u, ing, pv] = row.cells.map((x) => x.value); try { res.paginas[new URL(u).pathname] = { ingresos: +ing, vistas: +pv }; } catch {} }
  } catch (e) { res.nota = `sin desglose por página: ${e.message}`; }
  return res;
}

if (process.argv[1]?.endsWith('medir.mjs')) {
  const f = `${D}/metricas.json`;
  const prev = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : { historico: [] };
  const m = { fecha: dia(0), gsc: null, adsense: null, errores: [], historico: prev.historico ?? [] };
  if (process.env.GSC_CREDENTIALS && process.env.GSC_SITE) {
    try { m.gsc = await gsc(); } catch (e) { m.errores.push(e.message); }
  } else m.errores.push('Search Console no conectado (faltan GSC_CREDENTIALS/GSC_SITE)');
  if (process.env.ADSENSE_REFRESH_TOKEN) {
    try { m.adsense = await adsense(); } catch (e) { m.errores.push(e.message); }
  } else m.errores.push('AdSense no conectado (falta ADSENSE_REFRESH_TOKEN)');
  const sum = (k) => Object.values(m.gsc ?? {}).reduce((a, v) => a + (v[k] ?? 0), 0);
  m.historico.push({ fecha: m.fecha, clics: sum('clics'), impresiones: sum('impresiones'), ingresos: m.adsense?.total.ingresos ?? null });
  m.historico = m.historico.slice(-104);
  writeFileSync(f, JSON.stringify(m, null, 1) + '\n');
  console.log(`Métricas: GSC ${m.gsc ? Object.keys(m.gsc).length + ' páginas' : 'no'}, AdSense ${m.adsense ? m.adsense.total.ingresos + ' €' : 'no'}${m.errores.length ? ' · ' + m.errores.join(' · ') : ''}`);
}
