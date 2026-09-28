<script lang="ts">
  import { Button, Dialog, Input, Label, Logo } from '@bllt/ui'
  import type { SessionUser } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { businessStore } from '../../business/stores/business.svelte'
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
    // recover() resolves to nothing, so success is signalled explicitly.
    const ok = await attempt(async () => {
      await authApi.recover({
        username: recoverUser,
        recoveryCode: recoverCode,
        newPassword: recoverPassword
      })
      return true
    }, 'Contraseña actualizada. Ya puedes entrar.')
    if (ok) {
      username = recoverUser
      password = ''
      recoverOpen = false
    }
  }

  // The code and the new password never linger once the dialog closes.
  $effect(() => {
    if (!recoverOpen) {
      recoverUser = ''
      recoverCode = ''
      recoverPassword = ''
    }
  })
</script>

<AuthLayout>
  {#if businessStore.logo}
    <img
      src={businessStore.logo}
      alt={businessStore.name}
      class="bg-card mb-5 size-20 rounded-2xl border object-contain shadow-sm"
    />
  {:else}
    <!-- On small screens AuthLayout already shows the Bllt logo above. -->
    <span
      class="bg-card mb-5 hidden size-20 items-center justify-center rounded-2xl border shadow-sm lg:flex"
    >
      <Logo wordmark={false} size={52} />
    </span>
  {/if}
  <h1 class="mb-2 text-2xl font-bold">Iniciar sesión</h1>
  <p class="text-muted-foreground mb-6 text-sm">
    {#if businessStore.name}
      Entra con tu usuario de <strong class="text-foreground">{businessStore.name}</strong>.
    {:else}
      Entra con tu usuario de este negocio.
    {/if}
  </p>
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
