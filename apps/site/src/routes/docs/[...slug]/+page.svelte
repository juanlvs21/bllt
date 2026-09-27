<script lang="ts">
  import { docs } from '$lib/docs'
  import { SITE } from '$lib/site'

  let { data } = $props()
  const doc = $derived(docs.find((d) => d.slug === data.slug)!)
</script>

<svelte:head>
  <title>{doc.title} · Bllt inventario</title>
  <meta name="description" content={doc.description} />
  <link rel="canonical" href="{SITE.url}/docs/{doc.slug}" />
</svelte:head>

<h1>{doc.title}</h1>
<p class="lead">{doc.description}</p>
<doc.component />
