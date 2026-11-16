// Vista previa en GitHub Pages (usuario.github.io/litrohoy/): añade la ruta base a los enlaces internos de dist/.
// shortcut: reescribe el HTML/JSON/XML ya generado en vez de usar `base` de Astro en los 26 ficheros con enlaces;
// se deja de usar al tener dominio propio (borrar la variable BASE_PATH). Uso: BASE_PATH=/litrohoy node scripts/base.mjs dist
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function conBase(texto, ext, base, site) {
  const b = base.replace(/\/$/, '');
  let t = texto;
  if (site) {
    const s = site.replace(/\/$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`${s}/(?!${b.slice(1)}/)`, 'g'), `${site.replace(/\/$/, '')}${b}/`);
  }
  if (ext === '.html') {
    t = t.replace(/(\s(?:href|src|action)=["'])\/(?![/])/g, `$1${b}/`);
    t = t.replace(/(fetch\(\s*[`'"])\/(?![/])/g, `$1${b}/`);
  }
  if (ext === '.json') t = t.replace(/"\/(?![/])/g, `"${b}/`);
  return t;
}

if (process.argv[1]?.endsWith('base.mjs')) {
  const dir = process.argv[2] ?? 'dist', base = process.env.BASE_PATH, site = process.env.SITE_URL;
  if (!base || base === '/') { console.log('Sin BASE_PATH: no se reescribe nada'); process.exit(0); }
  let n = 0;
  const recorrer = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { recorrer(p); continue; }
      const ext = e.name.slice(e.name.lastIndexOf('.'));
      if (!['.html', '.json', '.xml', '.txt'].includes(ext)) continue;
      const antes = readFileSync(p, 'utf8'), despues = conBase(antes, ext, base, site);
      if (despues !== antes) { writeFileSync(p, despues); n++; }
    }
  };
  recorrer(dir);
  console.log(`Ruta base ${base}: ${n} ficheros reescritos`);
}
