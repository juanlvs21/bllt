<script lang="ts">
  import { onMount } from 'svelte'
  import { ModeWatcher } from 'mode-watcher'
  import { Toaster, Tooltip } from '@bllt/ui'
  import type { SessionUser } from '../../types/api'
  import { router } from './lib/router.svelte'
  import { session } from './lib/session.svelte'
  import AppShell from './layout/AppShell.svelte'
  import { authApi } from './modules/auth/api'
  import { businessStore } from './modules/business/stores/business.svelte'
  import LoginPage from './modules/auth/pages/LoginPage.svelte'
  import SetupPage from './modules/auth/pages/SetupPage.svelte'
  import RateConfirmDialog from './modules/rates/components/RateConfirmDialog.svelte'
  import RateChangeDialog from './modules/rates/components/RateChangeDialog.svelte'
  import RateConfirmPage from './modules/rates/pages/RateConfirmPage.svelte'
  import { rateStore } from './modules/rates/stores/rate.svelte'
  import DashboardPage from './modules/dashboard/pages/DashboardPage.svelte'
  import NewSalePage from './modules/sales/pages/NewSalePage.svelte'
  import SalesPage from './modules/sales/pages/SalesPage.svelte'
  import ProductsPage from './modules/products/pages/ProductsPage.svelte'
  import CustomersPage from './modules/customers/pages/CustomersPage.svelte'
  import SettingsPage from './modules/settings/pages/SettingsPage.svelte'

  let phase = $state<'loading' | 'setup' | 'login' | 'rate' | 'app'>('loading')
  let rateDialog = $state(false)
  let rateChangeDialog = $state(false)
  /** Business date for which the user already saw (or skipped) the rate screen. */
  let rateGateSeenFor = ''

  async function enter(user: SessionUser) {
    session.set(user)
    await rateStore.refresh()
    const today = rateStore.today?.businessDate ?? ''
    phase = !rateStore.confirmed && rateGateSeenFor !== today ? 'rate' : 'app'
    rateGateSeenFor = today
    router.go('dashboard')
    void rateStore.check()
  }

  async function logout() {
    await authApi.logout().catch(() => undefined)
    session.clear()
  }

  onMount(() => {
    void businessStore.refresh()
    authApi.status().then((status) => {
      if (status.needsSetup) phase = 'setup'
      else if (status.user) void enter(status.user)
      else phase = 'login'
    })

    const offRate = window.api.events.onRateUpdate((today) => rateStore.set(today))
    // First open of a new business day asks for the rate again.
    const dayCheck = setInterval(async () => {
      if (phase === 'app' && rateStore.stale) {
        await rateStore.refresh()
        if (!rateStore.confirmed) phase = 'rate'
      }
    }, 60_000)
    // Look for a newer rate on the internet every hour, with or without the cloud.
    const rateCheck = setInterval(() => {
      if (phase === 'app') void rateStore.check()
    }, 3_600_000)
    return () => {
      offRate()
      clearInterval(dayCheck)
      clearInterval(rateCheck)
    }
  })

  // Session cleared anywhere (logout or expired) returns to login.
  $effect(() => {
    if (!session.user && (phase === 'app' || phase === 'rate')) phase = 'login'
  })
</script>

<ModeWatcher />
<Toaster richColors position="bottom-right" />

<Tooltip.Provider>
  {#if phase === 'loading'}
    <div class="text-muted-foreground flex h-full items-center justify-center">Cargando…</div>
  {:else if phase === 'setup'}
    <SetupPage onDone={enter} onJoined={() => (phase = 'login')} />
  {:else if phase === 'login'}
    <LoginPage onDone={enter} />
  {:else if phase === 'rate'}
    <RateConfirmPage onDone={() => (phase = 'app')} />
  {:else}
    <AppShell
      onLogout={logout}
      onRateClick={() => (rateStore.change ? (rateChangeDialog = true) : (rateDialog = true))}
    >
      {#key router.page}
        {#if router.page === 'dashboard'}
          <DashboardPage onConfirmRate={() => (rateDialog = true)} />
        {:else if router.page === 'new-sale'}
          <NewSalePage onConfirmRate={() => (rateDialog = true)} />
        {:else if router.page === 'sales'}
          <SalesPage />
        {:else if router.page === 'products'}
          <ProductsPage />
        {:else if router.page === 'customers'}
          <CustomersPage />
        {:else if router.page === 'settings'}
          <SettingsPage />
        {/if}
      {/key}
    </AppShell>
    <RateConfirmDialog bind:open={rateDialog} />
    <RateChangeDialog
      bind:open={rateChangeDialog}
      onManual={() => {
        rateChangeDialog = false
        rateDialog = true
      }}
    />
  {/if}
</Tooltip.Provider>
