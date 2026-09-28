<script lang="ts">
  import { Role } from '@bllt/shared'
  import {
    AlertDialog,
    Badge,
    Button,
    Card,
    Dialog,
    Input,
    Label,
    Select,
    Switch,
    Table
  } from '@bllt/ui'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import KeyIcon from '@lucide/svelte/icons/key-round'
  import { onMount } from 'svelte'
  import type { UserDto } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { formatBusinessDate } from '../../../lib/format'
  import { session } from '../../../lib/session.svelte'
  import { settingsApi } from '../api'
  import RecoveryCode from '../../auth/components/RecoveryCode.svelte'

  let users = $state<UserDto[]>([])
  let createOpen = $state(false)
  let username = $state('')
  let password = $state('')
  let role = $state<string>(Role.EMPLOYEE)

  let resetFor = $state<UserDto | null>(null)
  let resetOpen = $state(false)
  let resetPassword = $state('')

  let codeOpen = $state(false)
  let newCode = $state('')

  async function load() {
    users = (await attempt(() => settingsApi.users.list())) ?? []
  }
  onMount(load)

  async function create(event: SubmitEvent) {
    event.preventDefault()
    const user = await attempt(
      () => settingsApi.users.create({ username, password, role: role as Role }),
      'Usuario creado'
    )
    if (user) {
      createOpen = false
      username = password = ''
      role = Role.EMPLOYEE
      await load()
    }
  }

  async function toggle(user: UserDto, active: boolean) {
    await attempt(
      () => settingsApi.users.setActive(user.id, active),
      active ? 'Usuario activado' : 'Usuario desactivado'
    )
    await load()
  }

  async function reset(event: SubmitEvent) {
    event.preventDefault()
    if (!resetFor) return
    const ok = await attempt(
      () => settingsApi.users.resetPassword(resetFor!.id, resetPassword),
      'Contraseña cambiada'
    )
    if (ok !== undefined) {
      resetOpen = false
      resetPassword = ''
    }
  }

  async function regenerate() {
    const code = await attempt(() => settingsApi.users.regenerateRecoveryCode())
    if (code) {
      newCode = code
      codeOpen = true
    }
  }
</script>

<div class="space-y-6">
  <Card.Root>
    <Card.Header>
      <Card.Title>Usuarios</Card.Title>
      <Card.Description
        >Los usuarios se desactivan, nunca se borran: sus ventas siguen a su nombre.</Card.Description
      >
      <Card.Action>
        <Button class="rounded-full" onclick={() => (createOpen = true)}
          ><PlusIcon /> Nuevo usuario</Button
        >
      </Card.Action>
    </Card.Header>
    <Card.Content>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Usuario</Table.Head>
            <Table.Head>Rol</Table.Head>
            <Table.Head>Creado</Table.Head>
            <Table.Head>Activo</Table.Head>
            <Table.Head class="w-40"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each users as u (u.id)}
            <Table.Row class={u.active ? '' : 'opacity-60'}>
              <Table.Cell class="font-medium">
                {u.username}
                {#if u.id === session.user?.id}<span class="text-muted-foreground text-xs">
                    (tú)</span
                  >{/if}
              </Table.Cell>
              <Table.Cell>
                <Badge variant={u.role === Role.ADMIN ? 'default' : 'secondary'}>
                  {u.role === Role.ADMIN ? 'Administrador' : 'Empleado'}
                </Badge>
              </Table.Cell>
              <Table.Cell class="text-muted-foreground"
                >{formatBusinessDate(u.createdAt)}</Table.Cell
              >
              <Table.Cell>
                <Switch
                  checked={u.active}
                  disabled={u.id === session.user?.id}
                  onCheckedChange={(v) => toggle(u, v)}
                />
              </Table.Cell>
              <Table.Cell class="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => {
                    resetFor = u
                    resetOpen = true
                  }}><KeyIcon /> Cambiar contraseña</Button
                >
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content>
  </Card.Root>

  <Card.Root class="max-w-2xl">
    <Card.Header>
      <Card.Title>Código de recuperación</Card.Title>
      <Card.Description>
        Si perdiste el papel con el código, genera uno nuevo. El anterior deja de funcionar.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <Button variant="outline" class="rounded-full" onclick={regenerate}
        >Generar código nuevo</Button
      >
    </Card.Content>
  </Card.Root>
</div>

<Dialog.Root bind:open={createOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Nuevo usuario</Dialog.Title>
      <Dialog.Description
        >Los empleados venden y cargan productos, pero no ven esta sección.</Dialog.Description
      >
    </Dialog.Header>
    <form class="space-y-4" onsubmit={create}>
      <div class="space-y-1.5">
        <Label for="u-name">Usuario</Label>
        <Input id="u-name" bind:value={username} />
      </div>
      <div class="space-y-1.5">
        <Label for="u-pass">Contraseña</Label>
        <Input id="u-pass" type="password" bind:value={password} />
      </div>
      <div class="space-y-1.5">
        <Label>Rol</Label>
        <Select.Root type="single" bind:value={role}>
          <Select.Trigger class="w-full"
            >{role === Role.ADMIN ? 'Administrador' : 'Empleado'}</Select.Trigger
          >
          <Select.Content>
            <Select.Item value={Role.EMPLOYEE} label="Empleado" />
            <Select.Item value={Role.ADMIN} label="Administrador" />
          </Select.Content>
        </Select.Root>
      </div>
      <Dialog.Footer>
        <Button
          type="submit"
          class="rounded-full"
          disabled={username.length < 3 || password.length < 8}>Crear</Button
        >
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={resetOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Cambiar contraseña de {resetFor?.username}</Dialog.Title>
    </Dialog.Header>
    <form class="space-y-4" onsubmit={reset}>
      <div class="space-y-1.5">
        <Label for="r-pass">Nueva contraseña</Label>
        <Input id="r-pass" type="password" bind:value={resetPassword} />
      </div>
      <Dialog.Footer>
        <Button type="submit" class="rounded-full" disabled={resetPassword.length < 8}
          >Guardar</Button
        >
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={codeOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Nuevo código de recuperación</AlertDialog.Title>
      <AlertDialog.Description>Anótalo en papel. No se vuelve a mostrar.</AlertDialog.Description>
    </AlertDialog.Header>
    <RecoveryCode code={newCode} />
    <AlertDialog.Footer>
      <AlertDialog.Action onclick={() => (codeOpen = false)}>Ya lo anoté</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
