<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    description = undefined,
    actions = undefined
  }: { title: string; description?: string; actions?: Snippet } = $props()
</script>

<div class="flex flex-wrap items-end justify-between gap-4 pt-2 pb-6">
  <div>
    <h1 class="text-primary text-2xl font-semibold tracking-wide uppercase">{title}</h1>
    {#if description}<p class="text-muted-foreground mt-1 text-sm">{description}</p>{/if}
  </div>
  {#if actions}<div class="flex items-center gap-2">{@render actions()}</div>{/if}
</div>
