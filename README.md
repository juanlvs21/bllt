# Bllt en la nube

Este repositorio es la parte en la nube de [Bllt](https://github.com/juanlvs21/bllt): la API
(Hono + D1), el cron de la tasa y la PWA del teléfono, en un solo Cloudflare Worker.

Se generó con el botón *Deploy to Cloudflare*. Guía: [bllt.juanl.dev/docs/nube](https://bllt.juanl.dev/docs/nube).

El nombre del negocio en la PWA sale de la variable de compilación `BUSINESS_NAME`
(en Cloudflare: *Settings → Build → Variables*).
