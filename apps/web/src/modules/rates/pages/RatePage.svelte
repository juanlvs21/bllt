<script lang="ts">
  import { Button, Card, RateInput, toast } from '@bllt/ui'
  import { api, ApiError } from '../../../lib/api'

  let { onUnauthorized, onDone }: { onUnauthorized: () => void; onDone: () => void } = $props()

  let value = $state<number | null>(null)
  let busy = $state(false)

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!value) return
    busy = true
    try {
      await api.suggestRate(value)
      toast.success('Enviada. La PC la mostrará como sugerencia.')
      onDone()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return onUnauthorized()
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar')
    } finally {
      busy = false
    }
  }
</script>

<h1 class="text-primary mt-4 text-xl font-semibold uppercase">Sugerir tasa</h1>
<p class="text-muted-foreground mt-1 text-sm">
  La tasa no cambia sola: aparece en la PC como sugerencia y alguien allá la acepta o la rechaza. Si
  nadie la usa, vence a la 1:00 am. Las ventas ya hechas conservan su tasa.
</p>

<Card.Root class="mt-6">
  <Card.Content>
    <form class="space-y-4" onsubmit={submit}>
      <label for="rate" class="text-sm font-semibold">Bolívares por dólar</label>
      <RateInput id="rate" bind:value placeholder="0,0000" />
      <Button type="submit" class="h-12 w-full rounded-full text-base" disabled={!value || busy}
        >Enviar a la PC</Button
      >
      <p class="text-muted-foreground text-xs">Necesita conexión a internet.</p>
    </form>
  </Card.Content>
</Card.Root>
