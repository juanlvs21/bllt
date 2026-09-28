<script lang="ts">
  import { RateSource } from '@bllt/shared'
  import { Button, RateInput, cn } from '@bllt/ui'
  import GlobeIcon from '@lucide/svelte/icons/globe'
  import RefreshIcon from '@lucide/svelte/icons/refresh-cw'
  import SmartphoneIcon from '@lucide/svelte/icons/smartphone'
  import { onMount } from 'svelte'
  import type { RateSuggestion } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { formatBusinessDate, formatBusinessTime, formatRate } from '../../../lib/format'
  import { ratesApi } from '../api'
  import { rateStore } from '../stores/rate.svelte'

  let { onConfirmed }: { onConfirmed?: () => void } = $props()

  const internet = $derived(rateStore.internet)
  const phone = $derived(rateStore.phone)

  let value = $state<number | null>(
    rateStore.phone?.bsPerUsd ??
      rateStore.internet?.bsPerUsd ??
      rateStore.confirmed?.bsPerUsd ??
      null
  )
  let searching = $state(false)
  let searchFailed = $state(false)
  let saving = $state(false)

  /** Always asks the internet; the phone suggestion comes along from the Worker. */
  async function search() {
    const before = rateStore.internet?.bsPerUsd
    searching = true
    const today = await attempt(() => rateStore.search())
    searching = false
    searchFailed = !today?.internet
    const found = today?.internet
    // Only replace a value the user didn't pick or type themselves.
    if (
      found &&
      !today.phone &&
      (value === null || value === before || value === rateStore.confirmed?.bsPerUsd)
    )
      value = found.bsPerUsd
  }

  onMount(() => void search())

  const chosen = $derived.by((): RateSuggestion | null => {
    if (phone && value === phone.bsPerUsd) return phone
    if (internet && value === internet.bsPerUsd) return internet
    return null
  })

  async function confirm() {
    if (!value) return
    saving = true
    const saved = await attempt(
      () =>
        ratesApi.confirm({
          bsPerUsd: value!,
          source: chosen?.source ?? RateSource.MANUAL,
          candidateId: chosen?.candidateId ?? undefined
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

{#snippet option(
  suggestion: RateSuggestion | null,
  label: string,
  Icon: typeof GlobeIcon,
  detail: string,
  empty: string
)}
  {@const selected = !!suggestion && chosen?.id === suggestion.id}
  <button
    type="button"
    class={cn(
      'bg-muted/60 rounded-xl p-4 text-left ring-1 transition',
      selected ? 'ring-primary bg-primary/5' : 'ring-transparent',
      suggestion && 'hover:ring-primary/50'
    )}
    disabled={!suggestion}
    aria-pressed={selected}
    onclick={() => suggestion && (value = suggestion.bsPerUsd)}
  >
    <p class="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase">
      <Icon class="size-3.5" />
      {label}
    </p>
    {#if suggestion}
      <p class="tabular mt-1 text-xl font-bold">{formatRate(suggestion.bsPerUsd)} Bs</p>
      <p class="text-muted-foreground mt-1 text-xs">{detail}</p>
    {:else}
      <p class="text-muted-foreground mt-1 text-sm">{empty}</p>
    {/if}
  </button>
{/snippet}

<div class="space-y-5">
  <div class={cn('grid gap-3', phone && 'grid-cols-2')}>
    {@render option(
      searching && !internet ? null : internet,
      'Internet',
      GlobeIcon,
      internet
        ? `${internet.provider} · ${formatBusinessTime(internet.fetchedAt)}${internet.valueDate ? ` · fecha valor BCV ${formatBusinessDate(internet.valueDate)}` : ''}`
        : '',
      searching
        ? 'Buscando en internet…'
        : searchFailed
          ? 'No se pudo consultar (¿sin internet?). Escríbela a mano.'
          : 'Sin consultar todavía.'
    )}
    {#if phone}
      {@render option(
        phone,
        'Teléfono',
        SmartphoneIcon,
        `Sugerida a las ${formatBusinessTime(phone.fetchedAt)}`,
        ''
      )}
    {/if}
  </div>

  <div class="space-y-2">
    <label for="rate" class="text-sm font-semibold">Bolívares por dólar</label>
    <RateInput id="rate" bind:value placeholder="0,0000" />
    {#if value && !chosen}
      <p class="text-muted-foreground text-xs">Se guardará como tasa manual.</p>
    {/if}
    {#if phone && chosen !== phone}
      <p class="text-muted-foreground text-xs">
        Al confirmar otra tasa, la del teléfono queda rechazada.
      </p>
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
