<script lang="ts">
  import { Button, Card, Input, Label } from '@bllt/ui'
  import { attempt } from '../../../lib/api'
  import { businessApi } from '../../business/api'
  import { businessStore } from '../../business/stores/business.svelte'

  let name = $state(businessStore.name)
  let rif = $state(businessStore.rif ?? '')

  async function save(event: SubmitEvent) {
    event.preventDefault()
    const saved = await attempt(
      () => businessApi.save({ name, rif }),
      'Datos del negocio guardados'
    )
    if (!saved) return
    businessStore.set(saved)
    name = saved.name
    rif = saved.rif ?? ''
  }
</script>

<Card.Root class="max-w-lg">
  <Card.Header>
    <Card.Title>Negocio</Card.Title>
    <Card.Description>
      Aparecen en el menú, en la pantalla de entrada y en los comprobantes de venta.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="space-y-4" onsubmit={save}>
      <div class="space-y-1.5">
        <Label for="b-name">Nombre del negocio</Label>
        <Input id="b-name" bind:value={name} maxlength={120} />
      </div>
      <div class="space-y-1.5">
        <Label for="b-rif">RIF (opcional)</Label>
        <Input id="b-rif" placeholder="J-12345678-9" bind:value={rif} class="font-mono" />
      </div>
      <Button type="submit" class="rounded-full" disabled={!name.trim()}>Guardar</Button>
    </form>
  </Card.Content>
</Card.Root>
