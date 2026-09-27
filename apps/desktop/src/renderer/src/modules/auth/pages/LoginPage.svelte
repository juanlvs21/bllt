<script lang="ts">
  import { Button, Dialog, Input, Label } from '@bllt/ui'
  import type { SessionUser } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { authApi } from '../api'
  import AuthLayout from '../components/AuthLayout.svelte'

  let { onDone }: { onDone: (user: SessionUser) => void } = $props()

  let username = $state('')
  let password = $state('')
  let busy = $state(false)

  let recoverOpen = $state(false)
  let recoverUser = $state('')
  let recoverCode = $state('')
  let recoverPassword = $state('')

  async function login(event: SubmitEvent) {
    event.preventDefault()
    busy = true
    const user = await attempt(() => authApi.login({ username, password }))
    busy = false
    if (user) onDone(user)
  }

  async function recover(event: SubmitEvent) {
    event.preventDefault()
    const ok = await attempt(
      () =>
        authApi.recover({
          username: recoverUser,
          recoveryCode: recoverCode,
          newPassword: recoverPassword
        }),
      'Contraseña actualizada. Ya puedes entrar.'
    )
    if (ok !== undefined) {
      recoverOpen = false
      username = recoverUser
      password = ''
    }
  }
</script>

<AuthLayout>
  <h1 class="mb-2 text-2xl font-bold">Iniciar sesión</h1>
  <p class="text-muted-foreground mb-6 text-sm">Entra con tu usuario de este negocio.</p>
  <form class="space-y-4" onsubmit={login}>
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
        autocomplete="current-password"
      />
    </div>
    <Button
      type="submit"
      size="lg"
      class="h-11 w-full rounded-full"
      disabled={busy || !username || !password}
    >
      Entrar
    </Button>
  </form>
  <Button variant="link" class="mt-4 px-0" onclick={() => (recoverOpen = true)}>
    Olvidé la contraseña del dueño
  </Button>
</AuthLayout>

<Dialog.Root bind:open={recoverOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Recuperar cuenta del dueño</Dialog.Title>
      <Dialog.Description>
        Usa el código de recuperación que anotaste al configurar Bllt. Los empleados deben pedirle
        al administrador que les cambie la contraseña.
      </Dialog.Description>
    </Dialog.Header>
    <form class="space-y-4" onsubmit={recover}>
      <div class="space-y-1.5">
        <Label for="r-user">Usuario administrador</Label>
        <Input id="r-user" bind:value={recoverUser} />
      </div>
      <div class="space-y-1.5">
        <Label for="r-code">Código de recuperación</Label>
        <Input
          id="r-code"
          class="font-mono uppercase"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          bind:value={recoverCode}
        />
      </div>
      <div class="space-y-1.5">
        <Label for="r-pass">Nueva contraseña</Label>
        <Input id="r-pass" type="password" bind:value={recoverPassword} />
      </div>
      <Dialog.Footer>
        <Button type="submit" class="rounded-full">Cambiar contraseña</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
