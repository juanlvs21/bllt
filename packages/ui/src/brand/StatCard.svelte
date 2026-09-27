<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../lib/utils'

  let {
    label,
    value,
    secondary = undefined,
    hint = undefined,
    tone = 'default',
    icon = undefined,
    class: className = ''
  }: {
    label: string
    value: string
    secondary?: string
    hint?: string
    tone?: 'default' | 'primary' | 'gold'
    icon?: Snippet
    class?: string
  } = $props()
</script>

<div
  class={cn(
    'bg-card text-card-foreground ring-foreground/10 flex flex-col gap-2 rounded-2xl p-5 ring-1',
    tone === 'primary' && 'bg-primary text-primary-foreground ring-0',
    tone === 'gold' && 'bg-gold-soft ring-gold/30',
    className
  )}
>
  <div class="flex items-center justify-between gap-2">
    <span
      class={cn(
        'text-xs font-semibold tracking-wide uppercase',
        tone === 'primary' ? 'text-primary-foreground/80' : 'text-muted-foreground'
      )}>{label}</span
    >
    {@render icon?.()}
  </div>
  <span class="tabular text-2xl leading-tight font-bold">{value}</span>
  {#if secondary}
    <span
      class={cn(
        'tabular text-sm',
        tone === 'primary' ? 'text-primary-foreground/85' : 'text-muted-foreground'
      )}>{secondary}</span
    >
  {/if}
  {#if hint}
    <span
      class={cn(
        'text-xs',
        tone === 'primary' ? 'text-primary-foreground/75' : 'text-muted-foreground'
      )}>{hint}</span
    >
  {/if}
</div>
