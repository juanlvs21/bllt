---
title: Actualizar la nube
description: Trae la última versión de Bllt a tu Worker de Cloudflare con un botón en GitHub.
order: 18
---

El botón _Deploy to Cloudflare_ copió Bllt en **tu** cuenta de GitHub. Esa copia no cambia sola cuando sale una versión nueva: la actualizas tú, con un botón.

Si tu Worker está en una versión anterior, Bllt en la PC lo avisa en el inicio: “Tu Worker es de una versión anterior y algunos cambios esperan a que lo actualices”. Mientras tanto la PC sigue sincronizando todo lo que el Worker entiende; lo demás espera en la PC y sube al actualizar.

## Actualizar

1. Entra a [github.com](https://github.com) y abre el repositorio que creó el botón.
2. Ve a la pestaña **Actions** y elige **Update cloud** en la lista de la izquierda.
3. Pulsa **Run workflow** y confirma con el botón verde.

En un minuto termina. Si había versión nueva, verás “Actualizado a Bllt …” y Cloudflare la despliega sola en un par de minutos (con los cambios de la base de datos incluidos). Si no, dirá “Ya tienes la última versión.”

También corre sola cada lunes, así que normalmente no tienes que hacer nada.

> GitHub pausa las tareas automáticas de un repositorio que pasa 60 días sin cambios. Si recibes ese correo o la PC te avisa que el Worker está desactualizado, actualiza a mano con los pasos de arriba.

## Qué cambia y qué no

- **Se conserva** `wrangler.jsonc` en lo que es de tu despliegue: el nombre del Worker, la base de datos D1 y los dominios propios. Tus datos no se tocan.
- **Se reemplaza** todo lo demás por la versión nueva. Si modificaste el código, esos cambios se pierden en la actualización (siguen en el historial del repositorio).
