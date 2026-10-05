---
title: Usar varias PCs
description: Conecta una segunda PC al negocio para vender en una y supervisar desde la otra, o para cambiar de PC si una se traba.
order: 19
---

Con la [nube](/docs/nube) puedes tener Bllt en varias PCs del mismo negocio, con los mismos productos, clientes, usuarios, ventas e inventario. Por ejemplo: la cajera vende en una PC y el dueño supervisa desde otra, o si una PC se traba puedes seguir atendiendo en la otra.

Cada PC sigue funcionando **sin internet**. Cuando hay conexión, sube lo que hizo y baja lo que hicieron las demás, cada 45 segundos o cuando pulsas el botón de sincronizar.

## Pasar de una PC a dos

1. **Actualiza la nube** de tu negocio si no lo has hecho ([guía](/docs/guias/actualizar-nube)).
2. **Actualiza Bllt en la PC que ya usas.** Antes de tocar tus datos hace una copia (`premigracion-….db` en la carpeta de respaldos). Tus ventas pasan a la serie `A`: la 123 se verá `A-000123`.
3. En esa PC, en **Configuración → Nube**, pega la URL del Worker y el `SYNC_TOKEN`, ponle un nombre (por ejemplo “Caja 1”) y pulsa **Conectar**. Sube todos tus datos una sola vez.
4. **Espera a que el inicio diga “Todo al día”** y no queden cambios por subir. Mientras tanto no hay prisa: esa PC funciona igual que siempre.
5. **Instala Bllt en la segunda PC.** En la primera pantalla pega la URL y el `SYNC_TOKEN`, ponle un nombre (“Caja 2”) y pulsa **Conectar**. Descarga todo con una barra de avance y te lleva al inicio de sesión. Entra con tus usuarios de siempre.

![Primera pantalla de Bllt en una segunda PC, con la URL del Worker, el SYNC_TOKEN y el nombre de la PC](/capturas/17-join-pc.png)

> Si la segunda PC intenta conectarse mientras la primera sigue subiendo, Bllt te pide esperar: así no baja datos a medias.

## Qué pasa cuando las dos trabajan a la vez

| Situación                                   | Resultado                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Las dos venden el mismo producto            | El inventario refleja ambas ventas. Si se vendió la última unidad en las dos, queda en negativo y el inicio te avisa para que lo cuentes y lo ajustes. |
| Número de factura                           | Cada PC usa su letra: `A-000123`, `B-000045`. Nunca se repiten.                                                                                        |
| Editan el mismo producto, cliente o usuario | Queda el último cambio. Mira la nota de abajo sobre la hora de las PCs.                                                                                |
| Una anula una venta                         | Queda anulada en todas, y el inventario vuelve una sola vez.                                                                                           |
| Dos productos nuevos con el mismo código    | Los dos existen: uno conserva el código y el otro pasa a `CÓDIGO-2`. El inicio te avisa para que lo revises.                                           |
| Cada una confirma una tasa distinta         | Queda la última que se confirmó. Las ventas ya hechas conservan su propia tasa.                                                                        |

> **Mantén bien la hora de las PCs.** Para decidir cuál fue el último cambio, Bllt compara la hora de cada PC. Una PC con el reloj atrasado perdería ediciones frente a la otra (nunca ventas ni inventario).

## Ver el estado

En el **Inicio**, la tarjeta de la nube dice cuándo subió y bajó esta PC por última vez, cuántos cambios faltan en cada sentido y hasta cuándo llegaron los datos de las otras PCs (“Caja 2: datos hasta hace 2 h”).

![Tarjeta de la nube en el inicio: todo al día, cuándo subió y bajó, y hasta cuándo llegaron los datos de Caja 2](/capturas/18-sync-status.png)

En **Configuración → Nube** (solo administradores) ves la lista de PCs con su serie y última conexión, y los avisos de casos que Bllt resolvió solo.

![Configuración, pestaña Nube, con Caja 1 y Caja 2 conectadas](/capturas/14-cloud.png)

## Si pierdes o te roban una PC

En **Configuración → Nube**, junto a esa PC, pulsa **Desactivar**. Deja de poder sincronizar de inmediato; lo que ya vendió se conserva. Si fue un error, vuelve a conectarla con el `SYNC_TOKEN`.

## Respaldos y restaurar

Cada PC respalda su propia base. Al restaurar un respaldo, lo que esa PC no había subido antes de esa fecha se pierde, y lo que ya estaba en la nube vuelve solo. Mira [Respaldos](/docs/guias/respaldos).
