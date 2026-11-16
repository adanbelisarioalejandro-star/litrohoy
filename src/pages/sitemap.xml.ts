import { provincias, comunidades, marcas, municipiosPublicados, carreterasPublicadas, FECHA } from '../lib/datos.mjs';
import { GUIAS } from '../lib/guias.mjs';

export function GET({ site }: { site: URL }) {
  const base = site.href.replace(/\/$/, '');
  const urls: [string, string][] = [
    ...['/', '/buscador/', '/gasolineras/', '/marcas/', '/informe-semanal/'].map((u) => [u, FECHA] as [string, string]),
    ...provincias.map((p) => [p.url, FECHA] as [string, string]),
    ...comunidades.filter((c) => !c.uni).map((c) => [c.url, FECHA] as [string, string]),
    ...marcas.map((m) => [m.url, FECHA] as [string, string]),
    ...municipiosPublicados.filter((m) => !m.retirada).map((m) => [m.url, FECHA] as [string, string]),
    ...(carreterasPublicadas.length ? ['/carreteras/', ...carreterasPublicadas.map((c) => c.url)] : []).map((u) => [u, FECHA] as [string, string]),
    ['/guias/', GUIAS.map((g) => g.revisada).sort().at(-1)!],
    ...GUIAS.map((g) => [`/guias/${g.slug}/`, g.revisada] as [string, string]),
    ...['/sobre/', '/metodologia/', '/contacto/'].map((u) => [u, '2026-11-16'] as [string, string]),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(([u, d]) => `<url><loc>${base}${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
