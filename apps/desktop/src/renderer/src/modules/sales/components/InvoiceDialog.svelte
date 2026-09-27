<script lang="ts">
  import { AlertDialog, Button, Dialog } from '@bllt/ui'
  import PrinterIcon from '@lucide/svelte/icons/printer'
  import BanIcon from '@lucide/svelte/icons/ban'
  import type { SaleDto } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { session } from '../../../lib/session.svelte'
  import { salesApi } from '../api'
  import InvoiceBody from './InvoiceBody.svelte'

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
  <Dialog.Content class="invoice-dialog sm:max-w-2xl">
    {#if sale}
      <InvoiceBody {sale} />
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
