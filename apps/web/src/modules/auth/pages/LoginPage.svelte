<script lang="ts">
  import type { WebUser } from '@bllt/shared'
  import { Button, Input, Label, Logo } from '@bllt/ui'
  import { api } from '../../../lib/api'

  let { onDone }: { onDone: (user: WebUser) => void } = $props()

  let username = $state('')
  let password = $state('')
  let error = $state('')
  let busy = $state(false)

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    busy = true
    error = ''
    try {
      onDone((await api.login(username, password)).user)
    } catch (e) {
      error = e instanceof Error ? e.message : 'No se pudo iniciar sesión'
    } finally {
      busy = false
    }
  }
</script>

<div class="flex min-h-dvh flex-col">
  <div class="bg-primary text-primary-foreground rounded-b-[2rem] px-6 pt-16 pb-12">
    <div class="bg-card mb-8 inline-flex rounded-2xl px-3 py-2"><Logo size={30} /></div>
    <h1 class="text-3xl font-bold">Tu negocio,<br />desde el teléfono.</h1>
    <p class="text-primary-foreground/80 mt-2 text-sm">Entra con el mismo usuario de la PC.</p>
  </div>
  <form class="mx-auto w-full max-w-sm space-y-4 px-6 py-8" onsubmit={submit}>
    <div class="space-y-1.5">
      <Label for="u">Usuario</Label>
      <Input
        id="u"
        class="h-11"
        bind:value={username}
        autocomplete="username"
        autocapitalize="off"
      />
    </div>
    <div class="space-y-1.5">
      <Label for="p">Contraseña</Label>
      <Input
        id="p"
        class="h-11"
        type="password"
        bind:value={password}
        autocomplete="current-password"
      />
    </div>
    {#if error}<p class="text-destructive text-sm">{error}</p>{/if}
    <Button
      type="submit"
      class="h-12 w-full rounded-full text-base"
      disabled={busy || !username || !password}
    >
      Entrar
    </Button>
    <p class="text-muted-foreground text-center text-xs">
      Los usuarios se crean en la app de escritorio y llegan aquí al sincronizar.
    </p>
  </form>
</div>
