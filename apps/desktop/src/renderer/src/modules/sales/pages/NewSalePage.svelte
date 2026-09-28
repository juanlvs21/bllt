<script lang="ts">
  import { Button, Card, Dialog, Input, Separator, toast } from '@bllt/ui'
  import ScanIcon from '@lucide/svelte/icons/scan-barcode'
  import MinusIcon from '@lucide/svelte/icons/minus'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import TrashIcon from '@lucide/svelte/icons/trash-2'
  import LockIcon from '@lucide/svelte/icons/lock'
  import { onMount } from 'svelte'
  import type { ProductDto, SaleDto } from '../../../../../types/api'
  import PageHeader from '../../../layout/PageHeader.svelte'
  import { attempt } from '../../../lib/api'
  import { formatBs, formatRate, formatUsd, usdCentsToBsCents } from '../../../lib/format'
  import { session } from '../../../lib/session.svelte'
  import { productsApi } from '../../products/api'
  import { rateStore } from '../../rates/stores/rate.svelte'
  import { salesApi } from '../api'
  import CustomerPicker from '../components/CustomerPicker.svelte'
  import InvoiceBody from '../components/InvoiceBody.svelte'
  import InvoiceDialog from '../components/InvoiceDialog.svelte'
  import { cart } from '../stores/cart.svelte'

  let { onConfirmRate }: { onConfirmRate: () => void } = $props()

  let search = $state('')
  let results = $state<ProductDto[]>([])
  let searchInput = $state<HTMLInputElement | null>(null)
  let busy = $state(false)
  let lastSale = $state<SaleDto | null>(null)
  let invoiceOpen = $state(false)
  let confirmOpen = $state(false)

  const rate = $derived(rateStore.confirmed?.bsPerUsd ?? null)

  /** The cart shaped as a sale, for the summary shown before registering it. */
  const draft = $derived<SaleDto>({
    id: '',
    number: 0,
    customerId: cart.customer?.id ?? null,
    customerName: cart.customer?.name ?? null,
    customerDocument: cart.customer?.document ?? null,
    userId: session.user?.id ?? '',
    username: session.user?.username ?? '',
    rate: rate ?? 0,
    totalCents: cart.totalCents,
    profitCents: cart.lines.reduce(
      (s, l) => s + l.qty * (l.product.priceCents - l.product.costCents),
      0
    ),
    status: 'COMPLETED',
    createdAt: '',
    voidedAt: null,
    items: cart.lines.map((l) => ({
      id: l.product.id,
      productId: l.product.id,
      productCode: l.product.code,
      productName: l.product.name,
      qty: l.qty,
      priceCents: l.product.priceCents,
      costCents: l.product.costCents
    }))
  })

  async function loadResults() {
    results = (await attempt(() => productsApi.list({ search }))) ?? []
  }

  $effect(() => {
    void search
    const t = setTimeout(loadResults, 120)
    return () => clearTimeout(t)
  })

  onMount(() => searchInput?.focus())

  function addProduct(product: ProductDto) {
    const inCart = cart.lines.find((l) => l.product.id === product.id)?.qty ?? 0
    if (product.stock <= 0) toast.error(`"${product.name}" está agotado`)
    else if (inCart >= product.stock) toast.error(`Solo hay ${product.stock} de "${product.name}"`)
    else cart.add(product)
  }

  /** Enter in the search box: exact code (barcode scanner) first, then the only match. */
  async function onSearchKey(event: KeyboardEvent) {
    if (event.key !== 'Enter' || !search.trim()) return
    event.preventDefault()
    const exact = await attempt(() => productsApi.findByCode(search.trim()))
    const product = exact ?? (results.length === 1 ? results[0] : null)
    if (product) {
      addProduct(product)
      search = ''
    } else {
      toast.error('No hay un producto con ese código')
    }
  }

  async function checkout() {
    if (cart.lines.length === 0) return
    confirmOpen = false
    busy = true
    const sale = await attempt(() =>
      salesApi.create({
        customerId: cart.customer?.id ?? null,
        items: cart.lines.map((l) => ({ productId: l.product.id, qty: l.qty }))
      })
    )
    busy = false
    if (!sale) return
    toast.success(`Venta #${sale.number} registrada`)
    cart.clear()
    lastSale = sale
    invoiceOpen = true
    void loadResults()
    searchInput?.focus()
  }
</script>

<PageHeader title="Nueva venta" description="Escribe el código o el nombre y pulsa Enter.">
  {#snippet actions()}
    {#if rate}
      <span class="text-muted-foreground text-sm"
        >Tasa <strong class="tabular text-foreground">{formatRate(rate)} Bs</strong></span
      >
    {/if}
  {/snippet}
</PageHeader>

{#if !rate}
  <Card.Root class="mx-auto max-w-lg text-center">
    <Card.Content class="space-y-4 py-10">
      <div class="bg-muted mx-auto flex size-14 items-center justify-center rounded-full">
        <LockIcon class="text-muted-foreground size-6" />
      </div>
      <h2 class="text-xl font-bold">Ventas bloqueadas</h2>
      <p class="text-muted-foreground">
        Para registrar ventas primero confirma la tasa de hoy. Cada venta guarda la tasa con la que
        se hizo.
      </p>
      <Button class="h-11 rounded-full px-8" onclick={onConfirmRate}>Confirmar tasa</Button>
    </Card.Content>
  </Card.Root>
{:else}
  <div class="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
    <Card.Root>
      <Card.Header>
        <div class="relative">
          <ScanIcon class="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2" />
          <Input
            bind:ref={searchInput}
            class="h-12 rounded-full pl-12 text-base"
            placeholder="Código o nombre del producto"
            bind:value={search}
            onkeydown={onSearchKey}
          />
        </div>
      </Card.Header>
      <Card.Content>
        {#if results.length === 0}
          <p class="text-muted-foreground py-10 text-center text-sm">Sin resultados.</p>
        {:else}
          <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {#each results as p (p.id)}
              <button
                class="bg-muted/50 hover:ring-primary flex flex-col gap-1 rounded-xl p-3 text-left ring-1 ring-transparent transition disabled:opacity-40"
                disabled={p.stock <= 0}
                onclick={() => addProduct(p)}
              >
                <span class="line-clamp-2 text-sm font-semibold">{p.name}</span>
                <span class="text-muted-foreground font-mono text-xs">{p.code}</span>
                <span class="mt-auto flex items-baseline justify-between pt-2">
                  <span class="tabular font-bold">{formatUsd(p.priceCents)}</span>
                  <span
                    class={[
                      'text-xs',
                      p.stock <= 3 ? 'text-gold font-semibold' : 'text-muted-foreground'
                    ]}
                  >
                    {p.stock <= 0 ? 'Agotado' : `${p.stock} disp.`}
                  </span>
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <Card.Root class="h-fit xl:sticky xl:top-0 xl:max-h-[calc(100vh-11rem)]">
      <Card.Header class="shrink-0">
        <Card.Title class="text-primary">Venta</Card.Title>
        <Card.Description>Cliente (opcional)</Card.Description>
        <div class="pt-1"><CustomerPicker bind:value={cart.customer} /></div>
      </Card.Header>
      <Card.Content class="flex min-h-0 flex-col gap-3 *:shrink-0">
        {#if cart.lines.length === 0}
          <p class="text-muted-foreground py-8 text-center text-sm">
            Agrega productos para empezar.
          </p>
        {:else}
          <ul class="-mr-2 min-h-0 shrink! divide-y overflow-y-auto pr-2">
            {#each cart.lines as line (line.product.id)}
              <li class="flex items-center gap-3 py-2.5">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">{line.product.name}</p>
                  <p class="text-muted-foreground tabular text-xs">
                    {formatUsd(line.product.priceCents)} c/u
                  </p>
                </div>
                <div class="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    aria-label="Menos"
                    onclick={() => cart.setQty(line.product.id, line.qty - 1)}
                  >
                    <MinusIcon />
                  </Button>
                  <input
                    class="tabular w-10 bg-transparent text-center text-sm font-semibold outline-none"
                    type="number"
                    min="1"
                    max={line.product.stock}
                    value={line.qty}
                    onchange={(e) => cart.setQty(line.product.id, Number(e.currentTarget.value))}
                  />
                  <Button
                    variant="outline"
                    size="icon-xs"
                    aria-label="Más"
                    disabled={line.qty >= line.product.stock}
                    onclick={() => cart.setQty(line.product.id, line.qty + 1)}
                  >
                    <PlusIcon />
                  </Button>
                </div>
                <span class="tabular w-20 text-right text-sm font-semibold"
                  >{formatUsd(line.qty * line.product.priceCents)}</span
                >
                <Button
                  variant="ghost"
                  size="icon-xs"
                  class="text-destructive"
                  aria-label="Quitar"
                  onclick={() => cart.remove(line.product.id)}
                >
                  <TrashIcon />
                </Button>
              </li>
            {/each}
          </ul>
        {/if}
        <Separator />
        <div class="flex items-end justify-between">
          <span class="text-muted-foreground text-sm">{cart.count} artículos</span>
          <div class="text-right">
            <p class="tabular text-3xl font-bold">{formatUsd(cart.totalCents)}</p>
            <p class="tabular text-muted-foreground">
              {formatBs(usdCentsToBsCents(cart.totalCents, rate))}
            </p>
          </div>
        </div>
        <Button
          class="h-12 w-full rounded-full text-base"
          disabled={busy || cart.lines.length === 0}
          onclick={() => (confirmOpen = true)}
        >
          Registrar venta
        </Button>
        {#if cart.lines.length > 0}
          <Button variant="ghost" class="w-full" onclick={() => cart.clear()}>Vaciar</Button>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>
{/if}

<Dialog.Root bind:open={confirmOpen}>
  <Dialog.Content class="invoice-dialog sm:max-w-2xl">
    <InvoiceBody sale={draft} draft />
    <Dialog.Footer>
      <Button variant="outline" class="rounded-full" onclick={() => (confirmOpen = false)}>
        Volver
      </Button>
      <Button class="rounded-full px-6" disabled={busy} onclick={checkout}>
        Confirmar venta
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<InvoiceDialog bind:open={invoiceOpen} sale={lastSale} onChanged={(s) => (lastSale = s)} />
