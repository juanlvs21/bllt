<script lang="ts">
  import { Button, Card, Logo } from '@bllt/ui'
  import { formatBusinessDate } from '../../../lib/format'
  import { rateStore } from '../stores/rate.svelte'
  import RateConfirmForm from '../components/RateConfirmForm.svelte'

  let { onDone }: { onDone: () => void } = $props()

  const weekday = $derived(
    rateStore.today
      ? new Intl.DateTimeFormat('es-VE', { weekday: 'long', timeZone: 'UTC' }).format(
          new Date(`${rateStore.today.businessDate}T12:00:00Z`)
        )
      : ''
  )
</script>

<div class="flex h-full items-center justify-center overflow-y-auto p-6">
  <div class="w-full max-w-lg">
    <div class="mb-6 flex justify-center"><Logo size={40} /></div>
    <Card.Root class="rounded-3xl p-2 shadow-sm">
      <Card.Header>
        <p class="text-primary text-sm font-semibold capitalize">
          {weekday}
          {rateStore.today ? formatBusinessDate(rateStore.today.businessDate) : ''}
        </p>
        <Card.Title class="text-2xl font-bold">Confirma la tasa de hoy</Card.Title>
        <Card.Description>
          Cada venta guarda esta tasa. Hasta confirmarla no se pueden registrar ventas.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <RateConfirmForm onConfirmed={onDone} />
      </Card.Content>
    </Card.Root>
    <div class="mt-4 text-center">
      <Button variant="link" class="text-muted-foreground" onclick={onDone}>
        Ahora no, solo quiero consultar
      </Button>
    </div>
  </div>
</div>
