<script lang="ts">
  import type { Component, Snippet } from 'svelte'
  import { AlertDialog, Badge, Button, DropdownMenu, Logo, cn } from '@bllt/ui'
  import HomeIcon from '@lucide/svelte/icons/house'
  import CartIcon from '@lucide/svelte/icons/shopping-cart'
  import ReceiptIcon from '@lucide/svelte/icons/receipt-text'
  import BoxesIcon from '@lucide/svelte/icons/boxes'
  import UsersIcon from '@lucide/svelte/icons/users'
  import SettingsIcon from '@lucide/svelte/icons/settings'
  import LogOutIcon from '@lucide/svelte/icons/log-out'
  import SunMoonIcon from '@lucide/svelte/icons/sun-moon'
  import TrendingUpIcon from '@lucide/svelte/icons/trending-up'
  import TrendingDownIcon from '@lucide/svelte/icons/trending-down'
  import { toggleMode } from 'mode-watcher'
  import { router, type Page } from '../lib/router.svelte'
  import { session } from '../lib/session.svelte'
  import { formatRate } from '../lib/format'
  import { businessStore } from '../modules/business/stores/business.svelte'
  import { rateStore } from '../modules/rates/stores/rate.svelte'

  let {
    children,
    onLogout,
    onRateClick
  }: { children: Snippet; onLogout: () => void; onRateClick: () => void } = $props()

  let confirmLogout = $state(false)
  const rateChange = $derived(rateStore.change)

  const items: { page: Page; label: string; icon: Component }[] = [
    { page: 'dashboard', label: 'Inicio', icon: HomeIcon },
    { page: 'new-sale', label: 'Nueva venta', icon: CartIcon },
    { page: 'sales', label: 'Ventas', icon: ReceiptIcon },
    { page: 'products', label: 'Productos', icon: BoxesIcon },
    { page: 'customers', label: 'Clientes', icon: UsersIcon },
    { page: 'settings', label: 'Configuración', icon: SettingsIcon }
  ]
</script>

<div class="flex h-full">
  <aside class="bg-sidebar text-sidebar-foreground flex w-64 shrink-0 flex-col border-r">
    {#if businessStore.name}
      <!-- The business is the identity of the app; Bllt signs at the bottom. -->
      <div class="flex items-center gap-3 px-5 pt-6 pb-7">
        {#if businessStore.logo}
          <img
            src={businessStore.logo}
            alt=""
            class="bg-card size-11 shrink-0 rounded-xl border object-contain p-1"
          />
        {:else}
          <span class="bg-card flex size-11 shrink-0 items-center justify-center rounded-xl border">
            <Logo wordmark={false} size={30} />
          </span>
        {/if}
        <div class="min-w-0">
          <p class="line-clamp-2 leading-tight font-bold break-words" title={businessStore.name}>
            {businessStore.name}
          </p>
          {#if businessStore.rif}
            <p class="text-muted-foreground mt-0.5 font-mono text-xs">{businessStore.rif}</p>
          {/if}
        </div>
      </div>
    {:else}
      <div class="px-6 pt-7 pb-8"><Logo size={34} /></div>
    {/if}
    <nav class="flex flex-1 flex-col gap-1 px-3">
      {#each items as item (item.page)}
        {@const active = router.page === item.page}
        <button
          class={cn(
            'flex items-center gap-4 rounded-xl px-4 py-3 text-left text-[0.95rem] font-medium transition-colors',
            active
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
              : 'hover:bg-sidebar-accent/60'
          )}
          onclick={() => router.go(item.page)}
        >
          <item.icon class="size-5" />
          {item.label}
        </button>
      {/each}
    </nav>
    <div class="p-3">
      <button
        class="text-muted-foreground hover:bg-sidebar-accent/60 flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-[0.95rem] font-medium"
        onclick={() => (confirmLogout = true)}
      >
        <LogOutIcon class="size-5" />
        Salir
      </button>
      {#if businessStore.name}
        <div class="text-muted-foreground mt-2 flex items-center gap-2 border-t px-4 pt-4 text-xs">
          <Logo size={18} />
          <span>Inventario en $ y Bs</span>
        </div>
      {/if}
    </div>
  </aside>

  <div class="flex min-w-0 flex-1 flex-col">
    <header class="bg-background flex h-16 shrink-0 items-center justify-end gap-3 px-8">
      <button
        class={cn(
          'bg-card hover:ring-primary/50 relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ring-1 transition',
          rateChange ? 'ring-gold/60' : 'ring-foreground/10'
        )}
        onclick={onRateClick}
        title={rateChange ? 'Hay una tasa nueva' : undefined}
      >
        <span class="text-muted-foreground">Tasa</span>
        {#if rateStore.confirmed}
          <span class="tabular font-semibold">{formatRate(rateStore.confirmed.bsPerUsd)} Bs</span>
        {:else}
          <Badge variant="destructive">Sin confirmar</Badge>
        {/if}
        {#if rateChange}
          <Badge class="bg-gold text-gold-foreground">
            {#if rateChange.bsPerUsd > (rateStore.confirmed?.bsPerUsd ?? 0)}
              <TrendingUpIcon />
            {:else}
              <TrendingDownIcon />
            {/if}
            Nueva
          </Badge>
          <span class="absolute -top-0.5 -right-0.5 flex size-2.5" aria-hidden="true">
            <span class="bg-gold absolute size-full animate-ping rounded-full opacity-75"></span>
            <span class="bg-gold relative size-2.5 rounded-full"></span>
          </span>
        {/if}
      </button>
      <Button variant="ghost" size="icon" onclick={toggleMode} aria-label="Cambiar tema">
        <SunMoonIcon />
      </Button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <button
              {...props}
              class="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 hover:bg-muted"
            >
              <span
                class="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-bold uppercase"
              >
                {session.user?.username.slice(0, 1)}
              </span>
              <span class="text-sm font-medium">{session.user?.username}</span>
            </button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="w-48">
          <DropdownMenu.Label>
            {session.isAdmin ? 'Administrador' : 'Empleado'}
          </DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={() => router.go('settings')}>Mi cuenta</DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => (confirmLogout = true)}>Cerrar sesión</DropdownMenu.Item
          >
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </header>
    <main class="min-h-0 flex-1 overflow-y-auto px-8 pb-10">
      {@render children()}
    </main>
  </div>
</div>

<AlertDialog.Root bind:open={confirmLogout}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>¿Cerrar sesión?</AlertDialog.Title>
      <AlertDialog.Description>
        Tendrás que escribir tu usuario y contraseña para volver a entrar.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
      <AlertDialog.Action onclick={onLogout}>Cerrar sesión</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
