<script lang="ts">
  import { formatBs, formatUsd, usdCentsToBsCents } from '@bllt/shared'
  import { cn } from '../lib/utils'

  let {
    usdCents,
    bsCents = undefined,
    rate = undefined,
    class: className = '',
    stacked = false
  }: {
    usdCents: number
    /** Explicit Bs amount; otherwise computed from `rate` when given. */
    bsCents?: number
    rate?: number
    class?: string
    stacked?: boolean
  } = $props()

  const bs = $derived(bsCents ?? (rate ? usdCentsToBsCents(usdCents, rate) : undefined))
</script>

<span class={cn('tabular inline-flex', stacked ? 'flex-col' : 'items-baseline gap-2', className)}>
  <span class="font-semibold">{formatUsd(usdCents)}</span>
  {#if bs !== undefined}
    <span class="text-muted-foreground text-[0.85em]">{formatBs(bs)}</span>
  {/if}
</span>
