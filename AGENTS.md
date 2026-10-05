# Instrucciones para agentes

Guía para agentes de código (Claude Code, Codex, Cursor, Copilot, etc.) que trabajen en este repositorio. Para personas también sirve como resumen de las convenciones.

## Dónde está la información

Lee lo que corresponda **antes** de cambiar código. No adivines reglas del dominio: están escritas.

| Necesitas saber                                                                     | Dónde                                                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Cómo está construido todo y por qué (sync, tasa, auth, modelo de datos, despliegue) | [ARCHITECTURE.md](ARCHITECTURE.md)                                              |
| Comandos, requisitos y cómo publicar                                                | [README.md](README.md)                                                          |
| Esquema de la base (fuente de verdad)                                               | `packages/shared/src/schema/` (`index.ts` compartido, `desktop.ts`, `cloud.ts`) |
| Enums del dominio                                                                   | `packages/shared/src/enums.ts`                                                  |
| Validación de entradas (Zod)                                                        | `packages/shared/src/validation.ts`                                             |
| Contrato del sync y versión del protocolo                                           | `packages/shared/src/sync.ts`                                                   |
| Dinero, tasa, hora UTC−4 y ganancias                                                | `packages/shared/src/{money,time,profit}.ts`                                    |
| Tipos de la API del escritorio (IPC)                                                | `apps/desktop/src/types/api.ts` y `apps/desktop/src/preload/index.ts`           |
| Comportamiento visto por el usuario                                                 | Guías en `apps/site/src/content/docs/`                                          |
| Qué cambió y cuándo                                                                 | [CHANGELOG.md](CHANGELOG.md) y `git log`                                        |
| Licencia y uso de la marca                                                          | [LICENSE](LICENSE), [NOTICE](NOTICE), [TRADEMARKS.md](TRADEMARKS.md)            |

Si el código y ARCHITECTURE.md no coinciden, manda el código. Avisa de la diferencia y actualiza el documento en el mismo cambio.

## Comandos

Node 22+ y pnpm 11. Usa siempre `pnpm`, nunca npm, yarn ni bun.

```bash
pnpm install
pnpm typecheck                              # todos los paquetes
pnpm --filter @bllt/shared test             # pruebas unitarias
pnpm --filter @bllt/desktop test:e2e        # prueba de humo del escritorio (Playwright)
pnpm dev:desktop | dev:worker | dev:web | dev:site
pnpm --filter @bllt/desktop db:generate     # migración de SQLite
pnpm --filter @bllt/worker db:generate      # migración de D1
pnpm format
```

## Reglas del dominio que no se rompen

- **Dinero:** USD en centavos (`INTEGER`) y tasa como entero escalado (`RATE_SCALE = 10_000`). Nunca uses floats para montos. Convierte y formatea con los helpers de `money.ts`.
- **Hora:** el día de negocio es UTC−4. Usa `businessDate()` y los rangos de `time.ts`. Nunca uses la zona horaria de la PC ni `new Date().toLocaleDateString()` para decidir un día. Los timestamps se guardan en UTC ISO 8601.
- **Ganancias:** se calculan solo con `summarizeProfit` de `@bllt/shared`. No dupliques el cálculo en el escritorio ni en el Worker.
- **Tasa:** una API o el teléfono solo sugieren. Nada escribe en `exchange_rates` sin la confirmación de un usuario, y no se vende sin tasa confirmada para el día.
- **Nada se borra:** los usuarios se desactivan y las ventas se anulan (`VOIDED`, devolviendo el stock).
- **IDs:** UUID generados en el escritorio.
- **Enums:** en mayúsculas, definidos una sola vez en `enums.ts`.
- **Unicidad de negocio** (usuario, código de producto, número de venta): solo en el escritorio (`apps/desktop/drizzle/0001_desktop_unique.sql`). D1 tiene que aceptar todo lo que mande el escritorio.

## Arquitectura del código

- Cada app se organiza en `core/ libs/ utils/ modules/<dominio>/`. Dentro de un módulo: `*.repository.ts` (queries), `*.service.ts` (reglas) y `*.ipc.ts` o `*.routes.ts` (adaptador).
- Solo los repositories tocan Drizzle o SQL. Los adaptadores validan con Zod y llaman al service. Un módulo usa otro por su service, nunca por su repository.
- **Escritorio:** registra cada canal IPC con `handle()` de `core/ipc.ts` (Zod, sesión y rol), y exponlo en el preload como una función concreta de `window.api`. No expongas `ipcRenderer` ni la base al renderer, y no relajes `contextIsolation`, `sandbox` ni `nodeIntegration`.
- **Escrituras que se sincronizan:** llama a `syncService.enqueue()` dentro de la **misma transacción** que la escritura.
- **Si agregas una entidad al outbox:** agrégala a `OutboxEntity`, a `outboxMessage` en `sync.ts` y al repository de sync del Worker. Sube `SYNC_PROTOCOL` y regístrala en `ENTITY_PROTOCOL`, porque hay negocios con Workers viejos.
- **Si cambias el esquema:** edita `packages/shared/src/schema/` y genera las **dos** migraciones (escritorio y D1). No escribas SQL de migración a mano salvo los índices exclusivos del escritorio.
- **UI:** usa componentes de `@bllt/ui`. Si falta uno, agrégalo desde shadcn-svelte con su CLI dentro de `packages/ui`. Si no existe ahí, constrúyelo sobre Bits UI. Solo como último recurso escríbelo desde cero. Usa los tokens de color de `packages/ui/src/styles/app.css`, no colores sueltos.

## Estilo

- Prettier: sin punto y coma, comillas simples, 100 columnas, sin comas finales. Corre `pnpm format` sobre lo que tocaste.
- Identificadores y comentarios de código en **inglés**. Todo lo que ve el usuario (UI, mensajes de error, guías, README) en **español** neutro, con tuteo.
- Imita el código de alrededor: la densidad de comentarios, los nombres y los patrones. Los comentarios explican el porqué, no el qué.
- Dependencias con versión exacta (`saveExact`). No agregues una dependencia si `@bllt/shared`, la plataforma o una ya instalada resuelven el problema.

## Archivos que no se editan a mano

- `CHANGELOG.md` y `apps/site/src/lib/changelog.json`: los genera `scripts/changelog.mjs` al publicar.
- `apps/*/drizzle/meta` y `apps/worker/migrations/meta`: los genera drizzle-kit.
- `apps/site/static/capturas`: salen de `pnpm --filter @bllt/desktop capturas`. `apps/site/static/video`: sale de `pnpm --filter @bllt/desktop video`.
- `packages/ui/src/components`: código de shadcn-svelte. Se puede ajustar, pero no lo reescribas entero.
- `assets/brand/`: logo e íconos con todos los derechos reservados. No los modifiques ni generes variantes.

## Antes de dar un cambio por terminado

1. `pnpm typecheck` sin errores.
2. `pnpm --filter @bllt/shared test` si tocaste `packages/shared`.
3. `pnpm --filter @bllt/desktop test:e2e` si tocaste flujos del escritorio (venta, tasa, usuarios, respaldos, sync). Para el sync entre PCs, `e2e/multi.mjs` contra un Worker local (ver ARCHITECTURE.md).
4. Si cambió algo que ve el usuario, actualiza la guía correspondiente en `apps/site/src/content/docs/`. Si cambió la arquitectura, actualiza ARCHITECTURE.md.
5. Informa qué comprobaste y qué no pudiste probar.

## Git

- Mensajes de commit en español, describiendo el cambio visto desde el producto (mira `git log`). Sin prefijos tipo `feat:` y sin trailers de atribución de IA (`Co-Authored-By`, etc.).
- No hagas commit, push, tags ni releases sin que te lo pidan. Un tag `vX.Y.Z` publica el instalador **y** actualiza la rama `cloud` que usan los negocios.
- No escribas en la rama `cloud` a mano: la genera CI.
- Nunca subas secretos (`.dev.vars`, `SYNC_TOKEN`, `JWT_SECRET`) ni bases de datos (`*.db`).
