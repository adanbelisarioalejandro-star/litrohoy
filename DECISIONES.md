# Decisiones del proyecto

Cada decisión técnica, con su motivo. Criterio único para priorizar: **ingresos por publicidad = visitas reales × valor de los anuncios**.

## 1. Nicho: precios de carburantes por municipio en España

Evalué 5 nichos con datos públicos y gratuitos (puntuación de 1 a 5; valor publicitario con peso doble):

| Nicho (fuente) | Licencia | Páginas útiles | Demanda | Competencia (5 = poca) | Motivo para volver | Valor anuncios (×2) | Total |
|---|---|---|---|---|---|---|---|
| **Carburantes por municipio** (MITECO, API REST Geoportal) | 5: reutilización libre citando la fuente | 5: unos 3.250 municipios con gasolinera, 52 provincias, 19 CCAA y más de 25 marcas | 5: "gasolineras baratas en X" se busca a diario | 2: hay varios comparadores grandes | 5: el precio cambia cada día | 4 (motor, seguros de coche, energía) ×2 = 8 | **30** |
| Precio de la luz PVPC por horas (REE apidatos) | 5 | 1: una página por día; no hay páginas locales | 5 | 1: muy saturado | 5 | 5×2 = 10 | 27 |
| Calendario laboral y festivos locales (BOE y boletines autonómicos) | 4 | 5: más de 8.000 municipios | 4: picos en diciembre y enero | 2 | 2: una vez al año | 2×2 = 4 | 21 |
| Tiempo y clima municipal (AEMET OpenData) | 4: exige clave de API | 5 | 5 | 1: AEMET y grandes medios | 5 | 1×2 = 2 | 22 |
| Precio de la vivienda y alquiler (INE IPV, índice de alquiler del MIVAU) | 5 | 3: datos anuales o trimestrales | 4 | 2 | 1 | 5×2 = 10 | 25 |

**Por qué gano carburantes:**
- Es el único que junta tres cosas: muchas páginas locales con datos propios, datos que cambian cada día (la gente vuelve y Google vuelve a rastrear) y anunciantes que pagan bien (seguros de coche, renting, tarjetas de carburante, energía, talleres).
- La API oficial también da el histórico por fecha (`EstacionesTerrestresHist/DD-MM-AAAA`). Por eso cada página tiene evolución y gráficos reales desde el primer día, no solo la foto de hoy.
- La luz da más por clic, pero solo permite unas pocas páginas, y además no hay nada local que la diferencie de la competencia.

**Licencia:** los datos son información del sector público reutilizable (Ley 37/2007 y catálogo de datos.gob.es). Hay que citar la fuente y la fecha de actualización, y no desnaturalizar los datos. Todas las páginas muestran «Fuente: Ministerio para la Transición Ecológica y el Reto Demográfico — Geoportal de Hidrocarburos» y la fecha.

## 2. Qué páginas existen (y cuáles no, a propósito)

- **Sí:** portada nacional, 19 CCAA, 52 provincias, municipios con al menos 3 gasolineras con precio y datos suficientes, marcas con al menos 25 estaciones, y de 10 a 15 guías.
- **No, al menos de momento: una página por gasolinera** (unas 11.500). Serían casi iguales entre sí, con riesgo de «contenido escaso» y de «abuso de contenido a escala» en la política de spam de Google, y eso pone en peligro la aprobación de AdSense. La gasolinera aparece en la tabla de su municipio. Se volverá a valorar cuando AdSense esté aprobado (está en SIGUIENTE.md).
- **Lanzamiento gradual:** al principio solo se publican los municipios con 10 o más gasolineras (unos 225). Cada semana el bot añade como máximo 40 municipios nuevos que pasen el control de calidad. Así se evita un salto masivo de páginas.

## 3. Tecnología

- **Astro (salida estática)**: genera HTML puro sin JavaScript por defecto, con lo que el LCP y el CLS son mínimos (Core Web Vitals en verde). Solo usa la dependencia oficial `astro`.
- **Gráficos en SVG generados en el build**: sin librerías de gráficos, sin JS y sin peso extra.
- **Herramientas interactivas** (buscador por cercanía y calculadora de ahorro) escritas en JS vanilla, en línea y pequeñas. El buscador carga solo el JSON de la provincia que se elige.
- **Scripts del bot en Node sin dependencias** (`fetch` y `node:test` nativos). Hay menos superficie de ataque y nada que mantener.
- **Histórico guardado como CSV diario agregado por municipio** (`data/historico/AAAA-MM-DD.csv`, unos 115 KB). Solo se añaden ficheros nuevos, así que git lo comprime bien y los diffs son legibles. La foto completa de estaciones (`data/actual.json`, unos 2,6 MB) no se versiona: se descarga en cada build, para que el repositorio no crezca unos 100 MB al año.
- **Hosting: GitHub Pages** desplegado con GitHub Actions. Es gratis, no necesita más cuentas ni tokens (usa el `GITHUB_TOKEN` del propio workflow) y admite dominio propio. Requiere que el repositorio sea público, lo cual está bien: no hay secretos en el código. Cloudflare Pages era la alternativa, pero añade una cuenta y un token de API.
- **El bot es un único workflow** (`bot.yml`) con cron diario. Los lunes ejecuta además las tareas semanales (ampliar, medir, mejorar e informar). Los commits diarios de datos mantienen el repositorio activo; GitHub desactiva los cron tras 60 días sin actividad.

## 4. Anuncios y consentimiento (según la documentación oficial consultada el 16-11-2026)

- **Políticas del programa AdSense** (answer/48182): nada de anuncios en páginas sin contenido, nada de anuncios que parezcan menús o enlaces, no pedir clics y no usar flechas hacia los anuncios. El componente `Anuncio` lleva la etiqueta «Publicidad», reserva altura para no causar CLS y no se coloca nunca antes del contenido principal: como máximo 3 por página, siempre después de los datos.
- **EEE: CMP certificada con TCF** (answer/13554116): desde el 16-01-2024 hace falta una CMP certificada para mostrar anuncios personalizados. Se usa **la CMP de Google** (Privacidad y mensajes de AdSense, ID TCF 300), que es gratis y la despliega la propia etiqueta de AdSense. Un banner hecho a mano no estaría certificado. El pie incluye el enlace de revocación oficial (`googlefc.showRevocationMessage`).
- **ads.txt** (answer/12169212): `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`. Se genera en el build a partir de `PUBLIC_ADSENSE_ID`. Sin ese ID no se carga ningún script de anuncios.
- **Sin analítica con cookies**: Search Console no necesita cookies. Mientras no haya anuncios, el sitio no instala ninguna cookie.
- **Dominio propio necesario**: AdSense exige ser propietario del sitio, y los subdominios gratuitos (`*.github.io`) no se suelen aprobar. Cuesta dinero, así que va en PENDIENTE.md y necesita tu OK.

## 5. Contenido y spam (políticas de spam de Google Search)

- Nada de texto generado en masa: los textos de las páginas de datos son frases construidas **a partir de los números reales** de ese municipio (diferencia con la provincia, la más barata, la tendencia de 30 días). Si no hay datos, la página no se publica.
- Contra las páginas puerta: cada municipio tiene su lista real de gasolineras, su histórico y su comparativa, y todo está dentro de una jerarquía navegable (CCAA, provincia, municipio).
- El control de calidad (`scripts/qc.mjs`) bloquea las páginas con pocos datos o con una similitud de texto de 0,9 o más con otra (Jaccard sobre trigramas de palabras).

## 6. Bot: medición y mejora

- **Search Console**: con una cuenta de servicio de Google Cloud con permiso de *solo lectura* en la propiedad (scope `webmasters.readonly`).
- **AdSense Management API**: no admite cuentas de servicio, así que usa OAuth de usuario con scope `adsense.readonly`. El refresh token se guarda como secreto de GitHub. Las dos cosas necesitan tu OK.
- **Mejora**: los municipios publicados hace más de 90 días con 0 impresiones pasan a `noindex` y salen del sitemap (`data/retiradas.json`). El orden de ampliación da prioridad a las provincias cuyas páginas tienen más impresiones.

## 7. Decisiones tomadas durante la revisión
- **Variaciones solo con dato oficial cercano**: una variación (7 días, 30 días o 1 año) solo se muestra si hay un dato oficial como mucho 3 días antes de la fecha objetivo. Para la variación anual, el bot descarga cada día el histórico exacto de hace 365 días. Motivo: no mostrar nunca cifras aproximadas como si fueran exactas.
- **Sin página propia para las CCAA de una sola provincia** (Madrid, Asturias, Murcia, etc.): duplicaban la página provincial, y el QC lo detectó como título duplicado. Su enlace apunta a la provincia y en los textos se nombran como «la Comunidad de Madrid».
- **Nombres y direcciones normalizados para mostrarlos**: «Coruña (A)» pasa a «A Coruña», se expanden abreviaturas (CR a Ctra.), se marcan los puntos kilométricos, etc. Si la fuente trae un dato dudoso (por ejemplo, «km 283»), se muestra tal cual: corregirlo sería inventar.
- **Las gasolineras sin precio de los carburantes de la tabla** se muestran al final, marcadas «Sin precio publicado», y no cuentan en el número de gasolineras con precio.
- **Marca con página propia**: 25 o más estaciones *con precio de gasolina o diésel* (Molgas, por ejemplo, solo vende gas y quedaba vacía).
- **Identidad de git neutra** (`LitroHoy <litrohoy@users.noreply.github.com>`), configurada solo en este repositorio, para no publicar tu correo en un repositorio público. Puedes cambiarla con `git config user.email`.
- **Nombre de marca LitroHoy**: corto y descriptivo, sin marcas registradas de terceros. El dominio litrohoy.com estaba libre el 16-11-2026 según RDAP.
- **Mínimo de 3 gasolineras con precio por municipio** (antes 2): con 2 la página apenas compara nada y se acerca al contenido escaso. Al subirlo no hubo que despublicar ninguno de los 265 municipios publicados (todos tenían 3 o más).
- **Actions fijadas por SHA de commit** (checkout v7.0.1, setup-node v7.1.0, upload-pages-artifact v5.0.0, deploy-pages v5.0.1), todas con runtime Node 24, y el build con Node 24 LTS. Fijar por SHA impide que un cambio en una action (o una etiqueta movida) entre en el bot sin revisión; el comentario indica la versión para actualizarla a mano.
- **Vista previa en github.io antes del dominio** (`BASE_PATH=/litrohoy`): `scripts/base.mjs` añade la ruta base a los enlaces del sitio ya generado, en vez de reescribir los 26 ficheros con enlaces para usar `base` de Astro; desaparece al borrar `BASE_PATH`. Con `BASE_PATH` todas las páginas llevan `noindex, follow` y el control de calidad revisa también las páginas noindex (si no, no revisaría ninguna).
- **Cupo semanal real**: `expand.mjs` publica como máximo 40 menos lo publicado en los 7 días anteriores. Antes, cada ejecución semanal manual añadía 40 más (el 16-11-2026 se publicaron dos tandas; se retiró la segunda antes de desplegar nada).

## 8. Mejoras para diferenciarse (16-11-2026)
- **Mapa por municipio y carretera**: Leaflet 1.9.4 (BSD-2) alojado en `public/vendor/` y teselas de OpenStreetMap. No se descarga nada hasta pulsar «Mostrar mapa»: cero impacto en LCP/CLS (altura reservada) y ningún dato enviado a OSM sin acción del usuario (explicado en Privacidad). Coordenadas oficiales del Ministerio; color por tercil de precio. Si el tráfico crece mucho, la política de uso de teselas de OSM pide pasar a un proveedor propio o de pago: revisar entonces.
- **Páginas por carretera**: solo AP-, A-1…A-99 y N-, y solo gasolineras cuya dirección oficial da el punto kilométrico (las A- de 3 cifras son autonómicas; km 0 se descarta por ser relleno habitual; N-2 = N-II). Mínimo 8 gasolineras con precio; 50 aptas, se publican 10 por semana con el mismo QC (si falla se despublica y bloquea 28 días, como los municipios). Se añade el margen (D/I) de la API.
- **Informe semanal** (`/informe-semanal/`): una sola página recalculada en cada build con el histórico oficial (variación a 7 días por provincia, marcas más baratas, ahorro medio = media local − más barata en municipios con 3+ gasolineras). Una página viva en lugar de una por semana: evita páginas casi iguales.
- **Portugal**: la DGEG no publica sus precios con licencia abierta (exige un acuerdo formal), así que se usa el **Boletín Petrolero de la Comisión Europea** (CC BY 4.0, «reproduction is authorised provided the source is acknowledged»), que solo da medias nacionales semanales. Para no mezclar metodologías (el boletín es una media ponderada de precios más frecuentes; nuestras páginas, la media simple de estaciones), se compara Portugal con España con el boletín y las provincias de frontera con la media española del Ministerio. Si el boletín falla, solo avisa y se mantiene la última semana.

## 9. Fiscalidad por fecha y correcciones de las guías (16-11-2026)
- **Tipos vigentes en `data/fiscalidad.json`**: tipo normal (Ley 38/1992 y 21 % de IVA) y cada periodo de rebaja con su norma y enlace al BOE: RDL 7/2026 (22-3 a 30-6, IVA 10 %), RDL 18/2026 (julio, agosto y septiembre, cada mes con su tipo) y RDL 25/2026 (1-10 a 31-12). Las cláusulas de salvaguarda se han resuelto con el IPC por subclases del INE (API oficial): en noviembre y diciembre de 2026 se aplica la rebaja máxima de 20 céntimos a gasolina y gasóleo. Las guías leen el régimen de la fecha de los datos (`src/lib/fiscal.mjs`): cuando una rebaja termina sin prórroga, vuelven solas al tipo normal, que es lo que dice la ley.
- **El bot comprueba el fichero cada día** (`scripts/fiscal.mjs`): si está mal formado, falla; si la rebaja vigente caduca en 10 días o menos, o ha caducado hace menos de 45 días, abre un issue con la etiqueta `fiscal` (uno solo, no uno al día) para revisar el BOE.
- **Control de coherencia en el QC**: la guía de gasóleo B publica en el HTML la diferencia de impuestos A − B con IVA y la mediana real de precios A − B en las gasolineras que venden los dos; si se separan más de 0,06 €/l, el QC falla. Con los tipos rebajados de hoy: 0,191 frente a 0,173 €/l; con los tipos normales habría dado 0,342 y habría fallado, que es justo el error que tenían las guías.
- **Evolución**: el histórico antiguo solo guarda el día 1 de cada mes, así que la tabla se titula «Precio el día 1 de cada mes» en lugar de calcular una media mensual que no existe. El salto de marzo a abril de 2026 se descompone en efecto fiscal (RDL 7/2026) y efecto de mercado.
- **Cepsa = Moeve**: se agrupan como «Moeve (antes Cepsa)» (Cepsa cambió de nombre en 2024 y la fuente mantiene los dos rótulos). /marca/cepsa/ deja de existir (no estaba indexada).
- **Separador de miles**: es-ES no agrupa los números de 4 cifras con `toLocaleString`; todo usa `useGrouping: 'always'` (helper `num`).
- **Criterio único de municipios comparables**: 5 o más gasolineras con precio de gasóleo A (`municipiosComparables` y `dispersionMunicipal` en datos.mjs) en las guías y en el informe semanal.


## 10. Informes archivados, Sobre y mapa (18-11-2026)
- **Informe semanal con URL permanente**: cada lunes el bot congela el informe en `data/informes/AAAA-MM-DD.json` (`scripts/archivar-informe.mjs`, uno por semana ISO; si la semana ya tiene informe no se reescribe) y se publica en `/informe-semanal/AAAA-MM-DD/`. `/informe-semanal/` muestra el último archivado y el índice de todos. El último archivado tiene canonical a `/informe-semanal/` (es el mismo contenido) y por eso no va al sitemap ni lo revisa el QC (se revisa su original); al salir el siguiente, pasa a tener canonical propio. Los enlaces de un informe antiguo solo se pintan si la página sigue existiendo (un municipio o una marca pueden despublicarse). Se guarda el JSON calculado y no se recalcula con el histórico porque el histórico antiguo solo conserva el día 1 de cada mes.
- **Títulos del informe**: si ninguna provincia sube (todas bajan o se quedan igual), «donde menos y donde más baja»; si todas suben, «donde más y donde menos sube».
- **Sobre**: solo afirma lo que sale de los datos o del código (fuente, actualización automática, criterios). Quién la hace, por qué y cómo se revisan las guías lo ha escrito el titular (18-11-2026).
- **Teselas de OpenStreetMap**: comprobada la política de uso (https://operations.osmfoundation.org/policies/tiles/, revisada el 18-11-2026). Se cumple: URL HTTPS `tile.openstreetmap.org`; atribución visible abajo a la derecha; el navegador envía su User-Agent y el Referer (el sitio no fija ninguna Referrer-Policy restrictiva) y respeta la caché; solo se piden las teselas de la vista cuando el usuario pulsa «Mostrar mapa» (sin precarga ni descarga masiva ni modo offline); enlace para avisar de errores (fixthemap), que la política recomienda. La política no fija un límite numérico, pero avisa de que a los servicios comerciales se les puede cortar el acceso sin aviso y sin SLA.
- **Cambiar de proveedor**: todo está en `src/lib/mapa.mjs` (URL de teselas, zoom, atribución, titular y política de privacidad, que también usa /privacidad/). Para cambiar: añadir la entrada del nuevo proveedor y crear la variable del repositorio `MAPA_PROVEEDOR`. Cuándo: si el mapa se abre de forma habitual a diario en muchas páginas, o si OSM bloquea las peticiones. Opciones: un proveedor comercial con plan gratuito limitado (requiere cuenta y puede cobrar al pasar el límite, así que necesita el «sí» del titular) o teselas vectoriales autoalojadas (PMTiles de una extracción de España en el propio hosting, sin cuenta ni coste, pero un fichero muy grande para GitHub Pages, que limita cada sitio a 1 GB; sería viable con dominio y otro hosting).
- **Datos del titular fuera del repositorio** (18-11-2026): nombre, NIF, domicilio y correo se leen al compilar de las variables de GitHub `TITULAR_*` (`src/lib/titular.mjs`), así no quedan en el historial público y se cambian sin tocar el código. Aparecen solo donde lo exige la ley o hace falta: aviso legal (LSSI art. 10), responsable del tratamiento en la privacidad, contacto, y el nombre en Sobre. En el bot, el QC falla si una página publicada contiene `[RELLENAR]`. Contacto y legales no tienen mínimo de palabras (son cortas por naturaleza y no se rellenan con texto).
