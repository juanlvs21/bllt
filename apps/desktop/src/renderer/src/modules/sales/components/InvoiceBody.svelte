<script lang="ts">
  import { Badge, Logo, Separator, Table } from '@bllt/ui'
  import type { SaleDto } from '../../../../../types/api'
  import {
    formatBs,
    formatBusinessDateTime,
    formatRate,
    formatUsd,
    usdCentsToBsCents
  } from '../../../lib/format'

  /** `draft`: a sale not saved yet, so there's no number or date. */
  let { sale, draft = false }: { sale: SaleDto; draft?: boolean } = $props()
</script>

<div class="invoice flex min-h-0 flex-col gap-5 *:shrink-0">
  <div class="flex items-start justify-between">
    <div>
      <Logo size={30} />
      <p class="text-muted-foreground mt-2 text-xs">Comprobante interno · no fiscal</p>
    </div>
    <div class="pr-8 text-right">
      {#if draft}
        <p class="text-primary text-xl font-bold">Resumen de venta</p>
        <p class="text-muted-foreground text-sm">Revisa antes de registrar</p>
      {:else}
        <p class="text-primary text-xl font-bold">Venta #{sale.number}</p>
        <p class="text-muted-foreground text-sm">{formatBusinessDateTime(sale.createdAt)}</p>
        {#if sale.status === 'VOIDED'}<Badge variant="destructive" class="mt-1">Anulada</Badge>{/if}
      {/if}
    </div>
  </div>
  <div class="bg-muted/60 grid grid-cols-3 gap-4 rounded-xl p-4 text-sm">
    <div>
      <p class="text-muted-foreground text-xs">Cliente</p>
      <p class="font-medium">{sale.customerName ?? 'Anónimo'}</p>
      {#if sale.customerDocument}<p class="font-mono text-xs">{sale.customerDocument}</p>{/if}
    </div>
    <div>
      <p class="text-muted-foreground text-xs">Atendió</p>
      <p class="font-medium">{sale.username}</p>
    </div>
    <div>
      <p class="text-muted-foreground text-xs">Tasa</p>
      <p class="tabular font-medium">{formatRate(sale.rate)} Bs/USD</p>
    </div>
  </div>
  <div class="invoice-items min-h-0 shrink! overflow-y-auto">
    <Table.Root>
      <Table.Header class="bg-popover sticky top-0 z-10">
        <Table.Row>
          <Table.Head>Producto</Table.Head>
          <Table.Head class="text-right">Cant.</Table.Head>
          <Table.Head class="text-right">Precio</Table.Head>
          <Table.Head class="text-right">Total USD</Table.Head>
          <Table.Head class="text-right">Total Bs</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each sale.items as item (item.id)}
          <Table.Row>
            <Table.Cell>
              {item.productName}
              <span class="text-muted-foreground block font-mono text-xs">{item.productCode}</span>
            </Table.Cell>
            <Table.Cell class="tabular text-right">{item.qty}</Table.Cell>
            <Table.Cell class="tabular text-right">{formatUsd(item.priceCents)}</Table.Cell>
            <Table.Cell class="tabular text-right"
              >{formatUsd(item.qty * item.priceCents)}</Table.Cell
            >
            <Table.Cell class="tabular text-right">
              {formatBs(usdCentsToBsCents(item.qty * item.priceCents, sale.rate))}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
  <Separator />
  <div class="flex items-end justify-between">
    <p class="text-muted-foreground text-sm">
      Ganancia: <span class="text-primary tabular font-semibold">{formatUsd(sale.profitCents)}</span
      >
    </p>
    <div class="text-right">
      <p class="tabular text-3xl font-bold">{formatUsd(sale.totalCents)}</p>
      <p class="tabular text-muted-foreground">
        {formatBs(usdCentsToBsCents(sale.totalCents, sale.rate))}
      </p>
    </div>
  </div>
</div>
