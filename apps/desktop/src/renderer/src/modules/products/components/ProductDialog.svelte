<script lang="ts">
  import { Button, Dialog, Input, Label, MoneyInput, Switch } from '@bllt/ui'
  import type { ProductDto } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { formatUsd } from '../../../lib/format'
  import { productsApi } from '../api'

  let {
    open = $bindable(false),
    product = null,
    onSaved
  }: { open?: boolean; product?: ProductDto | null; onSaved: (p: ProductDto) => void } = $props()

  let code = $state('')
  let name = $state('')
  let stock = $state(0)
  let costCents = $state<number | null>(null)
  let priceCents = $state<number | null>(null)
  let active = $state(true)
  let busy = $state(false)

  $effect(() => {
    if (open) {
      code = product?.code ?? ''
      name = product?.name ?? ''
      stock = product?.stock ?? 0
      costCents = product?.costCents ?? null
      priceCents = product?.priceCents ?? null
      active = product?.active ?? true
    }
  })

  const margin = $derived(costCents != null && priceCents != null ? priceCents - costCents : null)

  async function save(event: SubmitEvent) {
    event.preventDefault()
    if (costCents == null || priceCents == null) return
    busy = true
    const input = { code, name, stock: Number(stock), costCents, priceCents }
    const saved = await attempt(
      () =>
        product
          ? productsApi.update({ ...input, id: product.id, active })
          : productsApi.create(input),
      product ? 'Producto actualizado' : 'Producto creado'
    )
    busy = false
    if (saved) {
      onSaved(saved)
      open = false
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-xl">
    <Dialog.Header>
      <Dialog.Title class="text-primary text-lg"
        >{product ? 'Editar producto' : 'Nuevo producto'}</Dialog.Title
      >
      <Dialog.Description
        >Precios en dólares. El histórico queda guardado en cada venta.</Dialog.Description
      >
    </Dialog.Header>
    <form class="grid grid-cols-2 gap-4" onsubmit={save}>
      <div class="space-y-1.5">
        <Label for="p-code">Código</Label>
        <Input id="p-code" bind:value={code} required placeholder="Ej. 7591234567890" />
      </div>
      <div class="space-y-1.5">
        <Label for="p-stock">{product ? 'Cantidad en inventario' : 'Cantidad inicial'}</Label>
        <Input
          id="p-stock"
          type="number"
          min="0"
          step="1"
          bind:value={stock}
          disabled={!!product}
        />
      </div>
      <div class="col-span-2 space-y-1.5">
        <Label for="p-name">Nombre</Label>
        <Input id="p-name" bind:value={name} required placeholder="Ej. Harina PAN 1 kg" />
      </div>
      <div class="space-y-1.5">
        <Label for="p-cost">Precio de compra</Label>
        <MoneyInput id="p-cost" bind:value={costCents} placeholder="0.00" />
      </div>
      <div class="space-y-1.5">
        <Label for="p-price">Precio de venta</Label>
        <MoneyInput id="p-price" bind:value={priceCents} placeholder="0.00" />
      </div>
      {#if margin != null}
        <p
          class={['col-span-2 text-sm', margin < 0 ? 'text-destructive' : 'text-muted-foreground']}
        >
          Ganancia por unidad: <strong class="tabular">{formatUsd(margin)}</strong>
          {#if margin < 0}(vendes por debajo del costo){/if}
        </p>
      {/if}
      {#if product}
        <label class="col-span-2 flex items-center gap-3 text-sm">
          <Switch bind:checked={active} />
          Producto activo (los inactivos no aparecen al vender)
        </label>
        <p class="text-muted-foreground col-span-2 text-xs">
          Para cambiar la cantidad usa "Ajustar inventario" en la lista.
        </p>
      {/if}
      <Dialog.Footer class="col-span-2">
        <Button
          type="submit"
          class="rounded-full px-8"
          disabled={busy || costCents == null || priceCents == null}
        >
          Guardar
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
