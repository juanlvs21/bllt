<script lang="ts">
  import { Alert, Button, Card, Input, Label } from '@bllt/ui'
  import InfoIcon from '@lucide/svelte/icons/info'
  import { onMount } from 'svelte'
  import type { CloudSettings } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { settingsApi } from '../api'

  let settings = $state<CloudSettings | null>(null)
  let workerUrl = $state('')
  let syncToken = $state('')
  let testing = $state(false)
  let testResult = $state<{ ok: boolean; message: string } | null>(null)

  onMount(async () => {
    settings = (await attempt(() => settingsApi.cloud.get())) ?? null
    workerUrl = settings?.workerUrl ?? ''
  })

  async function save(event: SubmitEvent) {
    event.preventDefault()
    const saved = await attempt(
      () => settingsApi.cloud.save({ workerUrl: workerUrl.trim(), syncToken: syncToken.trim() }),
      'Configuración guardada'
    )
    if (saved) {
      settings = saved
      syncToken = ''
      testResult = null
    }
  }

  async function test() {
    testing = true
    testResult = (await attempt(() => settingsApi.cloud.test())) ?? null
    testing = false
  }
</script>

<div class="grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
  <Card.Root>
    <Card.Header>
      <Card.Title>Worker de Cloudflare</Card.Title>
      <Card.Description>
        Opcional. Sube copias de las ventas para ver el resumen desde el teléfono y sugiere la tasa
        del día.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <form class="space-y-4" onsubmit={save}>
        <div class="space-y-1.5">
          <Label for="w-url">URL del Worker</Label>
          <Input id="w-url" placeholder="https://mi-negocio.workers.dev" bind:value={workerUrl} />
        </div>
        <div class="space-y-1.5">
          <Label for="w-token">SYNC_TOKEN</Label>
          <Input
            id="w-token"
            type="password"
            placeholder={settings?.hasToken ? 'Guardado · escribe uno nuevo para cambiarlo' : ''}
            bind:value={syncToken}
          />
          {#if settings && !settings.secureStorage}
            <p class="text-gold text-xs">
              Este equipo no tiene almacenamiento seguro; el token se guarda sin cifrar.
            </p>
          {/if}
        </div>
        {#if testResult}
          <p class={['text-sm', testResult.ok ? 'text-primary' : 'text-destructive']}>
            {testResult.message}
          </p>
        {/if}
        <div class="flex gap-2">
          <Button type="submit" class="rounded-full">Guardar</Button>
          <Button
            variant="outline"
            class="rounded-full"
            disabled={testing || !settings?.workerUrl}
            onclick={test}
          >
            Probar conexión
          </Button>
          {#if settings?.workerUrl}
            <Button
              variant="ghost"
              class="text-destructive ml-auto"
              onclick={() => {
                workerUrl = ''
                syncToken = ''
              }}>Desconectar</Button
            >
          {/if}
        </div>
      </form>
    </Card.Content>
  </Card.Root>
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
