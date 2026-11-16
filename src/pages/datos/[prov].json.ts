// Datos compactos por provincia para el buscador (se cargan bajo demanda en el navegador).
import { provincias, munPorId, titulo } from '../../lib/datos.mjs';

export function getStaticPaths() {
  return provincias.map((p) => ({ params: { prov: p.id } }));
}
export function GET({ params }: { params: { prov: string } }) {
  const p = provincias.find((x) => x.id === params.prov)!;
  const filas = p.est.filter((e) => e.lat && e.lon).map((e) => {
    const m = munPorId[e.mi];
    return [e.r.length <= 3 ? e.r : titulo(e.r), titulo(e.d), e.m, e.lat, e.lon, e.g95 ?? 0, e.ga ?? 0, e.g98 ?? 0, e.glp ?? 0,
      m?.publicada ? m.url : null];
  });
  return new Response(JSON.stringify(filas), { headers: { 'Content-Type': 'application/json' } });
}
