---
title: Respaldos
description: Dónde quedan las copias automáticas y cómo restaurar una.
order: 14
---

Bllt respalda solo, sin que hagas nada:

- Una copia **diaria**, la primera vez que abres Bllt cada día.
- Se guardan los **últimos 7 días**.
- Cuando quieras, pulsa **Respaldar ahora** en **Configuración → Respaldos**.

![Configuración, pestaña Respaldos](/capturas/15-backups.png)

Van a `Documentos\Bllt\Backups` con nombres como `bllt-2026-09-27_183000.db`. Si tu carpeta Documentos está sincronizada con OneDrive, además quedan en la nube de Microsoft.

**Recomendación:** una vez por semana copia esa carpeta a un pendrive.

## Cambiar la carpeta

**Configuración → Respaldos → Cambiar carpeta** (solo administradores).

## Restaurar

1. **Configuración → Respaldos**.
2. Pulsa **Restaurar** junto al respaldo, o **Restaurar desde archivo…** para elegir uno de un pendrive.
3. Confirma. Antes de reemplazar, Bllt guarda una copia de la base actual (`antes-de-restaurar-…db`) y se reinicia.

Si usas la nube, lo que esa PC no había subido antes de la fecha del respaldo se pierde, igual que sin nube. Lo que ya estaba en la nube vuelve solo: al reiniciar, Bllt lo descarga de nuevo.

## Copia antes de actualizar

Cuando una versión nueva de Bllt tiene que cambiar tu base de datos, antes de hacerlo guarda una copia en la misma carpeta, con un nombre como `premigracion-2026-10-04-….db`. Esa copia no se borra sola. Si algo saliera mal, restáurala desde **Restaurar desde archivo…**.
