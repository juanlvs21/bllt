<script lang="ts">
  import { Button, Dialog, Input, Label, Tabs } from '@bllt/ui'
  import type { ProductDto } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { productsApi } from '../api'

  let {
    open = $bindable(false),
    product,
    onSaved
  }: { open?: boolean; product: ProductDto | null; onSaved: (p: ProductDto) => void } = $props()

  let mode = $state<'add' | 'remove'>('add')
  let qty = $state(1)

  $effect(() => {
    if (open) {
      mode = 'add'
      qty = 1
    }
  })

  const delta = $derived(mode === 'add' ? Number(qty) : -Number(qty))
  const result = $derived((product?.stock ?? 0) + delta)

  async function save(event: SubmitEvent) {
    event.preventDefault()
    if (!product) return
    const saved = await attempt(
      () => productsApi.adjustStock(product.id, delta),
      'Inventario actualizado'
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
      <Dialog.Title>Ajustar inventario</Dialog.Title>
      <Dialog.Description>{product?.name} · hay {product?.stock}</Dialog.Description>
    </Dialog.Header>
    <form class="space-y-4" onsubmit={save}>
      <Tabs.Root bind:value={mode}>
        <Tabs.List class="w-full">
          <Tabs.Trigger value="add">Entrada (compra)</Tabs.Trigger>
          <Tabs.Trigger value="remove">Salida (merma)</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
      <div class="space-y-1.5">
        <Label for="s-qty">Cantidad</Label>
        <Input id="s-qty" type="number" min="1" step="1" bind:value={qty} autofocus />
      </div>
      <p class="text-muted-foreground text-sm">
        Quedarán <strong class={result < 0 ? 'text-destructive' : 'text-foreground'}
          >{result}</strong
        >
      </p>
      <Dialog.Footer>
        <Button type="submit" class="rounded-full px-8" disabled={qty < 1 || result < 0}
          >Guardar</Button
        >
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
