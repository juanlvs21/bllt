<script lang="ts">
  import { cn } from '@bllt/ui'
  import HomeIcon from '@lucide/svelte/icons/house'
  import CoinsIcon from '@lucide/svelte/icons/coins'

  let { tab = $bindable() }: { tab: 'summary' | 'rate' } = $props()

  const items = [
    { id: 'summary', label: 'Resumen', icon: HomeIcon },
    { id: 'rate', label: 'Sugerir tasa', icon: CoinsIcon }
  ] as const
</script>

<nav
  class="bg-card/95 fixed inset-x-0 bottom-0 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur"
>
  <div class="mx-auto flex max-w-lg">
    {#each items as item (item.id)}
      <button
        class={cn(
          'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium',
          tab === item.id ? 'text-primary' : 'text-muted-foreground'
        )}
        onclick={() => (tab = item.id)}
      >
        <item.icon class="size-5" />
        {item.label}
      </button>
    {/each}
  </div>
</nav>
