// Tarea semanal: escribe INFORME.md (estado, errores, visitas, ingresos) y SIGUIENTE.md (lo que el bot no puede hacer solo).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const D = process.env.DATA_DIR ?? 'data';
const leer = (f, def) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : def);
const eur = (x) => (x == null ? '—' : x.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }));

/** Genera los dos documentos a partir del estado. Pura (testeable). */
export function generar({ hoy, fechaDatos, nEstaciones, municipios, candidatos, qc, met, bloq, retiradas, avisos, env }) {
  const pub = municipios.filter((m) => m.publicada);
  const hace7 = new Date(new Date(hoy) - 7 * 864e5).toISOString().slice(0, 10);
  const nuevos = pub.filter((m) => m.desde && m.desde > hace7);
  const gsc = met?.gsc ?? null;
  const tot = (k) => Object.values(gsc ?? {}).reduce((a, v) => a + (v[k] ?? 0), 0);
  const top = Object.entries(gsc ?? {}).sort((a, b) => b[1].clics - a[1].clics || b[1].impresiones - a[1].impresiones).slice(0, 10);
  const ads = met?.adsense ?? null;

  const informe = `# Informe semanal del bot

_Generado automáticamente el ${hoy}. Datos de precios del ${fechaDatos} (${nEstaciones} estaciones)._

## Páginas
| Concepto | Valor |
|---|---|
| Páginas revisadas por el control de calidad | ${qc?.paginas ?? '—'} |
| Páginas con fallos de calidad | ${qc?.fallos?.length ?? '—'} |
| Municipios publicados | ${pub.length} |
| Municipios nuevos esta semana | ${nuevos.length} |
| Municipios aptos pendientes de publicar | ${candidatos} |
| Municipios bloqueados por el control de calidad | ${Object.keys(bloq).length} |
| Municipios retirados del índice (sin visitas 90 días) | ${retiradas.length} |

${nuevos.length ? `Nuevos: ${nuevos.slice(0, 40).map((m) => m.url).join(', ')}` : ''}

## Errores y avisos
${[...(qc?.fallos ?? []).map((f) => `- QC ${f.url}: ${f.motivos.join('; ')}`), ...(met?.errores ?? []).map((e) => `- Medición: ${e}`), ...(avisos ? [avisos] : [])].join('\n') || 'Sin errores.'}

## Visitas (Search Console, últimos 28 días)
${gsc ? `Clics: **${tot('clics')}** · Impresiones: **${tot('impresiones')}** · Páginas con impresiones: ${Object.keys(gsc).length}

| Página | Clics | Impresiones | Posición media |
|---|---|---|---|
${top.map(([u, v]) => `| ${u} | ${v.clics} | ${v.impresiones} | ${v.posicion ?? '—'} |`).join('\n')}` : 'Search Console aún no conectado (ver PENDIENTE.md).'}

## Ingresos (AdSense, últimos 28 días)
${ads ? `Ingresos estimados: **${eur(ads.total.ingresos)}** · Páginas vistas: ${ads.total.paginas} · Clics: ${ads.total.clics}${ads.nota ? `\n\n_${ads.nota}_` : ''}` : 'AdSense aún no conectado (ver PENDIENTE.md).'}

## Evolución semanal
| Semana | Clics | Impresiones | Ingresos |
|---|---|---|---|
${(met?.historico ?? []).slice(-12).map((h) => `| ${h.fecha} | ${h.clics} | ${h.impresiones} | ${eur(h.ingresos)} |`).join('\n') || '| — | — | — | — |'}
`;

  const tareas = [];
  if (!env.SITE_URL) tareas.push('**Dominio y despliegue**: el sitio aún no tiene dominio ni despliegue activos. Sigue PENDIENTE.md.');
  if (!env.PUBLIC_ADSENSE_ID) tareas.push('**AdSense**: solicitar la aprobación del sitio y definir la variable PUBLIC_ADSENSE_ID (PENDIENTE.md).');
  else if (!env.PUBLIC_ADSENSE_SLOT) tareas.push('**AdSense**: crear un bloque de anuncios adaptable y definir PUBLIC_ADSENSE_SLOT.');
  if (!gsc) tareas.push('**Search Console**: conectarlo (solo lectura) para que el bot mida visitas y mejore páginas.');
  if (!ads && env.PUBLIC_ADSENSE_ID) tareas.push('**AdSense API**: conectar la lectura de ingresos (solo lectura).');
  // títulos mejorables: muchas impresiones, buena posición, CTR bajo
  const ctrBajo = Object.entries(gsc ?? {}).filter(([, v]) => v.impresiones >= 200 && v.posicion && v.posicion <= 10 && v.clics / v.impresiones < 0.01).slice(0, 10);
  if (ctrBajo.length) tareas.push(`**Revisar títulos y descripciones** de páginas que salen en el top 10 pero casi no reciben clics: ${ctrBajo.map(([u]) => u).join(', ')}`);
  const bl = Object.entries(bloq);
  if (bl.length) tareas.push(`**Municipios bloqueados por calidad** (${bl.length}): revisar si la plantilla necesita más datos. Ejemplos: ${bl.slice(0, 5).map(([, b]) => `${b.url} (${b.motivo})`).join('; ')}`);
  if (candidatos === 0) tareas.push('**Crecimiento**: ya no quedan municipios aptos. Siguiente tipo de página que merece la pena: comparativas entre municipios vecinos o páginas por gasolinera (valorar tras la aprobación de AdSense).');
  tareas.push('**Ideas que necesitan decisión humana**: (1) páginas por gasolinera solo para las que tengan histórico propio suficiente; (2) avisos de bajada de precio por correo (necesita un servicio de envío, con coste); (3) enlaces desde foros o asociaciones de conductores (difusión manual, nunca compra de enlaces).');

  const siguiente = `# Siguiente: mejoras que el bot no puede hacer solo

_Actualizado automáticamente el ${hoy}, por orden de impacto en ingresos (visitas reales × valor de los anuncios)._

${tareas.map((t, i) => `${i + 1}. ${t}`).join('\n')}
`;
  return { informe, siguiente };
}

if (process.argv[1]?.endsWith('informe.mjs')) {
  const { municipios, motivosNoApta, FECHA, estaciones } = await import('../src/lib/datos.mjs');
  const bloq = leer(`${D}/bloqueadas.json`, {});
  const { informe, siguiente } = generar({
    hoy: new Date().toISOString().slice(0, 10), fechaDatos: FECHA, nEstaciones: estaciones.length, municipios,
    candidatos: municipios.filter((m) => !m.publicada && !bloq[m.id] && !motivosNoApta(m).length).length,
    qc: leer(`${D}/qc.json`, null), met: leer(`${D}/metricas.json`, null), bloq, retiradas: leer(`${D}/retiradas.json`, []),
    avisos: existsSync('aviso.md') ? readFileSync('aviso.md', 'utf8') : '', env: process.env,
  });
  writeFileSync('INFORME.md', informe);
  writeFileSync('SIGUIENTE.md', siguiente);
  console.log('INFORME.md y SIGUIENTE.md actualizados');
}
