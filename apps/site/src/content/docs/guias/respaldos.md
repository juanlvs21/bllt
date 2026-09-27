---
title: Respaldos
description: Dónde quedan las copias automáticas y cómo restaurar una.
order: 14
---

Bllt respalda solo, sin que hagas nada:

- Una copia **cada vez que cierras** la app.
- Una copia **diaria** si queda abierta.
- Se guardan los **últimos 30 días**.

Van a `Documentos\Bllt\Backups` con nombres como `bllt-2026-09-27_183000.db`. Si tu carpeta Documentos está sincronizada con OneDrive, además quedan en la nube de Microsoft.

**Recomendación:** una vez por semana copia esa carpeta a un pendrive.

## Cambiar la carpeta

**Configuración → Respaldos → Cambiar carpeta** (solo administradores).

## Restaurar

1. **Configuración → Respaldos**.
2. Pulsa **Restaurar** junto al respaldo, o **Restaurar desde archivo…** para elegir uno de un pendrive.
3. Confirma. Antes de reemplazar, Bllt guarda una copia de la base actual (`antes-de-restaurar-…db`) y se reinicia.
