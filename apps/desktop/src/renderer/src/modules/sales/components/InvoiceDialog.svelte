<script lang="ts">
  import { AlertDialog, Badge, Button, Dialog, Logo, Separator, Table } from '@bllt/ui'
  import PrinterIcon from '@lucide/svelte/icons/printer'
  import BanIcon from '@lucide/svelte/icons/ban'
  import type { SaleDto } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import {
    formatBs,
    formatBusinessDateTime,
    formatRate,
    formatUsd,
    usdCentsToBsCents
  } from '../../../lib/format'
  import { session } from '../../../lib/session.svelte'
  import { salesApi } from '../api'

  let {
    open = $bindable(false),
    sale,
    onChanged
  }: { open?: boolean; sale: SaleDto | null; onChanged?: (sale: SaleDto) => void } = $props()

  let confirmVoid = $state(false)

  async function voidSale() {
    if (!sale) return
    const updated = await attempt(
      () => salesApi.void(sale.id),
      'Venta anulada; el inventario se devolvió'
    )
    confirmVoid = false
    if (updated) onChanged?.(updated)
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-2xl">
    {#if sale}
      <div class="invoice space-y-5">
        <div class="flex items-start justify-between">
          <div>
            <Logo size={30} />
            <p class="text-muted-foreground mt-2 text-xs">Comprobante interno · no fiscal</p>
          </div>
          <div class="pr-8 text-right">
            <p class="text-primary text-xl font-bold">Venta #{sale.number}</p>
            <p class="text-muted-foreground text-sm">{formatBusinessDateTime(sale.createdAt)}</p>
            {#if sale.status === 'VOIDED'}<Badge variant="destructive" class="mt-1">Anulada</Badge
              >{/if}
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
        <Table.Root>
          <Table.Header>
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
                  <span class="text-muted-foreground block font-mono text-xs"
                    >{item.productCode}</span
                  >
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
        <Separator />
        <div class="flex items-end justify-between">
          <p class="text-muted-foreground text-sm">
            Ganancia: <span class="text-primary tabular font-semibold"
              >{formatUsd(sale.profitCents)}</span
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
      <Dialog.Footer class="print:hidden">
        {#if session.isAdmin && sale.status === 'COMPLETED'}
          <Button variant="destructive" class="mr-auto" onclick={() => (confirmVoid = true)}>
            <BanIcon /> Anular venta
          </Button>
        {/if}
        <Button variant="outline" class="rounded-full" onclick={() => window.print()}>
          <PrinterIcon /> Imprimir
        </Button>
        <Button class="rounded-full px-6" onclick={() => (open = false)}>Listo</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={confirmVoid}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>¿Anular la venta #{sale?.number}?</AlertDialog.Title>
      <AlertDialog.Description>
        La venta queda registrada como anulada, deja de contar en las ganancias y los productos
        vuelven al inventario. No se puede deshacer.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-destructive text-white hover:bg-destructive/90"
        onclick={voidSale}
      >
        Anular
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
