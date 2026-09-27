<script lang="ts">
  import {
    formatBs,
    formatBusinessDate,
    formatBusinessTime,
    formatRate,
    formatRelative,
    formatUsd,
    type WebSummary,
    type WebUser
  } from '@bllt/shared'
  import { Badge, Button, Card, Logo, StatCard } from '@bllt/ui'
  import LogOutIcon from '@lucide/svelte/icons/log-out'
  import RefreshIcon from '@lucide/svelte/icons/refresh-cw'
  import WifiOffIcon from '@lucide/svelte/icons/wifi-off'
  import { onMount } from 'svelte'
  import { api, ApiError } from '../../../lib/api'
  import { summaryCache } from '../../../lib/cache'

  let {
    user,
    onLogout,
    onUnauthorized
  }: { user: WebUser | null; onLogout: () => void; onUnauthorized: () => void } = $props()

  let data = $state<WebSummary | null>(summaryCache.read())
  let offline = $state(false)
  let loading = $state(false)

  async function load() {
    loading = true
    try {
      data = await api.summary()
      summaryCache.write(data)
      offline = false
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return onUnauthorized()
      offline = true
    } finally {
      loading = false
    }
  }

  onMount(() => {
    void load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  })

  const s = $derived(data?.summary)
</script>

<header class="flex items-center justify-between py-2">
  <Logo size={28} />
  <div class="flex items-center gap-1">
    <Button variant="ghost" size="icon" disabled={loading} onclick={load} aria-label="Actualizar">
      <RefreshIcon class={loading ? 'animate-spin' : ''} />
    </Button>
    <Button variant="ghost" size="icon" onclick={onLogout} aria-label="Salir"><LogOutIcon /></Button
    >
  </div>
</header>

{#if offline && data}
  <div
    class="bg-gold-soft text-foreground mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
  >
    <WifiOffIcon class="text-gold size-4" /> Sin conexión · actualizado a las {formatBusinessTime(
      data.generatedAt
    )}
  </div>
{/if}

{#if !s}
  <p class="text-muted-foreground py-20 text-center">
    {offline ? 'Sin conexión y sin datos guardados.' : 'Cargando…'}
  </p>
{:else}
  <div class="mt-4 space-y-1">
    <p class="text-muted-foreground text-sm">
      Hola{user ? `, ${user.username}` : ''} · {formatBusinessDate(s.businessDate)}
    </p>
    <p class="text-muted-foreground text-xs">
      {#if s.lastSyncAt}
        PC sincronizada {formatRelative(s.lastSyncAt)}
      {:else}
        La PC aún no ha sincronizado
      {/if}
    </p>
  </div>

  <div class="mt-4 grid grid-cols-2 gap-3">
    <StatCard
      class="col-span-2"
      tone="primary"
      label="Ganancia de hoy"
      value={formatUsd(s.today.profitUsdCents)}
      secondary={formatBs(s.today.profitBsCents)}
      hint={`${s.today.salesCount} ${s.today.salesCount === 1 ? 'venta' : 'ventas'} · ${formatUsd(s.today.revenueUsdCents)} vendidos`}
    />
    <StatCard
      label="Ganancia del mes"
      value={formatUsd(s.month.profitUsdCents)}
      secondary={formatBs(s.month.profitBsCents)}
    />
    <StatCard
      label="Tasa del día"
      tone="gold"
      value={s.rate ? formatRate(s.rate.bsPerUsd) : '—'}
      secondary={s.rate ? `Bs/USD · ${formatBusinessTime(s.rate.confirmedAt)}` : 'Sin confirmar'}
    />
  </div>

  {#if data?.candidate}
    <p class="text-muted-foreground mt-3 text-xs">
      Tasa sugerida pendiente en la PC: <strong class="tabular"
        >{formatRate(data.candidate.bsPerUsd)}</strong
      >
      ({data.candidate.source === 'WEB' ? 'desde el teléfono' : 'automática'})
    </p>
  {/if}

  <Card.Root class="mt-5">
    <Card.Header><Card.Title>Ventas de hoy</Card.Title></Card.Header>
    <Card.Content>
      {#if data!.sales.length === 0}
        <p class="text-muted-foreground py-4 text-center text-sm">Sin ventas todavía.</p>
      {:else}
        <ul class="divide-y">
          {#each data!.sales as sale (sale.id)}
            <li
              class={[
                'flex items-center justify-between py-2.5',
                sale.status === 'VOIDED' && 'opacity-50'
              ]}
            >
              <div>
                <p class="text-sm font-medium">
                  #{sale.number} · {sale.customerName ?? 'Anónimo'}
                  {#if sale.status === 'VOIDED'}<Badge variant="outline">Anulada</Badge>{/if}
                </p>
                <p class="text-muted-foreground text-xs">{formatBusinessTime(sale.createdAt)}</p>
              </div>
              <div class="text-right">
                <p class="tabular text-sm font-semibold">{formatUsd(sale.totalCents)}</p>
                <p class="tabular text-primary text-xs">+{formatUsd(sale.profitCents)}</p>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
