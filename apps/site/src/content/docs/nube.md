---
title: Nube en Cloudflare (opcional)
description: Despliega tu propio Worker gratis para ver el resumen desde el teléfono y sugerir la tasa.
order: 2
---

La nube es **opcional**. Sin ella Bllt funciona igual; con ella puedes:

- Ver ganancias del día y del mes y las ventas de hoy desde el teléfono.
- Recibir la tasa BCV automática cada 6 horas como sugerencia.
- Sugerir la tasa desde el teléfono (la PC decide si la acepta).

Cada negocio tiene su propio Worker en su propia cuenta de Cloudflare. Nadie más ve tus datos, y el plan gratis alcanza de sobra (usa 4 ejecuciones programadas al día).

## 1. Crea una cuenta en Cloudflare

Entra a [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) y regístrate. No hace falta tarjeta.

## 2. Pulsa el botón de despliegue

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/juanlvs21/bllt/tree/main/apps/worker)

El asistente crea el Worker, la base D1 y la tarea programada. Te pedirá dos secretos:

| Secreto | Qué poner |
| --- | --- |
| `SYNC_TOKEN` | Una clave larga al azar (por ejemplo, 40 letras y números). La pegarás en la PC. |
| `JWT_SECRET` | Otra clave larga distinta. Sirve para las sesiones del teléfono. |

Anota el `SYNC_TOKEN` antes de continuar.

## 3. Copia la URL

Al terminar verás una dirección como `https://bllt.tu-usuario.workers.dev`. Ábrela: debe aparecer la pantalla de inicio de sesión.

## 4. Pégala en la PC

En Bllt: **Configuración → Nube**. Pega la URL y el `SYNC_TOKEN`, pulsa **Guardar** y luego **Probar conexión**.

En el inicio verás “Sincronizado hace 1 min”. Si la conexión cae, los cambios se acumulan y suben solos al volver.

## 5. Instala la app en el teléfono

Sigue la guía [Instalar en el teléfono](/docs/guias/telefono).
