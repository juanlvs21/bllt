<script lang="ts">
  import { Badge, Button, Dialog, cn } from '@bllt/ui'
  import TrendingUpIcon from '@lucide/svelte/icons/trending-up'
  import TrendingDownIcon from '@lucide/svelte/icons/trending-down'
  import { attempt } from '../../../lib/api'
  import {
    formatBusinessDate,
    formatBusinessTime,
    formatRate,
    RATE_SOURCE_LABEL
  } from '../../../lib/format'
  import { ratesApi } from '../api'
  import { rateStore } from '../stores/rate.svelte'

  let { open = $bindable(false), onManual }: { open?: boolean; onManual: () => void } = $props()

  let busy = $state(false)
  // Kept while the dialog closes so the content doesn't vanish mid-animation.
  let shown = $state(rateStore.change)
  const current = $derived(rateStore.confirmed)
  $effect(() => {
    if (rateStore.change) shown = rateStore.change
  })

  const diff = $derived(current && shown ? shown.bsPerUsd - current.bsPerUsd : 0)
  const up = $derived(diff > 0)
  const percent = $derived(current && shown ? (Math.abs(diff) / current.bsPerUsd) * 100 : 0)

  async function accept() {
    if (!shown) return
    busy = true
    const saved = await attempt(
      () =>
        ratesApi.confirm({
          bsPerUsd: shown!.bsPerUsd,
          source: shown!.source,
          candidateId: shown!.candidateId ?? undefined
        }),
      'Tasa actualizada'
    )
    if (saved) {
      await rateStore.refresh()
      open = false
    }
    busy = false
  }

  async function dismiss() {
    if (!shown) return
    busy = true
    await attempt(() => rateStore.dismiss(shown!))
    busy = false
    open = false
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>La tasa cambió</Dialog.Title>
      <Dialog.Description>
        Hay una tasa más reciente que la que guardaste hoy. Las ventas ya hechas conservan su propia
        tasa.
      </Dialog.Description>
    </Dialog.Header>
    {#if current && shown}
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-muted/60 rounded-xl p-4">
          <p class="text-muted-foreground text-xs font-semibold uppercase">Guardada</p>
          <p class="tabular mt-1 text-xl font-bold">{formatRate(current.bsPerUsd)} Bs</p>
          <p class="text-muted-foreground mt-1 text-xs">
            {RATE_SOURCE_LABEL[current.source]} · {formatBusinessTime(current.confirmedAt)}
          </p>
        </div>
        <div
          class={cn(
            'rounded-xl p-4 ring-1',
            up ? 'bg-destructive/5 ring-destructive/30' : 'bg-primary/5 ring-primary/30'
          )}
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-muted-foreground text-xs font-semibold uppercase">Nueva</p>
            <span
              class={cn(
                'flex items-center gap-1 text-xs font-semibold',
                up ? 'text-destructive' : 'text-primary'
              )}
            >
              {#if up}
                <TrendingUpIcon class="size-4" aria-label="Subió" />
              {:else}
                <TrendingDownIcon class="size-4" aria-label="Bajó" />
              {/if}
              <span class="tabular"
                >{percent.toLocaleString('es-VE', { maximumFractionDigits: 2 })}%</span
              >
            </span>
          </div>
          <p class="tabular mt-1 text-xl font-bold">{formatRate(shown.bsPerUsd)} Bs</p>
          <p class="text-muted-foreground mt-1 text-xs">
            {up ? 'Subió' : 'Bajó'}
            <span class="tabular">{formatRate(Math.abs(diff))} Bs</span>
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary">{RATE_SOURCE_LABEL[shown.source]}</Badge>
        <span class="text-muted-foreground">
          {shown.provider} · consultada a las {formatBusinessTime(shown.fetchedAt)}
          {#if shown.valueDate}· fecha valor BCV {formatBusinessDate(shown.valueDate)}{/if}
        </span>
      </div>
    {/if}
    <Dialog.Footer class="gap-2">
      <Button variant="ghost" disabled={busy} onclick={dismiss}>Descartar</Button>
      <Button variant="outline" class="rounded-full" disabled={busy} onclick={onManual}>
        Escribir otra
      </Button>
      <Button class="rounded-full" disabled={busy} onclick={accept}>Usar la nueva</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
