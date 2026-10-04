<script lang="ts">
  import type { DeviceDto } from '@bllt/shared'
  import { Alert, Button, Card } from '@bllt/ui'
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
  let devices = $state<DeviceDto[]>([])
  let now = $state(new Date())

  const others = $derived(devices.filter((d) => d.series !== status?.series))

  onMount(() => {
    void dashboardApi.syncStatus().then((s) => (status = s))
    const off = window.api.events.onSyncStatus((s) => {
      status = s
      void loadDevices()
    })
    void loadDevices()
    const tick = setInterval(() => (now = new Date()), 30_000)
    return () => {
      off()
      clearInterval(tick)
    }
  })

  async function loadDevices() {
    devices = (await attempt(() => dashboardApi.devices())) ?? []
  }

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
  <Card.Content class="space-y-2 text-sm">
    {#if !status}
      <p class="text-muted-foreground">…</p>
    {:else if !status.configured}
      <p class="text-muted-foreground">
        Sin nube: todo funciona igual, solo que no verás el resumen en el teléfono ni los datos de
        otras PCs.
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
        {#if status.revoked}
          Esta PC fue desactivada
        {:else if status.pending > 0}
          {plural(status.pending, 'cambio pendiente', 'cambios pendientes')} por subir
        {:else if status.lastSyncAt}
          Todo al día
        {:else}
          Aún no se ha sincronizado
        {/if}
      </p>
      {#if status.uploadTotal && status.pending > 0}
        <p class="text-muted-foreground text-xs">
          Subida inicial: {Math.max(status.uploadTotal - status.pending, 0)} de {status.uploadTotal}
          registros
        </p>
      {/if}
      <dl class="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt>Subió</dt>
        <dd>{status.lastPushAt ? formatRelative(status.lastPushAt, now) : 'todavía no'}</dd>
        <dt>Bajó</dt>
        <dd>
          {status.lastPullAt ? formatRelative(status.lastPullAt, now) : 'todavía no'}
          {#if status.pendingDown}· faltan {plural(status.pendingDown, 'cambio', 'cambios')}{/if}
        </dd>
      </dl>
      {#each others as device (device.id)}
        <p class="text-xs">
          <strong>{device.name}</strong>
          <span class="text-muted-foreground">
            · datos hasta {device.lastSeenAt ? formatRelative(device.lastSeenAt, now) : 'nunca'}
            {#if !device.active}· desactivada{/if}
          </span>
        </p>
      {/each}
      {#if status.lastError}
        <Alert.Root variant="destructive">
          <Alert.Description>{status.lastError}. Se reintentará solo.</Alert.Description>
        </Alert.Root>
      {:else if status.workerOutdated}
        <p class="text-gold text-xs">
          Tu Worker es de una versión anterior y no puede sincronizar hasta que lo actualices.
          <a
            class="underline"
            href="https://bllt.juanl.dev/docs/guias/actualizar-nube"
            target="_blank"
            rel="noreferrer">Cómo actualizarlo</a
          >
        </p>
      {/if}
    {/if}
  </Card.Content>
</Card.Root>
