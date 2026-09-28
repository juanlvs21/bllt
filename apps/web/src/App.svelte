<script lang="ts">
  import type { WebUser } from '@bllt/shared'
  import { Toaster } from '@bllt/ui'
  import { ModeWatcher } from 'mode-watcher'
  import { onMount } from 'svelte'
  import { api, ApiError } from './lib/api'
  import { loadBusiness } from './lib/business.svelte'
  import { summaryCache } from './lib/cache'
  import LoginPage from './modules/auth/pages/LoginPage.svelte'
  import SummaryPage from './modules/summary/pages/SummaryPage.svelte'
  import RatePage from './modules/rates/pages/RatePage.svelte'
  import BottomNav from './lib/BottomNav.svelte'

  let user = $state<WebUser | null>(null)
  let phase = $state<'loading' | 'login' | 'app'>('loading')
  let tab = $state<'summary' | 'rate'>('summary')

  onMount(async () => {
    void loadBusiness()
    try {
      user = (await api.me()).user
      phase = 'app'
    } catch (error) {
      // Offline with a cached summary: still show it.
      if (error instanceof ApiError && error.status === 0 && summaryCache.read()) phase = 'app'
      else phase = 'login'
    }
  })

  async function logout() {
    await api.logout().catch(() => undefined)
    summaryCache.clear()
    user = null
    phase = 'login'
  }

  function onUnauthorized() {
    user = null
    phase = 'login'
  }
</script>

<ModeWatcher />
<Toaster richColors position="top-center" />

{#if phase === 'loading'}
  <div class="text-muted-foreground flex min-h-dvh items-center justify-center">Cargando…</div>
{:else if phase === 'login'}
  <LoginPage
    onDone={(u) => {
      user = u
      tab = 'summary'
      phase = 'app'
    }}
  />
{:else}
  <div class="mx-auto min-h-dvh max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">
    {#if tab === 'summary'}
      <SummaryPage {user} onLogout={logout} {onUnauthorized} />
    {:else}
      <RatePage {onUnauthorized} onDone={() => (tab = 'summary')} />
    {/if}
  </div>
  <BottomNav bind:tab />
{/if}
