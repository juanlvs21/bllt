<script lang="ts">
  import { DEFAULT_PER_PAGE, type PerPage } from '@bllt/shared'
  import { Badge, Button, Card, Input, Pagination, Switch, Table } from '@bllt/ui'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import SearchIcon from '@lucide/svelte/icons/search'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import PackageIcon from '@lucide/svelte/icons/package-plus'
  import type { ProductDto } from '../../../../../types/api'
  import PageHeader from '../../../layout/PageHeader.svelte'
  import { attempt } from '../../../lib/api'
  import { formatUsd, plural } from '../../../lib/format'
  import { productsApi } from '../api'
  import ProductDialog from '../components/ProductDialog.svelte'
  import StockDialog from '../components/StockDialog.svelte'

  let products = $state<ProductDto[]>([])
  let search = $state('')
  let includeInactive = $state(false)
  let page = $state(1)
  let perPage = $state<PerPage>(DEFAULT_PER_PAGE)
  let total = $state(0)
  let inventoryValue = $state(0)
  let lowStock = $state(0)
  let negativeStock = $state(0)
  let editing = $state<ProductDto | null>(null)
  let dialogOpen = $state(false)
  let stockOpen = $state(false)
  let loaded = $state(false)

  async function load() {
    const result = await attempt(() => productsApi.page({ search, includeInactive, page, perPage }))
    products = result?.items ?? []
    total = result?.total ?? 0
    inventoryValue = result?.inventoryCents ?? 0
    lowStock = result?.lowStock ?? 0
    negativeStock = result?.negativeStock ?? 0
    if (result) page = result.page
    loaded = true
  }

  $effect(() => {
    void [search, includeInactive, page, perPage]
    const t = setTimeout(load, 150)
    return () => clearTimeout(t)
  })

  function edit(product: ProductDto | null) {
    editing = product
    dialogOpen = true
  }
</script>

<PageHeader title="Productos" description="Inventario con precios de compra y venta en dólares.">
  {#snippet actions()}
    <Button class="h-10 rounded-full px-5" onclick={() => edit(null)}
      ><PlusIcon /> Nuevo producto</Button
    >
  {/snippet}
</PageHeader>

<Card.Root>
  <Card.Header class="flex flex-wrap items-center gap-4">
    <div class="relative w-full max-w-sm">
      <SearchIcon class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        class="h-10 rounded-full pl-9"
        placeholder="Búsqueda rápida por nombre o código"
        bind:value={
          () => search,
          (value) => {
            search = value
            page = 1
          }
        }
      />
    </div>
    <label class="text-muted-foreground flex items-center gap-2 text-sm">
      <Switch
        bind:checked={
          () => includeInactive,
          (value) => {
            includeInactive = value
            page = 1
          }
        }
      /> Mostrar inactivos
    </label>
    <div class="text-muted-foreground ml-auto flex gap-4 text-sm">
      <span>{plural(total, 'producto', 'productos')}</span>
      <span
        >Inventario al costo: <strong class="text-foreground tabular"
          >{formatUsd(inventoryValue)}</strong
        ></span
      >
      {#if negativeStock > 0}<Badge variant="outline" class="border-destructive text-destructive"
          >{negativeStock} en negativo</Badge
        >{/if}
      {#if lowStock > 0}<Badge variant="outline" class="border-gold text-gold"
          >{lowStock} por agotarse</Badge
        >{/if}
    </div>
  </Card.Header>
  <Card.Content>
    {#if loaded && products.length === 0}
      <div class="text-muted-foreground py-16 text-center">
        <p class="font-medium">No hay productos{search ? ' que coincidan' : ''}.</p>
        {#if !search}<p class="text-sm">Crea el primero con “Nuevo producto”.</p>{/if}
      </div>
    {:else}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Código</Table.Head>
            <Table.Head>Producto</Table.Head>
            <Table.Head class="text-right">Cantidad</Table.Head>
            <Table.Head class="text-right">Compra</Table.Head>
            <Table.Head class="text-right">Venta</Table.Head>
            <Table.Head class="text-right">Ganancia</Table.Head>
            <Table.Head class="w-24"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each products as p (p.id)}
            <Table.Row class={p.active ? '' : 'opacity-50'}>
              <Table.Cell class="text-muted-foreground font-mono text-xs">{p.code}</Table.Cell>
              <Table.Cell class="font-medium">
                {p.name}
                {#if !p.active}<Badge variant="outline" class="ml-2">Inactivo</Badge>{/if}
              </Table.Cell>
              <Table.Cell class="tabular text-right">
                {#if p.stock === 0}
                  <Badge variant="destructive">Agotado</Badge>
                {:else if p.stock <= 3}
                  <span class="text-gold font-semibold">{p.stock}</span>
                {:else}
                  {p.stock}
                {/if}
              </Table.Cell>
              <Table.Cell class="tabular text-right">{formatUsd(p.costCents)}</Table.Cell>
              <Table.Cell class="tabular text-right font-semibold"
                >{formatUsd(p.priceCents)}</Table.Cell
              >
              <Table.Cell class="tabular text-primary text-right"
                >{formatUsd(p.priceCents - p.costCents)}</Table.Cell
              >
              <Table.Cell>
                <div class="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Ajustar inventario"
                    title="Ajustar inventario"
                    onclick={() => {
                      editing = p
                      stockOpen = true
                    }}><PackageIcon /></Button
                  >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar"
                    title="Editar"
                    onclick={() => edit(p)}
                  >
                    <PencilIcon />
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
      <Pagination class="mt-4" bind:page bind:perPage {total} />
    {/if}
  </Card.Content>
</Card.Root>

<ProductDialog bind:open={dialogOpen} product={editing} onSaved={load} />
<StockDialog bind:open={stockOpen} product={editing} onSaved={load} />
