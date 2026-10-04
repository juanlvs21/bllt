<script lang="ts">
  import { businessInput, rifSchema } from '@bllt/shared'
  import { Button, Checkbox, Input, Label } from '@bllt/ui'
  import type { SessionUser } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import LogoField from '../../business/components/LogoField.svelte'
  import { businessStore } from '../../business/stores/business.svelte'
  import { authApi } from '../api'
  import AuthLayout from '../components/AuthLayout.svelte'
  import RecoveryCode from '../components/RecoveryCode.svelte'

  let { onDone, onJoined }: { onDone: (user: SessionUser) => void; onJoined: () => void } = $props()

  /** 0: connect or go local, 1: business, 2: owner, 3: recovery code. */
  let step = $state<0 | 1 | 2 | 3>(0)
  let businessName = $state('')
  let rif = $state('')
  let logo = $state<string | null>(null)
  let username = $state('')
  let password = $state('')
  let confirm = $state('')
  let workerUrl = $state('')
  let syncToken = $state('')
  let deviceName = $state('')
  let joining = $state(false)
  let downloaded = $state(0)
  let remaining = $state<number | null>(null)
  let busy = $state(false)
  let recoveryCode = $state('')
  let createdUser = $state<SessionUser | null>(null)
  let savedCode = $state(false)
  let error = $state('')

  /** Shows a valid RIF the way it's stored ("j123456789" → "J-12345678-9"). */
  const formatRif = (value: string) => {
    const parsed = rifSchema.safeParse(value)
    return parsed.success ? parsed.data : value
  }

  function nextBusiness(event: SubmitEvent) {
    event.preventDefault()
    const parsed = businessInput.safeParse({ name: businessName, rif, logo })
    error = parsed.success ? '' : (parsed.error.issues[0]?.message ?? 'Datos inválidos')
    if (parsed.success) step = 2
  }

  function nextOwner(event: SubmitEvent) {
    event.preventDefault()
    error = ''
    if (username.trim().length < 3) error = 'El usuario debe tener al menos 3 caracteres'
    else if (password.length < 8) error = 'La contraseña debe tener al menos 8 caracteres'
    else if (password !== confirm) error = 'Las contraseñas no coinciden'
    else void finish()
  }

  /** Tries the Worker: a business that already has data is joined, an empty one is set up. */
  async function connect(event: SubmitEvent) {
    event.preventDefault()
    error = ''
    busy = true
    const input = { workerUrl: workerUrl.trim(), syncToken: syncToken.trim(), deviceName }
    const status = await attempt(() => authApi.inspectCloud(input))
    if (!status) {
      busy = false
      return
    }
    if (!status.hasData) {
      busy = false
      step = 1
      return
    }
    if (!status.complete) {
      busy = false
      error =
        'La PC original todavía está subiendo sus datos. Espera a que termine e inténtalo de nuevo.'
      return
    }
    joining = true
    const off = window.api.events.onSyncStatus((s) => {
      downloaded = s.downloaded
      remaining = s.pendingDown
    })
    const joined = await attempt(() => authApi.joinCloud(input))
    off()
    joining = false
    busy = false
    if (joined === undefined) return
    void businessStore.refresh()
    onJoined()
  }

  function goLocal() {
    workerUrl = ''
    syncToken = ''
    step = 1
  }

  async function finish() {
    busy = true
    const result = await attempt(() =>
      authApi.setup({
        business: { name: businessName, rif, logo },
        username: username.trim(),
        password,
        workerUrl: workerUrl.trim(),
        syncToken: syncToken.trim(),
        deviceName
      })
    )
    busy = false
    if (!result) return
    recoveryCode = result.recoveryCode
    createdUser = result.user
    void businessStore.refresh()
    step = 3
  }
</script>

<AuthLayout>
  {#if step > 0}
    <p class="text-primary mb-1 text-sm font-semibold">Paso {step} de 3</p>
  {/if}
  {#if step === 0}
    <h1 class="mb-2 text-2xl font-bold">Bienvenido a Bllt</h1>
    <p class="text-muted-foreground mb-6 text-sm">
      Si tu negocio ya usa Bllt en otra PC, conéctala al Worker de Cloudflare y se cargarán todos
      los datos, sin repetir la configuración. Si es el primero, puedes conectarlo ahora o usar Bllt
      solo en esta PC.
    </p>
    {#if joining}
      <p class="text-sm font-medium">Descargando los datos del negocio…</p>
      <p class="text-muted-foreground mt-1 text-sm">
        {downloaded} cambios descargados{#if remaining}
          · faltan {remaining}{/if}
      </p>
    {:else}
      <form class="space-y-4" onsubmit={connect}>
        <div class="space-y-1.5">
          <Label for="url">URL del Worker</Label>
          <Input
            id="url"
            class="h-10"
            placeholder="https://mi-negocio.workers.dev"
            bind:value={workerUrl}
            autofocus
          />
        </div>
        <div class="space-y-1.5">
          <Label for="token">SYNC_TOKEN</Label>
          <Input id="token" class="h-10" type="password" bind:value={syncToken} />
        </div>
        <div class="space-y-1.5">
          <Label for="device">Nombre de esta PC</Label>
          <Input id="device" class="h-10" placeholder="Caja 2" bind:value={deviceName} />
        </div>
        {#if error}<p class="text-destructive text-sm">{error}</p>{/if}
        <Button
          type="submit"
          size="lg"
          class="h-11 w-full rounded-full"
          disabled={busy || !workerUrl.trim() || !syncToken.trim() || !deviceName.trim()}
        >
          Conectar
        </Button>
        <Button variant="link" class="px-0" onclick={goLocal}>Usar solo en esta PC</Button>
      </form>
    {/if}
  {:else if step === 1}
    <h1 class="mb-2 text-2xl font-bold">Bienvenido a Bllt</h1>
    <p class="text-muted-foreground mb-6 text-sm">
      ¿Cómo se llama tu negocio? El nombre y el logo aparecen en el menú y en los comprobantes.
      Puedes cambiarlo después en Configuración.
    </p>
    <form class="space-y-4" onsubmit={nextBusiness}>
      <div class="space-y-1.5">
        <Label for="business-name">Nombre del negocio</Label>
        <Input
          id="business-name"
          class="h-10"
          bind:value={businessName}
          maxlength={120}
          autofocus
        />
      </div>
      <div class="space-y-1.5">
        <Label for="rif">RIF (opcional)</Label>
        <Input
          id="rif"
          class="h-10 font-mono"
          placeholder="J-12345678-9"
          bind:value={rif}
          onblur={() => (rif = formatRif(rif))}
        />
      </div>
      <LogoField bind:value={logo} />
      {#if error}<p class="text-destructive text-sm">{error}</p>{/if}
      <Button type="submit" size="lg" class="h-11 w-full rounded-full">Continuar</Button>
    </form>
  {:else if step === 2}
    <h1 class="mb-2 text-2xl font-bold">Usuario del dueño</h1>
    <p class="text-muted-foreground mb-6 text-sm">
      Tendrá el rol de administrador y podrá crear empleados después.
    </p>
    <form class="space-y-4" onsubmit={nextOwner}>
      <div class="space-y-1.5">
        <Label for="username">Usuario</Label>
        <Input id="username" class="h-10" bind:value={username} autocomplete="username" autofocus />
      </div>
      <div class="space-y-1.5">
        <Label for="password">Contraseña</Label>
        <Input
          id="password"
          class="h-10"
          type="password"
          bind:value={password}
          autocomplete="new-password"
        />
      </div>
      <div class="space-y-1.5">
        <Label for="confirm">Repite la contraseña</Label>
        <Input
          id="confirm"
          class="h-10"
          type="password"
          bind:value={confirm}
          autocomplete="new-password"
        />
      </div>
      {#if error}<p class="text-destructive text-sm">{error}</p>{/if}
      <Button type="submit" size="lg" class="h-11 w-full rounded-full" disabled={busy}>
        Crear cuenta
      </Button>
      <Button variant="link" class="px-0" onclick={() => ((step = 1), (error = ''))}>Volver</Button>
    </form>
  {:else}
    <h1 class="mb-2 text-2xl font-bold">Código de recuperación</h1>
    <p class="text-muted-foreground mb-6 text-sm">
      Anótalo en papel y guárdalo. Es la única forma de recuperar la cuenta del dueño si olvidas la
      contraseña. No se vuelve a mostrar.
    </p>
    <RecoveryCode code={recoveryCode} class="mb-6" />
    <label class="mb-6 flex items-center gap-3 text-sm">
      <Checkbox bind:checked={savedCode} />
      Ya lo anoté en un lugar seguro
    </label>
    <Button
      size="lg"
      class="h-11 w-full rounded-full"
      disabled={!savedCode}
      onclick={() => createdUser && onDone(createdUser)}
    >
      Entrar a Bllt
    </Button>
  {/if}
</AuthLayout>
