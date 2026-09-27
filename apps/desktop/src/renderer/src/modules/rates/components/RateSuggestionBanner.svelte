<script lang="ts">
  import { Alert, Button } from '@bllt/ui'
  import BellIcon from '@lucide/svelte/icons/bell-ring'
  import { attempt } from '../../../lib/api'
  import { formatBusinessTime, formatRate, RATE_SOURCE_LABEL } from '../../../lib/format'
  import { ratesApi } from '../api'
  import { rateStore } from '../stores/rate.svelte'

  let busy = $state(false)
  const suggestion = $derived(rateStore.suggestion)
  const current = $derived(rateStore.confirmed)

  async function accept() {
    if (!suggestion) return
    busy = true
    await attempt(
      () =>
        ratesApi.confirm({
          bsPerUsd: suggestion.bsPerUsd,
          source: suggestion.source,
          candidateId: suggestion.candidateId ?? undefined
        }),
      'Tasa actualizada'
    )
    await rateStore.refresh()
    busy = false
  }

  async function dismiss() {
    if (!suggestion?.candidateId) return
    busy = true
    await attempt(() => ratesApi.dismiss(suggestion.candidateId!))
    await rateStore.refresh()
    busy = false
  }
</script>

{#if suggestion && current && suggestion.candidateId}
  <Alert.Root class="border-gold/50 bg-gold-soft">
    <BellIcon class="text-gold" />
    <Alert.Title>Nueva tasa sugerida</Alert.Title>
    <Alert.Description>
      <p>
        Actual <strong class="tabular">{formatRate(current.bsPerUsd)} Bs</strong> → sugerida
        <strong class="tabular">{formatRate(suggestion.bsPerUsd)} Bs</strong>
        · {RATE_SOURCE_LABEL[suggestion.source]} a las {formatBusinessTime(suggestion.fetchedAt)}
      </p>
      <p class="text-xs">Las ventas ya hechas conservan su propia tasa.</p>
      <div class="mt-2 flex gap-2">
        <Button size="sm" class="rounded-full" disabled={busy} onclick={accept}>Aceptar</Button>
        <Button size="sm" variant="ghost" disabled={busy} onclick={dismiss}>Descartar</Button>
      </div>
    </Alert.Description>
  </Alert.Root>
{/if}
