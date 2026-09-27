<script lang="ts">
  import type { Snippet } from 'svelte'
  import { Logo } from '@bllt/ui'

  let { children }: { children: Snippet } = $props()
</script>

<div class="grid h-full grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
  <aside
    class="bg-primary text-primary-foreground relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
  >
    <div class="bg-card inline-flex w-fit rounded-2xl px-4 py-3 shadow-sm">
      <Logo size={36} />
    </div>
    <div class="relative z-10 space-y-4">
      <p class="text-4xl leading-tight font-bold">
        Inventario y ventas<br />en dólares y bolívares.
      </p>
      <p class="text-primary-foreground/80 max-w-sm">
        Funciona sin internet. Cada venta guarda la tasa del día, así tus ganancias nunca cambian.
      </p>
    </div>
    <p class="text-primary-foreground/70 text-sm">Bllt · se lee "billete"</p>
    <div
      class="bg-gold/90 absolute -right-24 -bottom-24 size-72 rounded-full opacity-90"
      aria-hidden="true"
    ></div>
    <div
      class="border-primary-foreground/20 absolute top-1/3 -right-10 h-40 w-72 rotate-12 rounded-3xl border-2"
      aria-hidden="true"
    ></div>
  </aside>
  <main class="flex items-center justify-center overflow-y-auto p-6">
    <div class="w-full max-w-md">
      <div class="mb-8 lg:hidden"><Logo size={36} /></div>
      {@render children()}
    </div>
  </main>
</div>
