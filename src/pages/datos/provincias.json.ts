// [id, lat, lon] del centro (media de sus gasolineras) de cada provincia, para elegir qué JSON cargar.
import { provincias, media } from '../../lib/datos.mjs';

export function GET() {
  const filas = provincias.map((p) => {
    const g = p.est.filter((e) => e.lat && e.lon);
    return [p.id, +media(g.map((e) => e.lat)).toFixed(3), +media(g.map((e) => e.lon)).toFixed(3)];
  });
  return new Response(JSON.stringify(filas), { headers: { 'Content-Type': 'application/json' } });
}
