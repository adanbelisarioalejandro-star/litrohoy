// Vigilancia: enlaces internos rotos en el sitio generado y disponibilidad del sitio publicado.
// Uso: node scripts/vigilar.mjs dist                 -> enlaces internos rotos
//      node scripts/vigilar.mjs --online https://...  -> el sitio responde (portada, sitemap, ads.txt y 5 páginas)
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { paginas } from './qc.mjs';
import { aviso } from './lib/aviso.mjs';

/** Devuelve [{ desde, a }] con los enlaces internos que no existen en `dir`. */
export function enlacesRotos(dir) {
  const rotos = [];
  const existe = (ruta) => {
    const r = decodeURI(ruta.split(/[?#]/)[0]);
    return existsSync(join(dir, r)) && (!r.endsWith('/') || existsSync(join(dir, r, 'index.html')));
  };
  for (const p of paginas(dir)) {
    const html = readFileSync(p.fichero, 'utf8');
    for (const [, a] of html.matchAll(/\s(?:href|src)="(\/[^"]*)"/g)) {
      if (a.startsWith('//')) continue;
      if (!existe(a)) rotos.push({ desde: p.url, a });
    }
  }
  return rotos;
}

export async function comprobarOnline(base, fetcher = fetch) {
  const fallos = [];
  const get = async (u) => {
    try { const r = await fetcher(u, { signal: AbortSignal.timeout(30000), redirect: 'follow' }); return { ok: r.ok, status: r.status, texto: await r.text() }; }
    catch (e) { return { ok: false, status: e.message, texto: '' }; }
  };
  const portada = await get(base + '/');
  if (!portada.ok || !portada.texto.includes('LitroHoy')) fallos.push(`portada: ${portada.status}`);
  const sm = await get(base + '/sitemap.xml');
  if (!sm.ok) fallos.push(`sitemap.xml: ${sm.status}`);
  const ads = await get(base + '/ads.txt');
  if (!ads.ok) fallos.push(`ads.txt: ${ads.status}`);
  const urls = [...sm.texto.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (let i = 0; i < Math.min(5, urls.length); i++) {
    const u = urls[Math.floor((i * urls.length) / 5)];
    const r = await get(u);
    if (!r.ok) fallos.push(`${u}: ${r.status}`);
  }
  return fallos;
}

if (process.argv[1]?.endsWith('vigilar.mjs')) {
  if (process.argv[2] === '--online') {
    const base = (process.argv[3] ?? process.env.SITE_URL ?? '').replace(/\/$/, '');
    if (!base) { console.log('Sin SITE_URL: se omite la comprobación en línea'); process.exit(0); }
    const fallos = await comprobarOnline(base);
    if (fallos.length) {
      aviso('El sitio no responde bien', fallos.join('\n'), 'Revisa el despliegue en Actions y el estado de GitHub Pages (Settings → Pages). Si el dominio es propio, comprueba los DNS.');
      console.error(fallos.join('\n')); process.exit(1);
    }
    console.log(`En línea: ${base} OK`);
  } else {
    const dir = process.argv[2] ?? 'dist';
    const rotos = enlacesRotos(dir);
    if (rotos.length) {
      const lista = rotos.slice(0, 50).map((r) => `- ${r.desde} → ${r.a}`).join('\n');
      aviso(`${rotos.length} enlaces internos rotos`, lista, 'Corrige la plantilla que genera esos enlaces o vuelve a publicar la página de destino.');
      console.error(lista); process.exit(1);
    }
    console.log('Enlaces internos: 0 rotos');
  }
}
