<script lang="ts">
  import { Button, Label } from '@bllt/ui'
  import ImageIcon from '@lucide/svelte/icons/image'
  import { attempt } from '../../../lib/api'
  import { readLogo } from '../logo'

  /** Logo as a data URL, or null for none. */
  let { value = $bindable(null), id = 'logo' }: { value?: string | null; id?: string } = $props()

  let input: HTMLInputElement

  async function pick() {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    const logo = await attempt(() => readLogo(file))
    if (logo) value = logo
  }
</script>

<div class="space-y-1.5">
  <Label for={id}>Logo (opcional)</Label>
  <div class="flex items-center gap-4">
    <div
      class="bg-muted/60 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border"
    >
      {#if value}
        <img src={value} alt="Logo del negocio" class="size-full object-contain" />
      {:else}
        <ImageIcon class="text-muted-foreground size-6" />
      {/if}
    </div>
    <div class="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onclick={() => input.click()}>
        {value ? 'Cambiar' : 'Subir imagen'}
      </Button>
      {#if value}
        <Button type="button" variant="ghost" size="sm" onclick={() => (value = null)}>
          Quitar
        </Button>
      {/if}
    </div>
  </div>
  <input
    bind:this={input}
    {id}
    type="file"
    accept="image/png,image/jpeg,image/webp"
    class="hidden"
    onchange={pick}
  />
</div>
