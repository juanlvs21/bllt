<script lang="ts">
  import { Button, Tooltip, cn } from '@bllt/ui'
  import RefreshIcon from '@lucide/svelte/icons/refresh-cw'
  import { onMount } from 'svelte'
  import type { SyncStatus } from '../../../types/api'
  import { attempt } from '../lib/api'
  import { formatRelative, plural } from '../lib/format'
  import { dashboardApi } from '../modules/dashboard/api'
  import { rateStore } from '../modules/rates/stores/rate.svelte'

  let status = $state<SyncStatus | null>(null)

  onMount(() => {
    void dashboardApi.syncStatus().then((s) => (status = s))
    return window.api.events.onSyncStatus((s) => (status = s))
  })

  /** Pushes pending changes now and brings back the phone suggestion. */
  async function syncNow() {
    const s = await attempt(() => dashboardApi.syncNow())
    if (!s) return
    status = s
    await rateStore.refresh()
  }

  const label = $derived.by(() => {
    if (!status) return ''
    if (status.running) return 'Sincronizando…'
    if (status.lastError) return `${status.lastError}. Toca para reintentar.`
    if (status.pending > 0)
      return `${plural(status.pending, 'cambio pendiente', 'cambios pendientes')}. Sincronizar ahora`
    return status.lastSyncAt
      ? `Sincronizado ${formatRelative(status.lastSyncAt)}. Sincronizar ahora`
      : 'Sincronizar ahora'
  })
</script>

{#if status?.configured}
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          size="icon"
          class="relative"
          disabled={status!.running}
          onclick={syncNow}
          aria-label={label}
        >
          <RefreshIcon class={status!.running ? 'animate-spin' : ''} />
          {#if status!.lastError || status!.pending > 0}
            <span
              class={cn(
                'absolute top-1.5 right-1.5 size-2 rounded-full',
                status!.lastError ? 'bg-destructive' : 'bg-gold'
              )}
              aria-hidden="true"
            ></span>
          {/if}
        </Button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>{label}</Tooltip.Content>
  </Tooltip.Root>
{/if}
