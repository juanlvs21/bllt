<script lang="ts">
  import { Button, Card } from '@bllt/ui'
  import CloudIcon from '@lucide/svelte/icons/cloud'
  import CloudOffIcon from '@lucide/svelte/icons/cloud-off'
  import RefreshIcon from '@lucide/svelte/icons/refresh-cw'
  import { onMount } from 'svelte'
  import type { SyncStatus } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { formatRelative, plural } from '../../../lib/format'
  import { router } from '../../../lib/router.svelte'
  import { session } from '../../../lib/session.svelte'
  import { dashboardApi } from '../api'

  let status = $state<SyncStatus | null>(null)
  let now = $state(new Date())

  onMount(() => {
    void dashboardApi.syncStatus().then((s) => (status = s))
    const off = window.api.events.onSyncStatus((s) => (status = s))
    const tick = setInterval(() => (now = new Date()), 30_000)
    return () => {
      off()
      clearInterval(tick)
    }
  })

  async function syncNow() {
    const s = await attempt(() => dashboardApi.syncNow())
    if (s) status = s
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title class="flex items-center gap-2">
      {#if status?.configured}
        <CloudIcon class="text-primary size-5" />
      {:else}
        <CloudOffIcon class="text-muted-foreground size-5" />
      {/if}
      Nube
    </Card.Title>
    {#if status?.configured}
      <Card.Action>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={status.running}
          onclick={syncNow}
          aria-label="Sincronizar ahora"
        >
          <RefreshIcon class={status.running ? 'animate-spin' : ''} />
        </Button>
      </Card.Action>
    {/if}
  </Card.Header>
  <Card.Content class="space-y-1 text-sm">
    {#if !status}
      <p class="text-muted-foreground">…</p>
    {:else if !status.configured}
      <p class="text-muted-foreground">
        Sin nube: todo funciona igual, solo que no verás el resumen en el teléfono.
      </p>
      {#if session.isAdmin}
        <Button
          variant="link"
          class="h-auto px-0"
          onclick={() => router.go('settings', { tab: 'cloud' })}
        >
          Configurar Worker
        </Button>
      {/if}
    {:else}
      <p class="font-medium">
        {#if status.pending > 0}
          {plural(status.pending, 'cambio pendiente', 'cambios pendientes')} por subir
        {:else if status.lastSyncAt}
          Sincronizado {formatRelative(status.lastSyncAt, now)}
        {:else}
          Aún no se ha sincronizado
        {/if}
      </p>
      {#if status.lastError}
        <p class="text-destructive text-xs">{status.lastError}. Se reintentará solo.</p>
      {:else if status.pending > 0 && status.lastSyncAt}
        <p class="text-muted-foreground text-xs">
          Último envío {formatRelative(status.lastSyncAt, now)}
        </p>
      {/if}
    {/if}
  </Card.Content>
</Card.Root>
