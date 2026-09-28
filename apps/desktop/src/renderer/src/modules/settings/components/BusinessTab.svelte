<script lang="ts">
  import { rifSchema } from '@bllt/shared'
  import { Button, Card, Input, Label } from '@bllt/ui'
  import { attempt } from '../../../lib/api'
  import { businessApi } from '../../business/api'
  import LogoField from '../../business/components/LogoField.svelte'
  import { businessStore } from '../../business/stores/business.svelte'

  let name = $state(businessStore.name)
  let rif = $state(businessStore.rif ?? '')
  let logo = $state(businessStore.logo)

  async function save(event: SubmitEvent) {
    event.preventDefault()
    const saved = await attempt(
      () => businessApi.save({ name, rif, logo }),
      'Datos del negocio guardados'
    )
    if (!saved) return
    businessStore.set(saved)
    name = saved.name
    rif = saved.rif ?? ''
    logo = saved.logo
  }
</script>

<Card.Root class="max-w-lg">
  <Card.Header>
    <Card.Title>Negocio</Card.Title>
    <Card.Description>
      El nombre, el RIF y el logo aparecen en el menú, en la pantalla de entrada y en los
      comprobantes de venta.
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
        <Input
          id="b-rif"
          placeholder="J-12345678-9"
          bind:value={rif}
          class="font-mono"
          onblur={() => {
            // Shows a valid RIF the way it's stored ("j123456789" → "J-12345678-9").
            const parsed = rifSchema.safeParse(rif)
            if (parsed.success) rif = parsed.data
          }}
        />
      </div>
      <LogoField id="b-logo" bind:value={logo} />
      <Button type="submit" class="rounded-full" disabled={!name.trim()}>Guardar</Button>
    </form>
  </Card.Content>
</Card.Root>
