<script lang="ts">
  import { SITE } from '$lib/site'
</script>

<svelte:head>
  <title>Licencia y marca · Bllt inventario</title>
  <meta
    name="description"
    content="Qué puedes hacer con el código de Bllt (Apache 2.0) y qué no con su nombre y logo."
  />
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-12">
  <article class="prose prose-neutral">
    <h1>Licencia y marca</h1>
    <p class="lead">El código de Bllt es libre. El nombre y el logo, no. En palabras simples:</p>
    <h2>El código: Apache License 2.0</h2>
    <ul>
      <li>Puedes usar Bllt gratis en tu negocio, sin límite de tiempo ni de ventas.</li>
      <li>Puedes leer, modificar y redistribuir el código, también con fines comerciales.</li>
      <li>
        Si lo redistribuyes, conserva el archivo <code>LICENSE</code> y el aviso
        <code>NOTICE</code>.
      </li>
      <li>Se entrega “tal cual”, sin garantías. El autor no responde por pérdidas.</li>
    </ul>
    <h2>La marca: todos los derechos reservados</h2>
    <p>
      La sección 6 de Apache 2.0 dice que la licencia no da permiso para usar nombres comerciales ni
      logos. “Bllt”, su logo, sus íconos y colores de marca son de Juan Villarroel.
    </p>
    <ul>
      <li>Sí puedes decir que tu proyecto está “basado en Bllt” y enlazar al repositorio.</li>
      <li>No puedes publicar un fork, app o servicio llamado Bllt (o parecido) ni usar su logo.</li>
      <li>
        Si haces un fork, cambia nombre, logo, íconos, appId y URLs de actualización antes de
        distribuirlo.
      </li>
    </ul>
    <p>
      Textos completos:
      <a href="{SITE.repo}/blob/main/LICENSE">LICENSE</a>,
      <a href="{SITE.repo}/blob/main/NOTICE">NOTICE</a> y
      <a href="{SITE.repo}/blob/main/TRADEMARKS.md">TRADEMARKS.md</a>. Para otros usos:
      <a href="mailto:bllt@juanl.dev">bllt@juanl.dev</a>.
    </p>
    <p><small>Esta página no reemplaza asesoría legal.</small></p>
  </article>
</main>
