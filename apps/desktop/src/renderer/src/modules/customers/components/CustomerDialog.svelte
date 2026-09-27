<script lang="ts">
  import { Button, Dialog, Input, Label } from '@bllt/ui'
  import type { CustomerDto } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { customersApi } from '../api'

  let {
    open = $bindable(false),
    customer = null,
    initialName = '',
    onSaved
  }: {
    open?: boolean
    customer?: CustomerDto | null
    initialName?: string
    onSaved: (c: CustomerDto) => void
  } = $props()

  let name = $state('')
  let document = $state('')
  let phone = $state('')

  $effect(() => {
    if (open) {
      name = customer?.name ?? initialName
      document = customer?.document ?? ''
      phone = customer?.phone ?? ''
    }
  })

  async function save(event: SubmitEvent) {
    event.preventDefault()
    const input = { name, document, phone }
    const saved = await attempt(
      () =>
        customer ? customersApi.update({ ...input, id: customer.id }) : customersApi.create(input),
      customer ? 'Cliente actualizado' : 'Cliente registrado'
    )
    if (saved) {
      onSaved(saved)
      open = false
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="text-primary text-lg"
        >{customer ? 'Editar cliente' : 'Nuevo cliente'}</Dialog.Title
      >
      <Dialog.Description>Solo el nombre es obligatorio.</Dialog.Description>
    </Dialog.Header>
    <form class="space-y-4" onsubmit={save}>
      <div class="space-y-1.5">
        <Label for="c-name">Nombre</Label>
        <Input id="c-name" bind:value={name} required autofocus />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <Label for="c-doc">Cédula o RIF</Label>
          <Input id="c-doc" bind:value={document} placeholder="V-12345678" class="uppercase" />
        </div>
        <div class="space-y-1.5">
          <Label for="c-phone">Teléfono</Label>
          <Input id="c-phone" bind:value={phone} placeholder="0414-1234567" />
        </div>
      </div>
      <Dialog.Footer>
        <Button type="submit" class="rounded-full px-8">Guardar</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
