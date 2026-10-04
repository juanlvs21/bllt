<script lang="ts">
  import { businessDate, DEFAULT_PER_PAGE, type PerPage } from '@bllt/shared'
  import { Badge, Button, Card, DateRangePicker, Label, Pagination, Table } from '@bllt/ui'
  import XIcon from '@lucide/svelte/icons/x'
  import type { SaleDto } from '../../../../../types/api'
  import PageHeader from '../../../layout/PageHeader.svelte'
  import { attempt } from '../../../lib/api'
  import {
    formatBusinessDateTime,
    formatRate,
    formatSaleNumber,
    formatUsd,
    plural
  } from '../../../lib/format'
  import { router } from '../../../lib/router.svelte'
  import { salesApi } from '../api'
  import InvoiceDialog from '../components/InvoiceDialog.svelte'

  const today = businessDate()
  const initialCustomer = router.params.customerId ?? ''
  let customerId = $state(initialCustomer)
  let customerName = $state(router.params.customerName ?? '')
  // A customer's history shows all their sales; otherwise start with today.
  let from = $state(initialCustomer ? '' : today)
  let to = $state(initialCustomer ? '' : today)
  let sales = $state<SaleDto[]>([])
  let page = $state(1)
  let perPage = $state<PerPage>(DEFAULT_PER_PAGE)
  let total = $state(0)
  let summary = $state({ completedCount: 0, totalCents: 0, profitCents: 0 })
  let selected = $state<SaleDto | null>(null)
  let open = $state(false)

  async function load() {
    const result = await attempt(() =>
      salesApi.page({
        customerId: customerId || undefined,
        from: from && to ? from : undefined,
        to: from && to ? to : undefined,
        page,
        perPage
      })
    )
    sales = result?.items ?? []
    total = result?.total ?? 0
    summary = result ?? { completedCount: 0, totalCents: 0, profitCents: 0 }
    if (result) page = result.page
  }

  // A new filter starts over from the first page.
  $effect(() => {
    void [customerId, from, to]
    page = 1
  })

  $effect(() => {
    void [customerId, from, to, page, perPage]
    void load()
  })

  function onChanged(updated: SaleDto) {
    selected = updated
    // Voiding changes the period's totals, so reload them along with the row.
    void load()
  }
</script>

<PageHeader
  title="Ventas"
  description="Cada venta es su factura, con la tasa del momento en que se hizo."
/>

<Card.Root>
  <Card.Header class="flex flex-wrap items-end gap-4">
    <div class="space-y-1.5">
      <Label for="period">Período</Label>
      <DateRangePicker id="period" class="w-64" bind:from bind:to max={today} />
    </div>
    <Button
      variant="ghost"
      onclick={() => {
        from = today
        to = today
      }}>Hoy</Button
    >
    <Button
      variant="ghost"
      onclick={() => {
        from = ''
        to = ''
      }}>Todas</Button
    >
    {#if customerId}
      <Badge variant="secondary" class="h-8 gap-2 px-3 text-sm">
        Cliente: {customerName}
        <button
          aria-label="Quitar filtro"
          onclick={() => {
            customerId = ''
            customerName = ''
          }}><XIcon class="size-3.5" /></button
        >
      </Badge>
    {/if}
    <div class="text-muted-foreground ml-auto flex gap-5 text-sm">
      <span>{plural(summary.completedCount, 'venta', 'ventas')}</span>
      <span
        >Total <strong class="text-foreground tabular">{formatUsd(summary.totalCents)}</strong
        ></span
      >
      <span
        >Ganancia <strong class="text-primary tabular">{formatUsd(summary.profitCents)}</strong
        ></span
      >
    </div>
  </Card.Header>
  <Card.Content>
    {#if sales.length === 0}
      <p class="text-muted-foreground py-16 text-center">No hay ventas en este período.</p>
    {:else}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Nº</Table.Head>
            <Table.Head>Fecha</Table.Head>
            <Table.Head>Cliente</Table.Head>
            <Table.Head>Atendió</Table.Head>
            <Table.Head class="text-right">Artículos</Table.Head>
            <Table.Head class="text-right">Tasa</Table.Head>
            <Table.Head class="text-right">Total</Table.Head>
            <Table.Head class="text-right">Ganancia</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each sales as sale (sale.id)}
            <Table.Row
              class={['cursor-pointer', sale.status === 'VOIDED' && 'opacity-50']}
              onclick={() => {
                selected = sale
                open = true
              }}
            >
              <Table.Cell class="tabular font-semibold">
                {formatSaleNumber(sale.series, sale.number)}
                {#if sale.deviceName}
                  <span class="text-muted-foreground block text-xs font-normal">
                    {sale.deviceName}
                  </span>
                {/if}
              </Table.Cell>
              <Table.Cell>{formatBusinessDateTime(sale.createdAt)}</Table.Cell>
              <Table.Cell>
                {sale.customerName ?? 'Anónimo'}
                {#if sale.status === 'VOIDED'}<Badge variant="outline" class="ml-1">Anulada</Badge
                  >{/if}
              </Table.Cell>
              <Table.Cell class="text-muted-foreground">{sale.username}</Table.Cell>
              <Table.Cell class="tabular text-right"
                >{sale.items.reduce((s, i) => s + i.qty, 0)}</Table.Cell
              >
              <Table.Cell class="tabular text-muted-foreground text-right"
                >{formatRate(sale.rate)}</Table.Cell
              >
              <Table.Cell class="tabular text-right font-semibold"
                >{formatUsd(sale.totalCents)}</Table.Cell
              >
              <Table.Cell class="tabular text-primary text-right"
                >{formatUsd(sale.profitCents)}</Table.Cell
              >
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
      <Pagination class="mt-4" bind:page bind:perPage {total} />
    {/if}
  </Card.Content>
</Card.Root>

<InvoiceDialog bind:open sale={selected} {onChanged} />
