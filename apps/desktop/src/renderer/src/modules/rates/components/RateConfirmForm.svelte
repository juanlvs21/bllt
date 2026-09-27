<script lang="ts">
  import { RateSource } from '@bllt/shared'
  import { Badge, Button, RateInput } from '@bllt/ui'
  import RefreshIcon from '@lucide/svelte/icons/refresh-cw'
  import type { RateSuggestion } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import {
    formatBusinessDate,
    formatBusinessTime,
    formatRate,
    RATE_SOURCE_LABEL
  } from '../../../lib/format'
  import { ratesApi } from '../api'
  import { rateStore } from '../stores/rate.svelte'

  let { onConfirmed }: { onConfirmed?: () => void } = $props()

  let suggestion = $state<RateSuggestion | null>(rateStore.suggestion)
  let value = $state<number | null>(
    rateStore.suggestion?.bsPerUsd ?? rateStore.confirmed?.bsPerUsd ?? null
  )
  let searching = $state(false)
  let saving = $state(false)
  let searched = $state(false)

  async function search() {
    searching = true
    const found = await attempt(() => ratesApi.fetchSuggestion())
    searching = false
    searched = true
    if (found) {
      suggestion = found
      value = found.bsPerUsd
    }
  }

  $effect(() => {
    if (!suggestion && !searched) void search()
  })

  const matchesSuggestion = $derived(!!suggestion && value === suggestion.bsPerUsd)

  async function confirm() {
    if (!value) return
    saving = true
    const saved = await attempt(
      () =>
        ratesApi.confirm({
          bsPerUsd: value!,
          source: matchesSuggestion ? suggestion!.source : RateSource.MANUAL,
          candidateId: matchesSuggestion ? (suggestion!.candidateId ?? undefined) : undefined
        }),
      'Tasa del día confirmada'
    )
    saving = false
    if (saved) {
      await rateStore.refresh()
      onConfirmed?.()
    }
  }
</script>

<div class="space-y-5">
  <div class="bg-muted/60 rounded-xl p-4">
    {#if searching}
      <p class="text-muted-foreground text-sm">Buscando la tasa sugerida…</p>
    {:else if suggestion}
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="text-muted-foreground text-xs font-semibold uppercase">Tasa sugerida</p>
          <p class="tabular text-xl font-bold">{formatRate(suggestion.bsPerUsd)} Bs</p>
        </div>
        <Badge variant="secondary">{RATE_SOURCE_LABEL[suggestion.source]}</Badge>
      </div>
      <p class="text-muted-foreground mt-2 text-xs">
        {suggestion.provider} · consultada a las {formatBusinessTime(suggestion.fetchedAt)}
        {#if suggestion.valueDate}· fecha valor BCV {formatBusinessDate(suggestion.valueDate)}{/if}
      </p>
    {:else}
      <p class="text-muted-foreground text-sm">
        No hay tasa sugerida (sin internet o sin nube). Escríbela a mano.
      </p>
    {/if}
  </div>

  <div class="space-y-2">
    <label for="rate" class="text-sm font-semibold">Bolívares por dólar</label>
    <RateInput id="rate" bind:value placeholder="0,0000" />
    {#if value && suggestion && !matchesSuggestion}
      <p class="text-muted-foreground text-xs">Se guardará como tasa manual.</p>
    {/if}
  </div>

  <div class="flex gap-3">
    <Button variant="outline" class="h-11 rounded-full" disabled={searching} onclick={search}>
      <RefreshIcon class={searching ? 'animate-spin' : ''} />
      Buscar tasa
    </Button>
    <Button class="h-11 flex-1 rounded-full" disabled={!value || saving} onclick={confirm}>
      Confirmar tasa
    </Button>
  </div>
</div>
