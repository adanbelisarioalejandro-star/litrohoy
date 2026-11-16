# Lo que tienes que hacer tú (en orden)

Cada paso que cueste dinero o cree una cuenta necesita tu decisión. Nunca pegues contraseñas, datos bancarios ni de tarjeta en el chat: escríbelos tú en el navegador. **Activa la verificación en dos pasos en cada cuenta** (GitHub, Google y el registrador del dominio).

## 1. Repositorio y despliegue (gratis)
1. Si no tienes cuenta de GitHub, créala en https://github.com/signup y activa la verificación en dos pasos: https://github.com/settings/security
2. Crea un repositorio **público** llamado `litrohoy`, sin README: https://github.com/new (GitHub Pages y Actions son gratis en repositorios públicos).
3. Sube el código desde esta carpeta (el navegador te pedirá iniciar sesión en GitHub):
   ```
   git remote add origin https://github.com/TU_USUARIO/litrohoy.git
   git push -u origin main
   ```
4. Activa Pages con Actions: `Settings → Pages → Build and deployment → Source: GitHub Actions` (https://github.com/TU_USUARIO/litrohoy/settings/pages).
5. Lanza el bot por primera vez: `Actions → bot → Run workflow` (marca "semanal"). Desde ahí se ejecuta solo cada día.
   **Vista previa gratis (activa desde el 16-11-2026):** https://adanbelisarioalejandro-star.github.io/litrohoy/ con las variables `SITE_URL=https://adanbelisarioalejandro-star.github.io` y `BASE_PATH=/litrohoy`. Todas sus páginas llevan `noindex` para que Google no la indexe todavía.

## 2. Dominio propio (DE PAGO: unos 10-12 € al año, necesita tu OK)
AdSense exige un sitio propio; los subdominios `*.github.io` no suelen aprobarse. Propuesta: **litrohoy.com** (libre el 16-11-2026).
1. Cómpralo en el registrador que prefieras (por ejemplo, Cloudflare Registrar: https://dash.cloudflare.com/?to=/:account/domains/register). Confirma el precio de compra **y el de renovación** antes de pagar, desactiva extras de pago y activa la verificación en dos pasos.
2. En la gestión de DNS del dominio crea:
   - 4 registros `A` para `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 1 `CNAME` para `www`: `TU_USUARIO.github.io`
3. En `Settings → Pages → Custom domain` escribe `litrohoy.com`, guarda y marca **Enforce HTTPS** cuando aparezca.
4. Verifica el dominio en GitHub para evitar suplantaciones: https://github.com/settings/pages → "Add a domain".
5. En `Settings → Secrets and variables → Actions → Variables`: cambia `SITE_URL` a `https://litrohoy.com` y **borra `BASE_PATH`** (quita la vista previa y el `noindex`).

## 3. Datos legales (personales: solo tú)
Rellena los huecos `[RELLENAR]` (nombre o razón social, NIF, domicilio y correo de contacto) en:
`src/pages/aviso-legal.astro`, `src/pages/privacidad.astro` y `src/pages/contacto.astro`. Después: `git commit -am "Datos legales" && git push`.

## 4. Search Console (gratis)
1. Añade la propiedad de tipo **Dominio** `litrohoy.com` en https://search.google.com/search-console y verifícala con el registro TXT que te indique.
2. Envía el sitemap: `Sitemaps → https://litrohoy.com/sitemap.xml`.
3. Opcional, para que el bot mida visitas (**solo lectura**, necesita tu OK porque conecta servicios):
   - En https://console.cloud.google.com crea un proyecto, activa "Google Search Console API" y crea una cuenta de servicio **sin roles**. Descarga su clave JSON. Si Google Cloud te pide tarjeta, para y avísame.
   - En Search Console: `Configuración → Usuarios y permisos → Añadir usuario` con el correo de la cuenta de servicio y permiso **Restringido**.
   - En GitHub, `Settings → Secrets and variables → Actions → Secrets`: `GSC_CREDENTIALS` = contenido del JSON, `GSC_SITE` = `sc-domain:litrohoy.com`. Borra el JSON de tu ordenador después.

## 5. AdSense (cuando el sitio lleve unas semanas publicado con dominio)
1. Regístrate en https://adsense.google.com, añade el sitio `litrohoy.com` y verifica la cuenta de Google con la verificación en dos pasos.
2. Copia tu ID de editor (`ca-pub-…`) en la variable `PUBLIC_ADSENSE_ID` (Variables de Actions, no es secreto). En el siguiente despliegue se cargan solos el código de AdSense y `ads.txt`.
3. En AdSense: `Privacidad y mensajes → Reglamentos europeos` → crea y **publica** el mensaje de consentimiento (CMP de Google, certificada TCF). Es obligatorio para el tráfico de la UE.
4. Pide la revisión del sitio en AdSense.
5. Cuando te aprueben: `Anuncios → Por bloque de anuncios → Anuncios de display` (adaptable) y copia el ID del bloque en la variable `PUBLIC_ADSENSE_SLOT`.
6. **Cobros (solo tú; yo nunca los toco):** en `Pagos → Configuración de pagos` añade tus datos fiscales y la forma de cobro. Google paga al superar el umbral de pago que muestra tu cuenta.
7. Opcional, para que el bot lea los ingresos (**solo lectura**, necesita tu OK): crea un cliente OAuth "Aplicación de escritorio" en Google Cloud, activa la "AdSense Management API" y obtén un refresh token con el scope `https://www.googleapis.com/auth/adsense.readonly`. Guarda `ADSENSE_CLIENT_ID`, `ADSENSE_CLIENT_SECRET` y `ADSENSE_REFRESH_TOKEN` como Secrets. Te guío paso a paso cuando llegues aquí.
