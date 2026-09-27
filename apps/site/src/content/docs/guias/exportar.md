---
title: Exportar ventas
description: Descarga tus ventas en Excel o CSV por rango de fechas.
order: 15
---

En **Configuración → Exportar** (solo administradores):

1. Elige fecha de inicio y de fin (días en hora de Venezuela).
2. Elige **Excel (.xlsx)** o **CSV**.
3. Pulsa **Exportar**.

Se genera en segundo plano, así que puedes seguir vendiendo. Al terminar aparece una notificación y el archivo queda en `Documentos\Bllt\Exports`, por ejemplo `ventas_2026-09-01_a_2026-09-30.xlsx`.

Cada fila es una línea de venta con: número, fecha y hora, estado, cliente (o *Anónimo*), cédula/RIF, usuario, tasa, producto, cantidad, precio, total en USD y Bs, costo y ganancia en USD y Bs. Las ventas anuladas aparecen marcadas y con ganancia cero.
