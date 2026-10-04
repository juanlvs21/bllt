<script lang="ts">
  import type { DeviceDto } from '@bllt/shared'
  import { Alert, AlertDialog, Badge, Button, Card, Input, Label, Table } from '@bllt/ui'
  import InfoIcon from '@lucide/svelte/icons/info'
  import { onMount } from 'svelte'
  import type { CloudSettings, SyncConflictDto, SyncStatus } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { formatRelative, plural } from '../../../lib/format'
  import { dashboardApi } from '../../dashboard/api'
  import { settingsApi } from '../api'

  let settings = $state<CloudSettings | null>(null)
  let status = $state<SyncStatus | null>(null)
  let devices = $state<DeviceDto[]>([])
  let conflicts = $state<SyncConflictDto[]>([])
  let workerUrl = $state('')
  let syncToken = $state('')
  let deviceName = $state('')
  let testing = $state(false)
  let connecting = $state(false)
  let testResult = $state<{ ok: boolean; message: string } | null>(null)
  let confirmDisconnect = $state(false)
  let revoking = $state<DeviceDto | null>(null)
  const canTest = $derived(!!workerUrl.trim() && !!syncToken.trim())

  async function load() {
    settings = (await attempt(() => settingsApi.cloud.get())) ?? null
    workerUrl = settings?.workerUrl ?? ''
    deviceName = settings?.deviceName ?? ''
    if (settings?.connected) {
      devices = (await attempt(() => settingsApi.cloud.devices())) ?? []
      conflicts = (await attempt(() => settingsApi.cloud.conflicts())) ?? []
    }
  }

  onMount(() => {
    void load()
    void dashboardApi.syncStatus().then((s) => (status = s))
    return window.api.events.onSyncStatus((s) => {
      // A block body: returning the $state proxy would try to clone it back over the bridge.
      status = s
    })
  })

  async function connect(event: SubmitEvent) {
    event.preventDefault()
    connecting = true
    const saved = await attempt(
      () =>
        settingsApi.cloud.save({
          workerUrl: workerUrl.trim(),
          syncToken: syncToken.trim(),
          deviceName: deviceName.trim()
        }),
      'Esta PC quedó conectada. Subiendo los datos…'
    )
    connecting = false
    if (saved) {
      settings = saved
      syncToken = ''
      testResult = null
      await load()
    }
  }

  /** Tries what is typed in the form, saved or not. */
  async function test() {
    testing = true
    testResult =
      (await attempt(() =>
        settingsApi.cloud.test({ workerUrl: workerUrl.trim(), syncToken: syncToken.trim() })
      )) ?? null
    testing = false
  }

  async function disconnect() {
    confirmDisconnect = false
    const saved = await attempt(
      () => settingsApi.cloud.save({ workerUrl: '', syncToken: '' }),
      'Nube desconectada'
    )
    if (saved) {
      settings = saved
      workerUrl = ''
      syncToken = ''
      devices = []
      testResult = null
    }
  }

  async function revoke() {
    const device = revoking
    revoking = null
    if (!device) return
    const list = await attempt(
      () => settingsApi.cloud.revokeDevice(device.id),
      `${device.name} ya no puede sincronizar`
    )
    if (list) devices = list
  }

  async function resolve(id: string) {
    await attempt(() => settingsApi.cloud.resolveConflict(id))
    conflicts = conflicts.filter((c) => c.id !== id)
  }
</script>

<div class="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
  <div class="space-y-6">
    <Card.Root>
      <Card.Header>
        <Card.Title>Worker de Cloudflare</Card.Title>
        <Card.Description>
          {#if settings?.connected}
            Esta PC es <strong>{settings.deviceName}</strong> (serie {settings.series}) y está
            conectada a {settings.workerUrl}.
          {:else}
            Opcional. Junta los datos de varias PCs, permite ver el resumen desde el teléfono y
            sugiere la tasa del día.
          {/if}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {#if settings?.connected}
          <div class="space-y-2 text-sm">
            {#if status?.revoked}
              <p class="text-destructive">
                Esta PC fue desactivada desde otra PC. Desconéctala y vuelve a conectarla con el
                SYNC_TOKEN si fue un error.
              </p>
            {/if}
            <p>
              <span class="text-muted-foreground">Último envío:</span>
              {status?.lastPushAt ? formatRelative(status.lastPushAt) : 'todavía no'}
            </p>
            <p>
              <span class="text-muted-foreground">Última descarga:</span>
              {status?.lastPullAt ? formatRelative(status.lastPullAt) : 'todavía no'}
            </p>
            <p>
              <span class="text-muted-foreground">Por subir:</span>
              {plural(status?.pending ?? 0, 'cambio', 'cambios')}
              {#if status?.uploadTotal}
                (subida inicial de {status.uploadTotal} registros)
              {/if}
            </p>
            <p>
              <span class="text-muted-foreground">Por bajar:</span>
              {status?.pendingDown == null
                ? 'sin datos todavía'
                : plural(status.pendingDown, 'cambio', 'cambios')}
            </p>
            {#if status?.lastError}
              <p class="text-destructive">{status.lastError}. Se reintentará solo.</p>
            {/if}
            <Button
              variant="ghost"
              class="text-destructive -ml-3"
              onclick={() => (confirmDisconnect = true)}>Desconectar</Button
            >
          </div>
        {:else}
          <form class="space-y-4" onsubmit={connect}>
            <div class="space-y-1.5">
              <Label for="w-url">URL del Worker</Label>
              <Input
                id="w-url"
                placeholder="https://mi-negocio.workers.dev"
                bind:value={workerUrl}
              />
            </div>
            <div class="space-y-1.5">
              <Label for="w-token">SYNC_TOKEN</Label>
              <Input id="w-token" type="password" bind:value={syncToken} />
              <p class="text-muted-foreground text-xs">
                Solo se usa ahora para registrar esta PC. Después cada PC tiene su propio token y
                este no se guarda.
              </p>
            </div>
            <div class="space-y-1.5">
              <Label for="w-name">Nombre de esta PC</Label>
              <Input id="w-name" placeholder="Caja principal" bind:value={deviceName} />
            </div>
            {#if settings && !settings.secureStorage}
              <p class="text-gold text-xs">
                Este equipo no tiene almacenamiento seguro; el token se guarda sin cifrar.
              </p>
            {/if}
            {#if testResult}
              <p class={['text-sm', testResult.ok ? 'text-primary' : 'text-destructive']}>
                {testResult.message}
              </p>
            {/if}
            <div class="flex gap-2">
              <Button type="submit" class="rounded-full" disabled={connecting || !canTest}>
                {connecting ? 'Conectando…' : 'Conectar'}
              </Button>
              <Button
                variant="outline"
                class="rounded-full"
                disabled={testing || !canTest}
                onclick={test}
              >
                Probar conexión
              </Button>
            </div>
          </form>
        {/if}
      </Card.Content>
    </Card.Root>

    {#if settings?.connected}
      <Card.Root>
        <Card.Header>
          <Card.Title>PCs del negocio</Card.Title>
          <Card.Description>
            Cada PC factura con su propia serie. Si roban o pierdes una, desactívala: deja de poder
            sincronizar, y sus ventas ya hechas se conservan.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Serie</Table.Head>
                <Table.Head>Nombre</Table.Head>
                <Table.Head>Última conexión</Table.Head>
                <Table.Head></Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each devices as device (device.id)}
                <Table.Row class={device.active ? '' : 'opacity-50'}>
                  <Table.Cell class="font-semibold">{device.series}</Table.Cell>
                  <Table.Cell>
                    {device.name}
                    {#if device.series === settings.series}
                      <Badge variant="outline" class="ml-1">Esta PC</Badge>
                    {/if}
                    {#if !device.active}<Badge variant="outline" class="ml-1">Desactivada</Badge
                      >{/if}
                  </Table.Cell>
                  <Table.Cell class="text-muted-foreground">
                    {device.lastSeenAt ? formatRelative(device.lastSeenAt) : 'nunca'}
                  </Table.Cell>
                  <Table.Cell class="text-right">
                    {#if device.active && device.series !== settings.series}
                      <Button
                        variant="ghost"
                        size="sm"
                        class="text-destructive"
                        onclick={() => (revoking = device)}>Desactivar</Button
                      >
                    {/if}
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>

      {#if conflicts.length > 0}
        <Card.Root>
          <Card.Header>
            <Card.Title>Avisos de la sincronización</Card.Title>
            <Card.Description>
              Casos que Bllt resolvió solo al unir los datos de las PCs. Revísalos y márcalos como
              vistos.
            </Card.Description>
          </Card.Header>
          <Card.Content class="space-y-3">
            {#each conflicts as conflict (conflict.id)}
              <div class="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p>{conflict.detail}</p>
                  <p class="text-muted-foreground text-xs">{formatRelative(conflict.createdAt)}</p>
                </div>
                <Button variant="outline" size="sm" onclick={() => resolve(conflict.id)}
                  >Visto</Button
                >
              </div>
            {/each}
          </Card.Content>
        </Card.Root>
      {/if}
    {/if}
  </div>
  <Alert.Root>
    <InfoIcon />
    <Alert.Title>¿Cómo lo despliego?</Alert.Title>
    <Alert.Description>
      <p>
        Usa el botón “Deploy to Cloudflare” del repositorio. Al terminar, copia la URL del Worker y
        el SYNC_TOKEN que elegiste y pégalos aquí.
      </p>
      <a
        class="text-primary underline"
        href="https://bllt.juanl.dev/docs/nube"
        target="_blank"
        rel="noreferrer"
      >
        Guía paso a paso
      </a>
      <p class="text-xs">
        Sin nube, Bllt funciona igual. Si la conexión cae, los cambios se guardan y suben al volver.
      </p>
    </Alert.Description>
  </Alert.Root>
</div>

<AlertDialog.Root bind:open={confirmDisconnect}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>¿Desconectar la nube?</AlertDialog.Title>
      <AlertDialog.Description>
        Se borran la URL y el token de este equipo y los cambios dejan de subir y bajar. Lo que ya
        está en el Worker se queda allí; para volver a conectar necesitarás el SYNC_TOKEN.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
      <AlertDialog.Action variant="destructive" onclick={disconnect}>Desconectar</AlertDialog.Action
      >
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root open={!!revoking} onOpenChange={(open) => !open && (revoking = null)}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>¿Desactivar {revoking?.name}?</AlertDialog.Title>
      <AlertDialog.Description>
        Esa PC dejará de poder subir y bajar datos. Lo que ya vendió se conserva. Si fue un error,
        se puede volver a conectar con el SYNC_TOKEN.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
      <AlertDialog.Action variant="destructive" onclick={revoke}>Desactivar</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
