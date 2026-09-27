<script lang="ts">
  import { businessDate } from '@bllt/shared'
  import { Badge, Button, Card, Input, Label, Table } from '@bllt/ui'
  import XIcon from '@lucide/svelte/icons/x'
  import type { SaleDto } from '../../../../../types/api'
  import PageHeader from '../../../layout/PageHeader.svelte'
  import { attempt } from '../../../lib/api'
  import { formatBusinessDateTime, formatRate, formatUsd, plural } from '../../../lib/format'
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
  let selected = $state<SaleDto | null>(null)
  let open = $state(false)

  async function load() {
    sales =
      (await attempt(() =>
        salesApi.list({
          customerId: customerId || undefined,
          from: from && to ? from : undefined,
          to: from && to ? to : undefined,
          limit: 500
        })
      )) ?? []
  }

  $effect(() => {
    void [customerId, from, to]
    void load()
  })

  const completed = $derived(sales.filter((s) => s.status === 'COMPLETED'))
  const total = $derived(completed.reduce((s, x) => s + x.totalCents, 0))
  const profit = $derived(completed.reduce((s, x) => s + x.profitCents, 0))

  function onChanged(updated: SaleDto) {
    selected = updated
    sales = sales.map((s) => (s.id === updated.id ? updated : s))
  }
</script>

<PageHeader
  title="Ventas"
  description="Cada venta es su factura, con la tasa del momento en que se hizo."
/>

<Card.Root>
  <Card.Header class="flex flex-wrap items-end gap-4">
    <div class="space-y-1.5">
      <Label for="from">Desde</Label>
      <Input id="from" type="date" class="w-40" bind:value={from} max={to || undefined} />
    </div>
    <div class="space-y-1.5">
      <Label for="to">Hasta</Label>
      <Input id="to" type="date" class="w-40" bind:value={to} min={from || undefined} />
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
      <span>{plural(completed.length, 'venta', 'ventas')}</span>
      <span>Total <strong class="text-foreground tabular">{formatUsd(total)}</strong></span>
      <span>Ganancia <strong class="text-primary tabular">{formatUsd(profit)}</strong></span>
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
              <Table.Cell class="tabular font-semibold">#{sale.number}</Table.Cell>
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
    {/if}
  </Card.Content>
</Card.Root>

<InvoiceDialog bind:open sale={selected} {onChanged} />
