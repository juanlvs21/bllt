---
title: Instalar en Windows
description: Paso a paso para instalar Bllt en Windows 10 o superior, incluida la advertencia de SmartScreen.
order: 1
---

## 1. Descarga el instalador

Entra a la [página de descargas](https://github.com/juanlvs21/bllt/releases/latest) y baja el archivo que termina en `-setup.exe`, por ejemplo `Bllt-0.1.0-setup.exe`. Pesa unos 90 MB.

## 2. Pasa la advertencia de SmartScreen

Bllt todavía no tiene certificado de firma de código (cuesta dinero cada año), así que Windows muestra **“Windows protegió su PC”** la primera vez. Es normal:

1. Haz clic en **Más información**.
2. Verifica que el editor diga *Desconocido* y el archivo sea `Bllt-…-setup.exe`.
3. Haz clic en **Ejecutar de todas formas**.

Descarga el instalador solo desde GitHub o desde este sitio.

## 3. Sigue el asistente

- Elige si instalar solo para tu usuario y en qué carpeta.
- Deja marcada la opción de crear el acceso directo en el escritorio.
- Al terminar, abre **Bllt**.

## 4. Actualizaciones

Bllt revisa GitHub al abrir y cada 6 horas. Si hay versión nueva, la baja en segundo plano (solo lo que cambió, para cuidar los datos) y la instala al cerrar la app. Tus datos no se tocan.

## ¿Dónde quedan mis datos?

- La base de datos vive en `%APPDATA%\Bllt\bllt.db`.
- Los respaldos van a `Documentos\Bllt\Respaldos` y las exportaciones a `Documentos\Bllt\Exportaciones`.

Sigue con el [primer arranque](/docs/guias/primer-arranque).
