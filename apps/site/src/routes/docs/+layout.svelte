<script lang="ts">
  import { page } from '$app/state'
  import { cn } from '@bllt/ui'
  import { guides, mainDocs } from '$lib/docs'

  let { children } = $props()
  const link = (slug: string) =>
    cn(
      'block rounded-lg px-3 py-1.5 text-sm',
      page.url.pathname === `/docs/${slug}`
        ? 'bg-secondary text-secondary-foreground font-semibold'
        : 'text-muted-foreground hover:text-foreground'
    )
</script>

<div class="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-[220px_minmax(0,1fr)]">
  <aside class="space-y-6 md:sticky md:top-24 md:self-start">
    <div>
      <p class="mb-2 px-3 text-xs font-semibold tracking-wide uppercase">Empezar</p>
      {#each mainDocs as d (d.slug)}<a class={link(d.slug)} href="/docs/{d.slug}">{d.title}</a
        >{/each}
    </div>
    <div>
      <p class="mb-2 px-3 text-xs font-semibold tracking-wide uppercase">Guías</p>
      {#each guides as d (d.slug)}<a class={link(d.slug)} href="/docs/{d.slug}">{d.title}</a>{/each}
    </div>
  </aside>
  <article class="prose prose-neutral max-w-3xl min-w-0">
    {@render children()}
  </article>
</div>
