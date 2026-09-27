---
title: Si pierdes el teléfono
description: Cierra todas las sesiones del teléfono rotando un secreto.
order: 17
---

La sesión del teléfono dura 30 días. Si lo pierdes o te lo roban:

1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers** → tu Worker de Bllt → **Settings → Variables and Secrets**.
2. Edita `JWT_SECRET` y pon un valor nuevo al azar. Guarda.

Todas las sesiones abiertas se cierran al instante. Vuelve a entrar desde tu teléfono nuevo.

Si además crees que alguien conoce tu contraseña, cámbiala en la PC (**Configuración → Mi cuenta**); el cambio sube con la siguiente sincronización.

Para desactivar a un empleado que se fue con su teléfono, desactívalo en **Configuración → Usuarios**: su sesión muere en la siguiente sincronización.
