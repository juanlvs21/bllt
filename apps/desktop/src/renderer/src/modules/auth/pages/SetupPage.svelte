<script lang="ts">
  import { businessInput } from '@bllt/shared'
  import { Button, Checkbox, Input, Label, Card } from '@bllt/ui'
  import CopyIcon from '@lucide/svelte/icons/copy'
  import type { SessionUser } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import LogoField from '../../business/components/LogoField.svelte'
  import { businessStore } from '../../business/stores/business.svelte'
  import { authApi } from '../api'
  import AuthLayout from '../components/AuthLayout.svelte'

  let { onDone }: { onDone: (user: SessionUser) => void } = $props()

  let step = $state<1 | 2 | 3 | 4>(1)
  let businessName = $state('')
  let rif = $state('')
  let logo = $state<string | null>(null)
  let username = $state('')
  let password = $state('')
  let confirm = $state('')
  let workerUrl = $state('')
  let syncToken = $state('')
  let busy = $state(false)
  let recoveryCode = $state('')
  let createdUser = $state<SessionUser | null>(null)
  let savedCode = $state(false)
  let error = $state('')

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
    else step = 3
  }

  async function finish(skipCloud: boolean) {
    busy = true
    const result = await attempt(() =>
      authApi.setup({
        business: { name: businessName, rif, logo },
        username: username.trim(),
        password,
        workerUrl: skipCloud ? '' : workerUrl.trim(),
        syncToken: skipCloud ? '' : syncToken.trim()
      })
    )
    busy = false
    if (!result) return
    recoveryCode = result.recoveryCode
    createdUser = result.user
    void businessStore.refresh()
    step = 4
  }
</script>

<AuthLayout>
  <p class="text-primary mb-1 text-sm font-semibold">Paso {step} de 4</p>
  {#if step === 1}
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
        <Input id="rif" class="h-10 font-mono" placeholder="J-12345678-9" bind:value={rif} />
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
      <Button type="submit" size="lg" class="h-11 w-full rounded-full">Continuar</Button>
      <Button variant="link" class="px-0" onclick={() => ((step = 1), (error = ''))}>Volver</Button>
    </form>
  {:else if step === 3}
    <h1 class="mb-2 text-2xl font-bold">Nube (opcional)</h1>
    <p class="text-muted-foreground mb-6 text-sm">
      Si desplegaste tu Worker de Cloudflare, pega aquí su URL y el SYNC_TOKEN para ver el resumen
      desde el teléfono. Puedes hacerlo después en Configuración.
    </p>
    <div class="space-y-4">
      <div class="space-y-1.5">
        <Label for="url">URL del Worker</Label>
        <Input
          id="url"
          class="h-10"
          placeholder="https://mi-negocio.workers.dev"
          bind:value={workerUrl}
        />
      </div>
      <div class="space-y-1.5">
        <Label for="token">SYNC_TOKEN</Label>
        <Input id="token" class="h-10" type="password" bind:value={syncToken} />
      </div>
      <div class="flex gap-3 pt-2">
        <Button
          variant="outline"
          size="lg"
          class="h-11 flex-1 rounded-full"
          disabled={busy}
          onclick={() => finish(true)}
        >
          Configurar después
        </Button>
        <Button
          size="lg"
          class="h-11 flex-1 rounded-full"
          disabled={busy || !workerUrl.trim() || !syncToken.trim()}
          onclick={() => finish(false)}
        >
          Guardar y seguir
        </Button>
      </div>
      <Button variant="link" class="px-0" onclick={() => (step = 2)}>Volver</Button>
    </div>
  {:else}
    <h1 class="mb-2 text-2xl font-bold">Código de recuperación</h1>
    <p class="text-muted-foreground mb-6 text-sm">
      Anótalo en papel y guárdalo. Es la única forma de recuperar la cuenta del dueño si olvidas la
      contraseña. No se vuelve a mostrar.
    </p>
    <Card.Root class="bg-gold-soft ring-gold/40 mb-6">
      <Card.Content class="flex items-center justify-between gap-4">
        <span class="tabular font-mono text-2xl font-bold tracking-widest">{recoveryCode}</span>
        <Button
          variant="ghost"
          size="icon"
          onclick={() => navigator.clipboard.writeText(recoveryCode)}
          aria-label="Copiar"
        >
          <CopyIcon />
        </Button>
      </Card.Content>
    </Card.Root>
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
