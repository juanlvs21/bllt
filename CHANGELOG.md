# Changelog

Cambios de cada versión de Bllt. Este archivo se genera solo al publicar una versión; no lo edites a mano.

## [0.1.3](https://github.com/juanlvs21/bllt/releases/tag/v0.1.3) · 2026-09-28

- Versión 0.1.3 ([5b9e64a](https://github.com/juanlvs21/bllt/commit/5b9e64ac7d17199afa85b2e2fb3f1dc9f43f7c71))
- Al aceptar una tasa sugerida el aviso se cierra y no vuelve a proponer la tasa anterior de internet - Video de demostración del sitio regenerado ([b4e5c4e](https://github.com/juanlvs21/bllt/commit/b4e5c4ed0237a59aea0c7576d6ea977dc2f93745))
- Documentación de arquitectura e instrucciones para agentes: ARCHITECTURE.md con el diseño actual (sync, tasa, auth, modelo de datos, despliegue), AGENTS.md con convenciones y dónde buscar la información, CLAUDE.md que lo importa y enlaces desde el README ([77dac50](https://github.com/juanlvs21/bllt/commit/77dac50ba190f8560cbb8a2ee723c0e018be89a7))

[Ver todos los cambios](https://github.com/juanlvs21/bllt/compare/v0.1.1...v0.1.3)

## [0.1.1](https://github.com/juanlvs21/bllt/releases/tag/v0.1.1) · 2026-09-27

- Releases publicados (no borrador) y push a la rama cloud con CLOUD\_BRANCH\_TOKEN ([773069d](https://github.com/juanlvs21/bllt/commit/773069d41606a4dadc3ef6d447ba4dd3de7ff14d))

[Ver todos los cambios](https://github.com/juanlvs21/bllt/compare/v0.1.0...v0.1.1)

## [0.1.0](https://github.com/juanlvs21/bllt/releases/tag/v0.1.0) · 2026-09-27

- Rama cloud solo desde tags: el último tag estable vX.Y.Z la publica, un push a main solo comprueba que compila - Tags viejos o de prueba (v1.1.5 tras v1.2.0, v1.3.0-beta) no reemplazan lo publicado; a mano se republica el último tag - .bllt-version guarda el tag, así Update cloud actualiza a "Update cloud to vX.Y.Z" - README y guía de actualizar la nube lo explican ([beaf124](https://github.com/juanlvs21/bllt/commit/beaf1242f649c470abdfb13e3211a6ece6635c11))
- Nombre del negocio sincronizado desde el escritorio, versión de protocolo del Worker, Action Update cloud para actualizar el repo de cada negocio, probar conexión antes de guardar y confirmación al desconectar la nube - Nueva entidad BUSINESS en el outbox: el nombre se guarda en cloud\_meta y la PWA lo pide a /api/business (sin variable de compilación); el Worker lo pone en el manifest - /api/health anuncia protocol (SYNC\_PROTOCOL = 2); el escritorio retiene lo que un Worker anterior no entiende y avisa que se actualice - La rama cloud trae .github/workflows/update-cloud.yml y scripts/update.mjs: trae la última versión conservando nombre del Worker, id de D1 y rutas de wrangler.jsonc - workers\_dev explícito en wrangler.jsonc - Probar conexión usa la URL y el token del formulario; Desconectar pide confirmación y borra la configuración - Guía /docs/guias/actualizar-nube y smoke ampliado (probar conexión, nombre en la PWA, Worker anterior, desconectar) ([9664f2b](https://github.com/juanlvs21/bllt/commit/9664f2bacaabba09594f81079bad8eae022f00d0))
- Tasa del día con dos opciones (internet y teléfono), rechazo de la sugerencia del teléfono visible en la PWA, botón para sincronizar a mano en el escritorio y confirmación al cerrar sesión en la PWA ([acb912c](https://github.com/juanlvs21/bllt/commit/acb912c910a90e5a7f88720588186891236617d5))
- CI y rama cloud: un run nuevo cancela el anterior en curso ([8de19a4](https://github.com/juanlvs21/bllt/commit/8de19a475abbec02279cfd5dcf7c6be19deeef5d))
- Botón de Cloudflare desde la rama cloud: workspace recortado (worker, web, shared, ui) con wrangler.jsonc en la raíz, generado por CI en cada push a main ([ae2feac](https://github.com/juanlvs21/bllt/commit/ae2feac9f6a424cf5fc4e8181394a7aa415c6a6b))
- Changelog en cada release: CHANGELOG.md en la raíz, notas en el release de GitHub y página /novedades en el site, con enlace a cada commit ([a0ceadb](https://github.com/juanlvs21/bllt/commit/a0ceadb0a58069e7585270ecb1977ab93251aa52))
- Dependencias en su última versión compatible y fijadas exactas (saveExact en el workspace); GitHub Actions a checkout v7.0.1, pnpm/action-setup v6.1.0 y setup-node v7.0.0 con Node 24 ([ae0facd](https://github.com/juanlvs21/bllt/commit/ae0facda0c8a056515eb39c8967584afa25e88a3))
- Video de demostración en la landing: iniciar sesión, confirmar la tasa, registrar un producto y vender a un cliente con comprobante en PDF ([e9829c9](https://github.com/juanlvs21/bllt/commit/e9829c9412e14c176a3056f2c6043ea896e427a5))
- Aviso de tasa nueva con diálogo guardada/nueva; montos con coma en los campos; código de recuperación en una línea con copiar; docs y landing con capturas y comprobante en PDF ([3f29b25](https://github.com/juanlvs21/bllt/commit/3f29b25f1f22f42946910f5222e55592e3444454))
- Desktop: Imprimir abre una vista previa del comprobante en memoria; desde el visor se guarda (en Receipts por defecto) o se imprime ([93decbc](https://github.com/juanlvs21/bllt/commit/93decbccd59555c58b2d26f316bcc6fc505034f5))
- Desktop: Imprimir genera y abre el comprobante en PDF (carta, membrete y pie en cada página, varias páginas y aviso no fiscal al final) ([7a8e82d](https://github.com/juanlvs21/bllt/commit/7a8e82d5584201f0389d5e8bfd51aca4a5906c3b))
- Logo del negocio en el setup, Configuración, menú, login y comprobante; el negocio encabeza el menú y salir pide confirmación ([e5070b8](https://github.com/juanlvs21/bllt/commit/e5070b8ff8f093ffc309ce4ee3d7b7af8a371c48))
- Nombre y RIF del negocio en el setup, Configuración y comprobante; nombre de la PWA desde BUSINESS\_NAME ([aae3b39](https://github.com/juanlvs21/bllt/commit/aae3b393e4354a70d866b14e02ae6205c37727f7))
- Desktop: resumen antes de registrar la venta, carrito y comprobante con scroll interno, y crédito en el login ([5eee4db](https://github.com/juanlvs21/bllt/commit/5eee4dbc9eb03912f644fb98f8dd6209c9cd509e))
- Desktop: selector de rango de fechas de shadcn-svelte en ventas y exportación ([0693046](https://github.com/juanlvs21/bllt/commit/06930465fea6e76844b00c8692010fc7f24561ce))
- Desktop: paginación en clientes, productos y ventas (10, 25, 50 y 100 por página) ([7ae72d5](https://github.com/juanlvs21/bllt/commit/7ae72d5d5227982dcbebd00091cf7275469f85c9))
- feat: add observability in wrangler.jsonc ([c13102e](https://github.com/juanlvs21/bllt/commit/c13102ee8dea7f2271a5b7cb4176b1443071a519))
- Desktop: script seed:demo con productos, clientes, tasas y ventas de 3 meses ([341a576](https://github.com/juanlvs21/bllt/commit/341a576480261e6feeeb3d36e32cd343c0026b7f))
- E2E: esperar animaciones antes de cada captura y actualizar capturas del site ([91aa998](https://github.com/juanlvs21/bllt/commit/91aa998067ff1628d7e1c392a34e3d4d4f7a658b))
- Desktop: carpetas Backups y Exports, y e2e con el nombre Bllt ([ea3185b](https://github.com/juanlvs21/bllt/commit/ea3185b25ee1c6471e601b568ecad7a99c483125))
- Marca: nuevo logo e íconos en escritorio, PWA y landing ([c6ae191](https://github.com/juanlvs21/bllt/commit/c6ae19159fc0a849db67890afbbd3f0a72dbb6a9))
- Site: desplegar con Cloudflare Workers Builds en lugar de GitHub Actions ([c253c79](https://github.com/juanlvs21/bllt/commit/c253c79869b71b75c1155b198b14e85afbb62951))
- UI: variantes data-\* de shadcn enlazadas a los atributos de bits-ui ([4bb32a0](https://github.com/juanlvs21/bllt/commit/4bb32a07ade1e802ac0201fcfae393a10c17554d))
- CI: desplegar el site con el wrangler de apps/worker ([563a855](https://github.com/juanlvs21/bllt/commit/563a855ba39368a3cf6f09807e04654f5a0b31d5))
- Desktop: un respaldo automático al día al abrir y retención de 7 días ([7ec95d1](https://github.com/juanlvs21/bllt/commit/7ec95d162c83b4a92a5702129dd70eff22ad31b4))
- Desktop: marca Bllt en desarrollo y eslogan en la ventana ([ae33405](https://github.com/juanlvs21/bllt/commit/ae33405efaca9f23f751261531bcd292f6a69700))
- Bllt: monorepo inicial ([4f5f1c2](https://github.com/juanlvs21/bllt/commit/4f5f1c2684c59ce9a5ae579e76669271578e6d49))

[Ver todos los cambios](https://github.com/juanlvs21/bllt/commits/v0.1.0)
