# LitroHoy: contexto para futuras sesiones

Sitio estático en español con los precios oficiales de carburantes por municipio en España (datos del MITECO), monetizado con AdSense, y un bot en GitHub Actions que lo actualiza, amplía, vigila, mide y mejora solo. **Prioridad única: visitas reales × valor de los anuncios.** Las decisiones y sus motivos están en `DECISIONES.md`.

## Antes de nada
- Lee `SIGUIENTE.md` (mejoras pendientes que el bot no puede hacer solo, ordenadas por prioridad) e `INFORME.md` (estado de la última semana).
- `PENDIENTE.md` recoge lo que tiene que hacer el usuario (cuentas, dinero, datos personales). **Nunca** crees cuentas, pagues, toques datos de cobro de AdSense ni metas datos personales sin su "sí" explícito.
- Sin secretos en el repo: van en GitHub Secrets/Variables (`.env` está en `.gitignore`).

## Comandos
```
npm run update     # descarga los precios de hoy (+ el día exacto de hace 1 año si falta) -> data/
npm run dev        # servidor local
npm run build      # astro build + control de calidad (scripts/qc.mjs)
npm test           # tests (node:test, sin red)
BASE_PATH=/litrohoy node scripts/base.mjs dist   # vista previa en github.io (lo hace el bot si existe la variable)
node scripts/expand.mjs           # publicar hasta 40 municipios nuevos aptos
node scripts/vigilar.mjs dist     # enlaces internos rotos
node scripts/informe.mjs          # regenera INFORME.md y SIGUIENTE.md
```
`data/actual.json` no se versiona: ejecuta `npm run update` antes del primer build.

## Cómo está montado
- `scripts/lib/fuente.mjs`: API oficial (`EstacionesTerrestres` y `EstacionesTerrestresHist/DD-MM-AAAA`), `validar()` (detecta cambios de formato y lanza `FormatoError`), `compactar()` y `agregarCSV()`.
- `data/historico/AAAA-MM-DD.csv`: media y nº de estaciones por municipio y carburante (g95, ga, g98, gp, glp, gb). Hay 90 días diarios y el día 1 de cada mes desde nov-2024, más el día exacto de hace un año. Todo es **dato oficial descargado; nada estimado.**
- `data/publicadas.json` (municipios publicados y fecha), `bloqueadas.json` (los que quitó el QC, 28 días), `retiradas.json` (noindex por no tener impresiones en 90 días), `metricas.json` (GSC/AdSense), `qc.json`.
- `src/lib/datos.mjs`: carga y agrega todo para el build (stats, series, variaciones solo con un dato real a 3 días o menos, `direccion()`, `nombreMunicipio()`, criterios de calidad `motivosNoApta`).
- Páginas: `/` · `/gasolineras/` (ranking) · `/gasolineras/{prov}/` · `/gasolineras/{prov}/{mun}/` (solo publicados) · `/comunidad/{ccaa}/` (solo CCAA de varias provincias; las uniprovinciales apuntan a su provincia) · `/marcas/` y `/marca/{m}/` (25 o más estaciones con gasolina o diésel) · `/buscador/` (geolocalización o provincia, con `/datos/{prov}.json`) · `/carreteras/` y `/carretera/{via}/` (AP/A/N con km en la dirección oficial, 8+ gasolineras, 10 por semana) · `/informe-semanal/` · `/portugal/` (Boletín Petrolero UE, `scripts/europa.mjs` → `data/europa.json`) · `/guias/` (12 guías en `src/pages/guias/*.astro`, índice en `src/lib/guias.mjs`) · legales.
- Componentes: `Mapa` (Leaflet en `public/vendor/`, carga al pulsar), `Anuncio` (sin `PUBLIC_ADSENSE_ID` y `PUBLIC_ADSENSE_SLOT` no pinta nada; máximo 3 por página y siempre después del contenido), `Grafico` (SVG en el build), `TablaEstaciones`, `Calculadora`, `Fuente` (fuente y fecha obligatorias en cada página de datos), `Migas`, `Guia`.
- Consentimiento: la CMP de Google (Privacidad y mensajes de AdSense, certificada TCF). No hay banner propio. Sin anuncios, el sitio no instala ninguna cookie.

## Bot (`.github/workflows/bot.yml`, diario a las 07:17 UTC)
Cada día: tests → update → build → QC (`--corregir` despublica los municipios que fallan y reconstruye) → enlaces → commit de data → deploy en Pages → comprobación en línea. Los lunes, además: medir (solo lectura) → mejorar → ampliar → informe. Si algo falla, abre o comenta un issue con la etiqueta `bot` y el contenido de `aviso.md`.

## Reglas de contenido (no negociables)
- Nada de texto de relleno generado en masa ni de páginas puerta: cada frase de una página de datos sale de sus números reales y, si no hay datos suficientes, la página no se publica.
- Crecimiento gradual: como máximo 40 municipios por semana, y solo si pasan el QC (3 o más gasolineras con precio, 14 o más días de histórico, similitud menor de 0,9).
- Impuestos: nunca escribas tipos a mano en una guía. Están por fecha en `data/fiscalidad.json` (`src/lib/fiscal.mjs`); el bot avisa (issue `fiscal`) cuando una rebaja caduca, y el QC falla si la diferencia de impuestos gasóleo A − B no cuadra con la real.
- Las guías citan sus fuentes oficiales. Cualquier cifra nueva hay que contrastarla con el BOE, el MITECO, la DGT o el IDAE antes de publicarla.
- Antes de dar algo por hecho: `npm test`, `npm run build` (QC sin fallos) y `node scripts/vigilar.mjs dist`, y revisa en el navegador a 390 px.
