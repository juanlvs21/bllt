<script lang="ts">
  import { Button, cn, toast } from '@bllt/ui'
  import CheckIcon from '@lucide/svelte/icons/check'
  import CopyIcon from '@lucide/svelte/icons/copy'

  let { code, class: className }: { code: string; class?: string } = $props()

  let copied = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      toast.error('No se pudo copiar el código')
      return
    }
    copied = true
    clearTimeout(timer)
    timer = setTimeout(() => (copied = false), 2000)
  }
</script>

<div
  class={cn(
    'bg-gold-soft ring-gold/40 flex items-center justify-between gap-3 rounded-xl py-3 pr-2 pl-4 ring-1',
    className
  )}
>
  <span class="tabular font-mono text-xl font-bold tracking-wider whitespace-nowrap">{code}</span>
  <Button
    variant="ghost"
    size="icon"
    class="shrink-0"
    onclick={copy}
    aria-label={copied ? 'Copiado' : 'Copiar'}
    title={copied ? 'Copiado' : 'Copiar'}
  >
    {#if copied}
      <CheckIcon class="text-primary" />
    {:else}
      <CopyIcon />
    {/if}
  </Button>
</div>
