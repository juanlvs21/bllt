<script lang="ts">
  import { Button, Card, Input, Label } from '@bllt/ui'
  import { attempt } from '../../../lib/api'
  import { session } from '../../../lib/session.svelte'
  import { authApi } from '../../auth/api'

  let current = $state('')
  let next = $state('')
  let confirm = $state('')

  async function save(event: SubmitEvent) {
    event.preventDefault()
    const ok = await attempt(() => authApi.changePassword(current, next), 'Contraseña actualizada')
    if (ok !== undefined) current = next = confirm = ''
  }
</script>

<Card.Root class="max-w-lg">
  <Card.Header>
    <Card.Title>Mi cuenta</Card.Title>
    <Card.Description>
      Conectado como <strong>{session.user?.username}</strong> ({session.isAdmin
        ? 'administrador'
        : 'empleado'}).
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="space-y-4" onsubmit={save}>
      <div class="space-y-1.5">
        <Label for="cur">Contraseña actual</Label>
        <Input id="cur" type="password" bind:value={current} autocomplete="current-password" />
      </div>
      <div class="space-y-1.5">
        <Label for="new">Nueva contraseña</Label>
        <Input id="new" type="password" bind:value={next} autocomplete="new-password" />
      </div>
      <div class="space-y-1.5">
        <Label for="rep">Repite la nueva contraseña</Label>
        <Input id="rep" type="password" bind:value={confirm} autocomplete="new-password" />
        {#if confirm && confirm !== next}<p class="text-destructive text-xs">No coinciden</p>{/if}
      </div>
      <Button
        type="submit"
        class="rounded-full"
        disabled={!current || next.length < 8 || next !== confirm}
      >
        Cambiar contraseña
      </Button>
    </form>
  </Card.Content>
</Card.Root>
