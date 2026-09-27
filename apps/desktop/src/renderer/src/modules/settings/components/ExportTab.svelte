<script lang="ts">
  import { businessDate, ExportFormat } from '@bllt/shared'
  import { Button, Card, Input, Label, Progress, Tabs } from '@bllt/ui'
  import { onMount } from 'svelte'
  import type { ExportProgress } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { settingsApi } from '../api'

  const today = businessDate()
  let from = $state(`${today.slice(0, 7)}-01`)
  let to = $state(today)
  let format = $state<string>(ExportFormat.XLSX)
  let job = $state<ExportProgress | null>(null)

  onMount(() =>
    window.api.events.onExportProgress((p) => {
      if (!job || p.jobId === job.jobId) job = p
    })
  )

  async function start() {
    const started = await attempt(() =>
      settingsApi.exports.start({ from, to, format: format as ExportFormat })
    )
    if (started) job = { jobId: started.jobId, stage: 'RUNNING', percent: 0 }
  }
</script>

<Card.Root class="max-w-2xl">
  <Card.Header>
    <Card.Title>Exportar ventas</Card.Title>
    <Card.Description>
      Incluye cada línea de venta con cliente, usuario, tasa, montos en USD y Bs y ganancia. Se
      guarda en Documentos/Bllt/Exportaciones. Puedes seguir vendiendo mientras se genera.
    </Card.Description>
  </Card.Header>
  <Card.Content class="space-y-5">
    <div class="flex flex-wrap gap-4">
      <div class="space-y-1.5">
        <Label for="e-from">Desde</Label>
        <Input id="e-from" type="date" class="w-44" bind:value={from} max={to} />
      </div>
      <div class="space-y-1.5">
        <Label for="e-to">Hasta</Label>
        <Input id="e-to" type="date" class="w-44" bind:value={to} min={from} />
      </div>
      <div class="space-y-1.5">
        <Label>Formato</Label>
        <Tabs.Root bind:value={format}>
          <Tabs.List>
            <Tabs.Trigger value={ExportFormat.XLSX}>Excel (.xlsx)</Tabs.Trigger>
            <Tabs.Trigger value={ExportFormat.CSV}>CSV</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </div>
    </div>
    <Button
      class="rounded-full"
      disabled={!from || !to || job?.stage === 'RUNNING'}
      onclick={start}
    >
      Exportar
    </Button>
    {#if job}
      <div class="space-y-2">
        <Progress value={job.percent} />
        {#if job.stage === 'RUNNING'}
          <p class="text-muted-foreground text-sm">Generando… {job.percent}%</p>
        {:else if job.stage === 'DONE' && job.file}
          <p class="text-primary text-sm">
            Listo.
            <button
              class="underline"
              onclick={() => settingsApi.openPath(job!.file!).catch(() => undefined)}
            >
              Mostrar archivo
            </button>
          </p>
        {:else}
          <p class="text-destructive text-sm">{job.message}</p>
        {/if}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
