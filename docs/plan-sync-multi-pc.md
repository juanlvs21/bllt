# Plan: sincronización entre varias PCs

> **Estado:** implementado. Ver las desviaciones al final de este documento.

Basado en `bllt-sync-multi-pc.md`. Ajustado a lo que hay en el código y a las decisiones tomadas con el dueño del proyecto.

## Decisiones tomadas

| Tema                         | Decisión                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worker                       | No existe aún. Se despliega ya con el esquema final. No hay migración de D1 ni Workers viejos en este negocio.                                                                                                                                                                                                                    |
| Código de producto duplicado | Se quita el índice único de `code` y se valida en el service. Si llega un duplicado remoto, se renombra solo, con regla determinista: conserva el código el producto con el `id` menor; el otro pasa a `CODIGO-2` (primer sufijo libre). El renombrado se sincroniza como edición normal y se avisa al admin en `sync_conflicts`. |
| Stock                        | `create`, `update` (formulario) y `adjustStock` crean movimientos. Ninguno sobrescribe el valor.                                                                                                                                                                                                                                  |
| Outbox viejo                 | No se borra: se renombra a `outbox_legacy` y se conserva hasta que la primera subida completa termine sin pendientes. Los datos reales viven en sus tablas, que la migración no toca.                                                                                                                                             |
| Código de recuperación       | Se sincroniza (hash) como entidad `SETTING`, gana el cambio más reciente.                                                                                                                                                                                                                                                         |
| Bajada                       | `changes` guarda solo `(seq, entity, entity_id, device_id)`. El pull lee el estado actual de la fila.                                                                                                                                                                                                                             |
| Anulación doble              | El movimiento `VOID` tiene ID determinista (UUID v5 de `saleItemId` + motivo). `INSERT OR IGNORE` evita devolver el stock dos veces.                                                                                                                                                                                              |
| Restaurar respaldo           | El pull posterior a una restauración incluye los cambios propios (`include_own=true`).                                                                                                                                                                                                                                            |
| Reloj adelantado             | El Worker rechaza o recorta un `updated_at` más de 24 h en el futuro respecto a su hora.                                                                                                                                                                                                                                          |

## Diferencias entre el documento y el código

1. `productUpdate` incluye `stock`: el formulario sobrescribe hoy el stock. Hay un tercer punto de escritura además de `addStock` y la creación.
2. Las unicidades son índices aparte (`0001_desktop_unique.sql`). No hace falta reconstruir `sales`.
3. `sales` y `sale_items` no tienen `updated_at` (no hace falta: son inmutables salvo la anulación). Ninguna tabla tiene `updated_by_device`.
4. Con dos anulaciones simultáneas el documento promete "una sola devolución", pero con UUID aleatorios se devolvería dos veces. Se corrige con el ID determinista.
5. `RATE_DECISION` y `BUSINESS` son asuntos del Worker y no entran en `changes`.

## Fase 0: preparación (sin cambios de código)

- Copiar el `.db` real a la PC de desarrollo. Anotar: total de ventas, ganancias del mes, stock por producto.
- Todas las fases siguientes se prueban contra esa copia.

## Fase 1: contratos y reglas en `packages/shared`

**Objetivo:** que escritorio y Worker usen las mismas reglas y la misma forma de datos.

Archivos:

- `src/enums.ts`: `StockReason` (`INITIAL`, `SALE`, `VOID`, `PURCHASE`, `ADJUSTMENT`), `ConflictKind`, y las entidades nuevas en `OUTBOX_ENTITIES` (`STOCK_MOVEMENT`, `SETTING`, `DEVICE`).
- `src/schema/index.ts`: columnas `updatedByDevice` en `users`, `products`, `customers`; `series` en `sales`; `updatedAt`/`updatedByDevice` en `exchange_rates`; tabla `stock_movements`; se quita `stock` de lo que se sincroniza (queda en `products` como caché local).
- `src/schema/desktop.ts`: `devices`, `sync_conflicts`.
- `src/schema/cloud.ts`: `devices` (con `tokenHash`), `changes`.
- Archivo nuevo `src/lww.ts`: `wins(incoming, current)`: mayor `updatedAt`, empate por `deviceId` mayor. Más la regla de ventas (`VOIDED` gana) y el recorte de fechas futuras.
- `src/sync.ts`: payloads nuevos, `pushRequest` con `deviceId`, `pullRequest/pullResponse` (`since`, `limit`, `include_own`, `next_seq`, `has_more`), `registerRequest/registerResponse`. `SYNC_PROTOCOL = 3`.
- `src/validation.ts`: formato de serie (`^[A-Z]$`), validación de `name` de dispositivo.
- Función `voidMovementId(saleItemId)` (UUID v5) en un archivo propio.

Riesgo: cambio de contrato que rompe el typecheck en las tres apps. Se corrige fase por fase.
Prueba: pruebas unitarias de `wins`, del recorte de fechas y de `voidMovementId` (mismo ID siempre).

## Fase 2: migración local del escritorio

**Objetivo:** convertir la instalación actual en el dispositivo `A` sin perder datos.

Archivos: `apps/desktop/src/main/core/db.ts`, `apps/desktop/drizzle/` (migración generada y una nueva escrita a mano), nuevo `modules/sync/migration.service.ts`.

Pasos:

1. Antes de `migrate()`, si hay migraciones pendientes y la base ya tiene datos: respaldo síncrono con `VACUUM INTO` en la carpeta de respaldos. Si falla, no se migra.
2. `drizzle-kit generate` para columnas y tablas nuevas.
3. SQL a mano (solo escritorio): quitar `sales_number_unique` y `products_code_unique`, crear `sales_series_number_unique (series, number)`. Las ventas existentes toman `series = 'A'`.
4. Paso en TypeScript tras `migrate()`, una sola vez y solo si la base tenía datos antes de migrar (se detecta antes de migrar): crear `device_id`, serie `A`, rellenar `updatedAt`/`updatedByDevice`, crear un movimiento `INITIAL` por producto con `stock <> 0` (UUID con `randomUUID()`), renombrar `outbox` a `outbox_legacy` (y crear una `outbox` nueva vacía), comparar conteos y totales contra los previos a la migración y, solo si coinciden, marcar `full_upload_pending`.

Riesgo: el más alto del plan. Una instalación nueva nunca debe crear `INITIAL` por su cuenta.
Prueba: migrar la copia del `.db` real: mismos conteos y ganancias, y `stock` de cada producto igual a la suma de sus movimientos. Probar también una base vacía y una migración interrumpida.

## Fase 3: escritura de movimientos de stock y series

**Objetivo:** que nada vuelva a sobrescribir el stock.

Archivos: `modules/products/product.{service,repository}.ts`, `modules/sales/sale.{service,repository}.ts`, nuevo `modules/stock/stock.{repository,service}.ts`, `modules/sync/*`.

- `stock.service.record()` inserta el movimiento, recalcula la caché del producto y encola `STOCK_MOVEMENT`, todo en la misma transacción.
- Venta: un `SALE` por línea. Anulación: un `VOID` por línea con ID determinista.
- `create`: `INITIAL`. `update` y `adjustStock`: `ADJUSTMENT` con la diferencia. Se quita `stock` del `UPDATE` de productos.
- `nextNumber()` pasa a `max(number) + 1 where series = <mi serie>`.
- Unicidad de `code` validada en el service (hoy `assertCodeFree`).

Prueba: venta, anulación y ajuste dejan `stock` = suma de movimientos. Anular dos veces el mismo movimiento no duplica. Se actualiza el e2e de venta.

## Fase 4: Worker

**Objetivo:** punto de encuentro entre PCs.

Archivos: `apps/worker/migrations/` (nueva migración inicial con el esquema final), `core/auth.ts`, módulos `devices/` (`register`, `revoke`) y `sync/` (push con regla LWW, pull).

- `POST /api/devices/register` con `SYNC_TOKEN`: asigna serie (`A` si se pide y está libre, si no la siguiente), crea el token y guarda solo su hash.
- Auth de push y pull con el token del dispositivo. Un dispositivo inactivo recibe 401. `last_seen_at` se actualiza en cada llamada.
- Push: upsert con `ON CONFLICT ... DO UPDATE ... WHERE` el entrante gana; ventas con la regla de `VOIDED`; movimientos con `ON CONFLICT DO NOTHING`. Por cada cambio aceptado se escribe una fila en `changes`, dentro del mismo `batch`.
- Pull: `GET /api/sync/pull?since&limit&include_own`, lee el estado actual de cada `(entity, entity_id)` (agrupado, sin repetidos) y responde `next_seq` y `has_more`.
- Vigilar `SYNC_STATEMENT_BUDGET = 40`: cada mensaje suma una sentencia.

Prueba: pruebas del Worker con D1 local (miniflare): idempotencia, LWW, 401 de dispositivo revocado, paginación del pull.

## Fase 5: bajada en el escritorio

**Objetivo:** aplicar los cambios remotos de forma segura.

Archivos: `modules/sync/sync.service.ts` (ciclo: push, pull hasta `has_more = false`, tasa), nuevo `modules/sync/apply.service.ts`, `libs/secure-storage.ts`.

- El token del dispositivo se guarda cifrado, como hoy el `SYNC_TOKEN`.
- Aplicar en una transacción por lote, sin tocar `outbox`. Se ignora `stock` en productos. Los movimientos se insertan si no existen y se recalcula la caché. El cursor se guarda en la misma transacción.
- Código de producto duplicado: tras aplicar un producto remoto, si otro producto con distinto `id` tiene el mismo código (sin distinguir mayúsculas), el de `id` mayor se renombra a `CODIGO-2` (o el primer sufijo libre) dentro de la misma transacción y se encola como edición normal. Se registra el aviso en `sync_conflicts`.
- Otros conflictos: cliente con documento repetido, último `ADMIN` desactivado (se reactiva el último desactivado).
- Subida completa una sola vez (`full_upload_pending`), con registro previo en el Worker.

Prueba (los escenarios del documento): dos PCs venden el mismo producto, ediciones simultáneas del precio, anulación cruzada, corte de red a mitad de push y pull, un cambio bajado no aparece en el outbox.

## Fase 6: primer arranque conectado a la nube

Archivos: `renderer/src/modules/auth/pages/` (nueva `ConnectPage.svelte`), `App.svelte` (nueva fase `connect` antes de `setup`), `modules/auth/` y `sync/` en main, `types/api.ts` y `preload/index.ts` para los canales nuevos. En el Worker, `GET /api/business/status`.

Flujo de una instalación nueva (sin Worker configurado y sin datos):

1. La primera pantalla pide URL del Worker, `SYNC_TOKEN` y nombre de la PC. Incluye "Usar solo en esta PC", que sigue al setup actual sin nube.
2. Se registra el dispositivo y el Worker responde si el negocio ya tiene datos y si su subida inicial está completa.
   - **Con datos y completo:** pull completo con progreso y directo al login. No se crea dueño ni se muestra código de recuperación (el hash baja como entidad `SETTING`). Nunca se crean movimientos `INITIAL`.
   - **Con datos pero subida incompleta:** se pide esperar a que la PC original termine.
   - **Sin datos:** continúa el setup normal con el Worker ya configurado. Al terminar, la PC sube todo.
3. El Worker marca el negocio como completo cuando el primer dispositivo termina la subida completa (`cloud_meta`).

La PC actual no pasa por esto: al actualizar se migra y se conecta desde Configuración.

Prueba: unir una instalación limpia a un Worker con datos y comprobar stock, ventas, login con un usuario existente y que `INITIAL` no se duplica. Probar también Worker vacío y subida incompleta.

## Fase 7: interfaz

- Estado del sync (`SyncStatusCard` y `SyncButton`, que ya muestran última sincronización y pendientes): subida y bajada por separado, pendientes por subir con progreso durante la subida completa inicial ("12 000 de 48 000"), pendientes por bajar (el pull devuelve el total restante), última conexión de cada PC y el motivo del último error.
- Dashboard: ganancias de todas las PCs, estado por dispositivo ("PC caja 2: datos hasta hace 2 h"), avisos de conflictos y stock negativo.
- Ventas e historial: número `A-000123` y filtro por PC. Recibo y exportación incluyen serie y nombre de la PC.
- Tasa del día: prellenada si otra PC ya la confirmó.
- Productos: el formulario guarda un `ADJUSTMENT`, con aviso de stock negativo.
- Configuración (ADMIN): lista de dispositivos y botón de revocar.
- Restaurar respaldo: aviso de que lo no subido se pierde, y pull con `include_own`.
- Actualizar las guías en `apps/site/src/content/docs/` y `ARCHITECTURE.md`.

## Despliegue en el negocio

1. Probar todo sobre la copia del `.db` real.
2. Desplegar el Worker (nuevo y vacío).
3. Actualizar la PC `A` (hace respaldo, migra, se registra y sube todo). Esperar a que no queden pendientes y revisar D1.
4. Instalar la PC `B` y unirla.

Mientras `B` no esté unida, `A` funciona igual que hoy.

## Pendiente de confirmar durante la implementación

- Cómo reacciona `SetupPage` hoy si ya hay Worker configurado (se lee al empezar la Fase 6).
- Si el e2e actual cubre el flujo de venta con stock, para reutilizarlo en la Fase 3.

## Desviaciones respecto al plan (al implementar)

- **Tasa confirmada en otra PC:** llega por el pull como una fila más de `exchange_rates` y vale como confirmada; no se muestra "prellenada para aceptar". Ya la confirmó un usuario, y así la cajera no la pide de nuevo.
- **Lista de PCs:** no es una entidad del outbox; cada ciclo la baja con `GET /api/devices` y la guarda local.
- **Nombre, RIF y logo del negocio:** viajan como ajuste compartido (`business_settings`, clave `business`), igual que el hash del código de recuperación, para que la segunda PC imprima los mismos comprobantes.
- **Subida completa:** se encola al **conectar** (no durante la migración), y el Worker marca el negocio como completo con `POST /api/sync/upload-complete`.
- **Usuario repetido:** caso no previsto en el plan. Se renombra el de `id` mayor, igual que con el código de producto.
- **Número de venta repetido tras restaurar un respaldo:** caso no previsto. La copia que llega recibe un número nuevo de su serie y queda avisado.
- **Pruebas añadidas:** `apps/worker/test`, `pnpm --filter @bllt/desktop test:data` y `e2e/multi.mjs`.
