---
title: Registrar una venta
description: Ventas con o sin cliente, comprobante en PDF y anulación.
order: 12
---

Ve a **Nueva venta**.

1. Escribe el código o el nombre del producto y pulsa **Enter**. También puedes tocar el producto en la lista.
2. Ajusta cantidades con **+** y **−**. Bllt no deja vender más de lo que hay en inventario.
3. **Cliente (opcional):** déjalo en _Venta anónima_ o búscalo por nombre o cédula. Puedes registrar uno nuevo ahí mismo.
4. Pulsa **Registrar venta**. Se abre un resumen con los productos, el cliente y los totales en USD y Bs; revísalo y pulsa **Confirmar venta** (o **Volver** para seguir editando).

![Nueva venta con el carrito lleno y un cliente elegido](/capturas/06-new-sale.png)

![Resumen de la venta antes de confirmarla](/capturas/11-sale-summary.png)

Se descuenta el inventario y se abre el comprobante con los montos en USD y Bs.

> **El número de la venta lleva una letra.** Cada PC factura con su propia serie (`A`, `B`…), así dos PCs nunca repiten un número aunque vendan a la vez y sin internet. Si usas una sola PC, todas tus ventas son `A-…`. Las ventas que ya tenías conservan su número: la 123 pasa a verse `A-000123`.

![Comprobante de la venta en la app](/capturas/07-invoice.png)

## Comprobante en PDF

En el comprobante pulsa **Imprimir**. Bllt genera un PDF tamaño carta y lo abre en una vista previa:

- Lleva el logo, el nombre y el RIF del negocio, el número (por ejemplo `A-000123`) y la fecha de la venta, el cliente, la tasa del día y cada producto con su total en USD y Bs.
- Si la venta es larga ocupa varias páginas; el membrete y el pie se repiten en cada una.
- Desde la vista previa lo **imprimes** o lo **guardas**. Al guardar, Bllt propone la carpeta `Documentos\Bllt\Receipts` y un nombre como `Venta-A-001658.pdf`.

![Vista previa del comprobante en PDF](/capturas/12-receipt-pdf.png)

## Ejemplo

Tasa 855,6625. Vendes 2 × Harina PAN a $1,40 (costo $0,95) y 1 × café a $3,90 (costo $2,80):

|          | USD   | Bs          |
| -------- | ----- | ----------- |
| Total    | $6,70 | Bs 5.732,94 |
| Ganancia | $2,00 | Bs 1.711,33 |

La ganancia de cada línea es `cantidad × (precio − costo)`. Bllt guarda el precio y el costo del momento, así que cambiar precios después no altera ventas pasadas.

## Anular una venta

Solo un administrador puede anularla, desde **Ventas → abrir la venta → Anular venta**. La venta queda marcada como anulada (no se borra), deja de contar en ganancias y los productos vuelven al inventario.

## Historial por cliente

En **Clientes**, el botón de historial muestra todas las compras de esa persona.

> Bllt emite un comprobante interno, no una factura fiscal del SENIAT.
