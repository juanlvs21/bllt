---
title: Confirmar la tasa del día
description: Cómo funciona la tasa BCV en Bllt y por qué cada venta guarda la suya.
order: 11
---

La primera vez que abres Bllt cada día (hora de Venezuela), te pide confirmar los bolívares por dólar. **Sin tasa confirmada no se pueden registrar ventas.**

## De dónde sale la sugerencia

- **Con nube:** el Worker consulta el BCV cada 6 horas y te muestra su última lectura.
- **Sin nube:** Bllt consulta directo una API pública al abrir y cuando pulsas **Buscar tasa**.
- **Sin internet:** la escribes a mano.

No existe una API oficial del BCV; todas leen su sitio web. Por eso la tasa automática es solo una **sugerencia**: la que vale es la que tú confirmas. La “fecha valor” del BCV aparece como dato informativo.

## Ejemplo

Hoy confirmas **855,6625 Bs/USD**. Una venta de $6,70 queda en **Bs 5.732,94**. Si en la tarde aceptas una tasa nueva de 860,00, las ventas de la mañana siguen con 855,6625.

## Cambios durante el día

Si la nube o el teléfono proponen otra tasa, aparece un aviso en el inicio con la tasa actual, la sugerida, su origen y la hora. Tú decides: **Aceptar** o **Descartar** (esa sugerencia no vuelve a salir).

También puedes corregirla cuando quieras tocando la tasa en la barra superior.
