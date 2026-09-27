<script lang="ts">
  import { DEFAULT_PER_PAGE, type PerPage } from '@bllt/shared'
  import { Button, Card, Input, Pagination, Table } from '@bllt/ui'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import SearchIcon from '@lucide/svelte/icons/search'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import HistoryIcon from '@lucide/svelte/icons/history'
  import type { CustomerDto } from '../../../../../types/api'
  import PageHeader from '../../../layout/PageHeader.svelte'
  import { attempt } from '../../../lib/api'
  import { formatBusinessDate, formatUsd } from '../../../lib/format'
  import { router } from '../../../lib/router.svelte'
  import { customersApi } from '../api'
  import CustomerDialog from '../components/CustomerDialog.svelte'

  let customers = $state<CustomerDto[]>([])
  let search = $state('')
  let page = $state(1)
  let perPage = $state<PerPage>(DEFAULT_PER_PAGE)
  let total = $state(0)
  let editing = $state<CustomerDto | null>(null)
  let dialogOpen = $state(false)
  let loaded = $state(false)

  async function load() {
    const result = await attempt(() => customersApi.page({ search, page, perPage }))
    customers = result?.items ?? []
    total = result?.total ?? 0
    if (result) page = result.page
    loaded = true
  }

  $effect(() => {
    void [search, page, perPage]
    const t = setTimeout(load, 150)
    return () => clearTimeout(t)
  })
</script>

<PageHeader
  title="Clientes"
  description="Opcionales al vender. Útiles para ver el historial de compras."
>
  {#snippet actions()}
    <Button
      class="h-10 rounded-full px-5"
      onclick={() => {
        editing = null
        dialogOpen = true
      }}><PlusIcon /> Nuevo cliente</Button
    >
  {/snippet}
</PageHeader>

<Card.Root>
  <Card.Header>
    <div class="relative w-full max-w-sm">
      <SearchIcon class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        class="h-10 rounded-full pl-9"
        placeholder="Nombre, cédula o teléfono"
        bind:value={
          () => search,
          (value) => {
            search = value
            page = 1
          }
        }
      />
    </div>
  </Card.Header>
  <Card.Content>
    {#if loaded && customers.length === 0}
      <p class="text-muted-foreground py-16 text-center">
        No hay clientes{search ? ' que coincidan' : ''}.
      </p>
    {:else}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Nombre</Table.Head>
            <Table.Head>Cédula / RIF</Table.Head>
            <Table.Head>Teléfono</Table.Head>
            <Table.Head class="text-right">Compras</Table.Head>
            <Table.Head class="text-right">Total comprado</Table.Head>
            <Table.Head>Desde</Table.Head>
            <Table.Head class="w-24"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each customers as c (c.id)}
            <Table.Row>
              <Table.Cell class="font-medium">{c.name}</Table.Cell>
              <Table.Cell class="font-mono text-xs">{c.document ?? '—'}</Table.Cell>
              <Table.Cell>{c.phone ?? '—'}</Table.Cell>
              <Table.Cell class="tabular text-right">{c.salesCount}</Table.Cell>
              <Table.Cell class="tabular text-right font-semibold"
                >{formatUsd(c.totalCents)}</Table.Cell
              >
              <Table.Cell class="text-muted-foreground"
                >{formatBusinessDate(c.createdAt)}</Table.Cell
              >
              <Table.Cell>
                <div class="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Historial de compras"
                    aria-label="Historial de compras"
                    onclick={() => router.go('sales', { customerId: c.id, customerName: c.name })}
                  >
                    <HistoryIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Editar"
                    aria-label="Editar"
                    onclick={() => {
                      editing = c
                      dialogOpen = true
                    }}><PencilIcon /></Button
                  >
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

<CustomerDialog bind:open={dialogOpen} customer={editing} onSaved={load} />
