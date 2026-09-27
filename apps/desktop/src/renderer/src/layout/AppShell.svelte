<script lang="ts">
  import type { Component, Snippet } from 'svelte'
  import { Badge, Button, DropdownMenu, Logo, cn } from '@bllt/ui'
  import HomeIcon from '@lucide/svelte/icons/house'
  import CartIcon from '@lucide/svelte/icons/shopping-cart'
  import ReceiptIcon from '@lucide/svelte/icons/receipt-text'
  import BoxesIcon from '@lucide/svelte/icons/boxes'
  import UsersIcon from '@lucide/svelte/icons/users'
  import SettingsIcon from '@lucide/svelte/icons/settings'
  import LogOutIcon from '@lucide/svelte/icons/log-out'
  import SunMoonIcon from '@lucide/svelte/icons/sun-moon'
  import { toggleMode } from 'mode-watcher'
  import { router, type Page } from '../lib/router.svelte'
  import { session } from '../lib/session.svelte'
  import { formatRate } from '../lib/format'
  import { rateStore } from '../modules/rates/stores/rate.svelte'

  let {
    children,
    onLogout,
    onRateClick
  }: { children: Snippet; onLogout: () => void; onRateClick: () => void } = $props()

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
    <div class="px-6 pt-7 pb-8">
      <Logo size={34} />
    </div>
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
        onclick={onLogout}
      >
        <LogOutIcon class="size-5" />
        Salir
      </button>
    </div>
  </aside>

  <div class="flex min-w-0 flex-1 flex-col">
    <header class="bg-background flex h-16 shrink-0 items-center justify-end gap-3 px-8">
      <button
        class="bg-card ring-foreground/10 hover:ring-primary/50 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ring-1 transition"
        onclick={onRateClick}
      >
        <span class="text-muted-foreground">Tasa</span>
        {#if rateStore.confirmed}
          <span class="tabular font-semibold">{formatRate(rateStore.confirmed.bsPerUsd)} Bs</span>
        {:else}
          <Badge variant="destructive">Sin confirmar</Badge>
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
          <DropdownMenu.Item onclick={onLogout}>Cerrar sesión</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </header>
    <main class="min-h-0 flex-1 overflow-y-auto px-8 pb-10">
      {@render children()}
    </main>
  </div>
</div>
