# Bllt

**Bllt** (se lee “billete”) es una app de escritorio open source para que un negocio pequeño en Venezuela controle inventario, ventas y clientes en USD, registrando la tasa BCV de cada venta. Funciona 100% sin internet; la nube es opcional y solo sirve para ver el resumen y sugerir la tasa desde el teléfono.

- Sitio y guías: [bllt.juanl.dev](https://bllt.juanl.dev)
- Descargas: [GitHub Releases](https://github.com/juanlvs21/bllt/releases/latest)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/juanlvs21/bllt/tree/main/apps/worker)

El botón despliega **solo** `apps/worker`: la API (Hono + D1), el cron de la tasa y la PWA del teléfono. Pide dos secretos, `SYNC_TOKEN` y `JWT_SECRET`. Guía: [bllt.juanl.dev/docs/nube](https://bllt.juanl.dev/docs/nube).

## Monorepo

```
apps/
  desktop/   Electron + electron-vite + Svelte (fuente de verdad, SQLite)
  worker/    Cloudflare Worker: Hono + D1 + cron; sirve el build de apps/web
  web/       PWA Svelte + Vite: login, resumen del día, sugerir tasa
  site/      SvelteKit estático: landing + docs (bllt.juanl.dev)
packages/
  shared/    @bllt/shared: enums, Zod, esquema Drizzle, dinero, hora UTC−4, contrato del sync, ganancias
  ui/        @bllt/ui: componentes shadcn-svelte + piezas de marca
assets/brand/  logo e íconos (todos los derechos reservados)
```

Requisitos: Node 22+ y pnpm 11.

```bash
pnpm install
```

| Comando | Qué hace |
| --- | --- |
| `pnpm dev:desktop` | App de escritorio con recarga en caliente |
| `pnpm dev:worker` | Worker local en `:8787` con D1 local (copia `apps/worker/.dev.vars.example` a `.dev.vars`) |
| `pnpm dev:web` | PWA en Vite, con `/api` apuntando al Worker local |
| `pnpm dev:site` | Landing y docs |
| `pnpm typecheck` | Tipos en todos los paquetes |
| `pnpm --filter @bllt/shared test` | Pruebas de dinero, hora, ganancias y contraseñas |
| `pnpm --filter @bllt/desktop test:e2e` | Prueba de humo con Playwright sobre la app construida (primer arranque → tasa → productos → venta → dashboard → respaldo). Con `BLLT_E2E_WORKER=http://localhost:8787` también prueba el sync |
| `pnpm --filter @bllt/desktop build:win` | Instalador NSIS |

## Decisiones clave

- **Dinero:** USD en centavos (`INTEGER`), tasa como entero escalado a 4 decimales. Ganancia de una línea = `qty × (price − cost)`; en Bs se multiplica por la tasa de su propia venta. Se calcula solo en `@bllt/shared` (`summarizeProfit`), así el escritorio y el teléfono muestran el mismo número.
- **Hora:** todo “día de negocio” se calcula en UTC−4 desde UTC con `businessDate()`, nunca con la zona de la PC.
- **Sync:** outbox en la misma transacción que cada escritura; sube en lotes con `Authorization: Bearer <SYNC_TOKEN>`; el Worker hace `upsert` por UUID. D1 limita las consultas por invocación en el plan gratis, así que el Worker acepta el prefijo del lote que cabe en `SYNC_STATEMENT_BUDGET` y el escritorio reenvía el resto.
- **Unicidad:** usuario, código de producto y número de venta son únicos solo en el escritorio (`apps/desktop/drizzle/0001_desktop_unique.sql`). D1 nunca rechaza una fila del escritorio (por ejemplo, números de venta reutilizados tras restaurar un respaldo).
- **Tasa:** la API solo sugiere; la tasa del día es la que confirma un usuario. Sin tasa confirmada no hay ventas.
- **Módulos:** cada app se organiza en `core/ libs/ utils/ modules/<dominio>/{repository, service, ipc|routes}`. Solo los repositories tocan Drizzle.
- **Migraciones:** escritorio en `apps/desktop/drizzle` (`pnpm --filter @bllt/desktop db:generate`), D1 en `apps/worker/migrations` (`pnpm --filter @bllt/worker db:generate`). Ambas salen del mismo esquema en `packages/shared/src/schema`.

## Publicar

- **Escritorio:** crea un tag `vX.Y.Z` y GitHub Actions compila el instalador de Windows y lo publica en Releases (`.github/workflows/release-desktop.yml`).
- **Sitio:** lo publica Cloudflare Workers Builds, conectado al repo de GitHub: cada push a `main` construye `apps/site` y lo despliega con `pnpm exec wrangler deploy` (config en `apps/site/wrangler.jsonc`, Worker `bllt-site`, dominio `bllt.juanl.dev`).

## Licencia y marca

El código está bajo la [Apache License 2.0](LICENSE) (ver también [NOTICE](NOTICE)). El nombre “Bllt”, el logo y la identidad visual son marcas de Juan Villarroel y **no** están cubiertos por la licencia: lee [TRADEMARKS.md](TRADEMARKS.md) antes de publicar un fork.
