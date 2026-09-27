<script lang="ts">
  import type { DashboardSummary } from '@bllt/shared'
  import { Alert, Button, Card, Skeleton, SummaryCards, Table, Badge } from '@bllt/ui'
  import CartIcon from '@lucide/svelte/icons/shopping-cart'
  import TriangleIcon from '@lucide/svelte/icons/triangle-alert'
  import { onMount } from 'svelte'
  import type { SaleDto } from '../../../../../types/api'
  import PageHeader from '../../../layout/PageHeader.svelte'
  import { attempt } from '../../../lib/api'
  import { formatBusinessDate, formatBusinessTime, formatUsd } from '../../../lib/format'
  import { router } from '../../../lib/router.svelte'
  import { rateStore } from '../../rates/stores/rate.svelte'
  import RateSuggestionBanner from '../../rates/components/RateSuggestionBanner.svelte'
  import { salesApi } from '../../sales/api'
  import { dashboardApi } from '../api'
  import SyncStatusCard from '../components/SyncStatusCard.svelte'

  let { onConfirmRate }: { onConfirmRate: () => void } = $props()

  let summary = $state<DashboardSummary | null>(null)
  let recent = $state<SaleDto[]>([])

  async function load() {
    summary = (await attempt(() => dashboardApi.summary())) ?? null
    if (summary) {
      const date = summary.businessDate
      recent = (await attempt(() => salesApi.list({ from: date, to: date, limit: 8 }))) ?? []
    }
  }

  onMount(() => {
    void load()
    const timer = setInterval(load, 60_000)
    return () => clearInterval(timer)
  })

  // Reload when the rate changes (confirmed from the header dialog, or a suggestion accepted).
  $effect(() => {
    void rateStore.confirmed?.bsPerUsd
    void load()
  })
</script>

<PageHeader
  title="Inicio"
  description={summary
    ? `Día de negocio ${formatBusinessDate(summary.businessDate)} · hora de Venezuela`
    : ''}
>
  {#snippet actions()}
    <Button class="h-10 rounded-full px-5" onclick={() => router.go('new-sale')}>
      <CartIcon /> Nueva venta
    </Button>
  {/snippet}
</PageHeader>

<div class="space-y-6">
  {#if !rateStore.confirmed}
    <Alert.Root variant="destructive">
      <TriangleIcon />
      <Alert.Title>Falta confirmar la tasa de hoy</Alert.Title>
      <Alert.Description>
        Las ventas están bloqueadas hasta que confirmes los bolívares por dólar.
        <Button size="sm" class="mt-2 rounded-full" onclick={onConfirmRate}>Confirmar tasa</Button>
      </Alert.Description>
    </Alert.Root>
  {/if}
  <RateSuggestionBanner />

  {#if summary}
    <SummaryCards {summary} />
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each [0, 1, 2, 3] as i (i)}<Skeleton class="h-32 rounded-2xl" />{/each}
    </div>
  {/if}

  <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    <Card.Root>
      <Card.Header>
        <Card.Title>Ventas de hoy</Card.Title>
        <Card.Action>
          <Button variant="link" class="h-auto px-0" onclick={() => router.go('sales')}
            >Ver todas</Button
          >
        </Card.Action>
      </Card.Header>
      <Card.Content>
        {#if recent.length === 0}
          <p class="text-muted-foreground py-6 text-center text-sm">Todavía no hay ventas hoy.</p>
        {:else}
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Nº</Table.Head>
                <Table.Head>Hora</Table.Head>
                <Table.Head>Cliente</Table.Head>
                <Table.Head class="text-right">Total</Table.Head>
                <Table.Head class="text-right">Ganancia</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each recent as sale (sale.id)}
                <Table.Row class={sale.status === 'VOIDED' ? 'opacity-50' : ''}>
                  <Table.Cell class="tabular font-medium">#{sale.number}</Table.Cell>
                  <Table.Cell>{formatBusinessTime(sale.createdAt)}</Table.Cell>
                  <Table.Cell>
                    {sale.customerName ?? 'Anónimo'}
                    {#if sale.status === 'VOIDED'}<Badge variant="outline" class="ml-1"
                        >Anulada</Badge
                      >{/if}
                  </Table.Cell>
                  <Table.Cell class="tabular text-right">{formatUsd(sale.totalCents)}</Table.Cell>
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
    <SyncStatusCard />
  </div>
</div>
