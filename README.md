# Bllt en la nube

Este repositorio es la parte en la nube de [Bllt](https://github.com/juanlvs21/bllt): la API
(Hono + D1), el cron de la tasa y la PWA del teléfono, en un solo Cloudflare Worker.

Se generó con el botón *Deploy to Cloudflare*. Guía: [bllt.juanl.dev/docs/nube](https://bllt.juanl.dev/docs/nube).

El nombre del negocio en la PWA es el de la app de escritorio: se sincroniza con el resto de
los datos.

## Actualizar

*Actions → Update cloud → Run workflow* trae la última versión y Cloudflare la despliega
(también corre sola cada lunes). Conserva tu `wrangler.jsonc` (nombre del Worker e id de la
base D1); el resto de los archivos se reemplaza. Guía:
[bllt.juanl.dev/docs/guias/actualizar-nube](https://bllt.juanl.dev/docs/guias/actualizar-nube).
