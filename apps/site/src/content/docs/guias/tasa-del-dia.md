---
title: Confirmar la tasa del día
description: Cómo funciona la tasa BCV en Bllt y por qué cada venta guarda la suya.
order: 11
---

La primera vez que abres Bllt cada día (hora de Venezuela), te pide confirmar los bolívares por dólar. **Sin tasa confirmada no se pueden registrar ventas.**

![Pantalla para confirmar la tasa del día con la tasa sugerida](/capturas/03-rate.png)

## De dónde sale la sugerencia

- **Con nube:** el Worker consulta el BCV cada 6 horas y te muestra su última lectura.
- **Sin nube:** Bllt consulta directo una API pública al entrar, cada hora mientras está abierto y cuando pulsas **Buscar tasa**.
- **Sin internet:** la escribes a mano.

No existe una API oficial del BCV; todas leen su sitio web. Por eso la tasa automática es solo una **sugerencia**: la que vale es la que tú confirmas. La “fecha valor” del BCV aparece como dato informativo.

## Ejemplo

Hoy confirmas **855,6625 Bs/USD**. Una venta de $6,70 queda en **Bs 5.732,94**. Si en la tarde aceptas una tasa nueva de 860,00, las ventas de la mañana siguen con 855,6625.

## Cambios durante el día

Si la nube, la API pública o el teléfono traen una tasa distinta a la que guardaste hoy, la tasa de la barra superior muestra la etiqueta **Nueva** con una flecha que indica si subió o bajó.

![Tasa de la barra superior con la etiqueta Nueva](/capturas/09-rate-badge.png)

Tócala para ver las dos tasas lado a lado: la **guardada** y la **nueva**, con cuánto subió o bajó (en Bs y en porcentaje), de dónde viene y a qué hora se consultó.

![Diálogo con la tasa guardada, la nueva y la variación](/capturas/10-rate-change.png)

Tú decides:

- **Usar la nueva:** pasa a ser la tasa del día. Las ventas que ya hiciste conservan la anterior.
- **Escribir otra:** abre el formulario para escribirla a mano.
- **Descartar:** te quedas con la guardada y esa sugerencia deja de avisar.

Las sugerencias de la nube también aparecen como aviso en el inicio. Sin avisos pendientes, tocar la tasa de la barra superior abre directamente el formulario para corregirla.
