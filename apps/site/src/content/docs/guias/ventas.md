---
title: Registrar una venta
description: Ventas con o sin cliente, lector de código de barras, factura y anulación.
order: 12
---

Ve a **Nueva venta**.

1. Escanea el código o escríbelo y pulsa **Enter**. También puedes tocar el producto en la lista.
2. Ajusta cantidades con **+** y **−**. Bllt no deja vender más de lo que hay en inventario.
3. **Cliente (opcional):** déjalo en *Venta anónima* o búscalo por nombre o cédula. Puedes registrar uno nuevo ahí mismo.
4. Pulsa **Registrar venta**.

Se descuenta el inventario y se abre el comprobante con los montos en USD y Bs. Puedes imprimirlo.

## Ejemplo

Tasa 855,6625. Vendes 2 × Harina PAN a $1,40 (costo $0,95) y 1 × café a $3,90 (costo $2,80):

| | USD | Bs |
| --- | --- | --- |
| Total | $6,70 | Bs 5.732,94 |
| Ganancia | $2,00 | Bs 1.711,33 |

La ganancia de cada línea es `cantidad × (precio − costo)`. Bllt guarda el precio y el costo del momento, así que cambiar precios después no altera ventas pasadas.

## Anular una venta

Solo un administrador puede anularla, desde **Ventas → abrir la venta → Anular venta**. La venta queda marcada como anulada (no se borra), deja de contar en ganancias y los productos vuelven al inventario.

## Historial por cliente

En **Clientes**, el botón de historial muestra todas las compras de esa persona.

> Bllt emite un comprobante interno, no una factura fiscal del SENIAT.
