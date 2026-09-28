<script lang="ts">
  import {
    formatBs,
    formatBusinessTime,
    formatRate,
    formatUsd,
    type DashboardSummary
  } from '@bllt/shared'
  import StatCard from './StatCard.svelte'

  let { summary }: { summary: DashboardSummary } = $props()
</script>

<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <StatCard
    label="Tasa del día"
    tone="primary"
    value={summary.rate ? `${formatRate(summary.rate.bsPerUsd)} Bs` : 'Sin confirmar'}
    hint={summary.rate
      ? `Confirmada a las ${formatBusinessTime(summary.rate.confirmedAt)}`
      : 'Confírmala para poder vender'}
  />
  <StatCard
    label="Ganancia de hoy"
    value={formatUsd(summary.today.profitUsdCents)}
    secondary={formatBs(summary.today.profitBsCents)}
    hint={`${summary.today.salesCount} ${summary.today.salesCount === 1 ? 'venta' : 'ventas'} · ${formatUsd(summary.today.revenueUsdCents)} vendidos`}
  />
  <StatCard
    label="Ganancia del mes"
    value={formatUsd(summary.month.profitUsdCents)}
    secondary={formatBs(summary.month.profitBsCents)}
    hint={`${summary.month.salesCount} ${summary.month.salesCount === 1 ? 'venta' : 'ventas'} · ${formatUsd(summary.month.revenueUsdCents)} vendidos`}
  />
  <StatCard
    label="Ventas del mes"
    tone="gold"
    value={formatUsd(summary.month.revenueUsdCents)}
    secondary={formatBs(summary.month.revenueBsCents)}
    hint="Ingresos brutos, sin ventas anuladas"
  />
</div>
