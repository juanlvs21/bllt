<script lang="ts">
  import { AlertDialog, Button, Card, Table } from '@bllt/ui'
  import FolderIcon from '@lucide/svelte/icons/folder-open'
  import { onMount } from 'svelte'
  import type { BackupInfo, BackupSettings } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { formatBusinessDateTime, formatRelative } from '../../../lib/format'
  import { settingsApi } from '../api'

  let settings = $state<BackupSettings | null>(null)
  let backups = $state<BackupInfo[]>([])
  let busy = $state(false)
  let restoreTarget = $state<BackupInfo | null>(null)
  let restoreOpen = $state(false)

  async function load() {
    settings = (await attempt(() => settingsApi.backups.settings())) ?? null
    backups = (await attempt(() => settingsApi.backups.list())) ?? []
  }
  onMount(load)

  async function runNow() {
    busy = true
    await attempt(() => settingsApi.backups.runNow(), 'Respaldo creado')
    busy = false
    await load()
  }

  async function chooseDir() {
    settings = (await attempt(() => settingsApi.backups.chooseDir())) ?? settings
    await load()
  }

  async function resetDir() {
    settings = (await attempt(() => settingsApi.backups.resetDir())) ?? settings
    await load()
  }

  async function restore() {
    if (restoreTarget) await attempt(() => settingsApi.backups.restore(restoreTarget!.path))
    else await attempt(() => settingsApi.backups.chooseFileAndRestore())
  }

  const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
</script>

<div class="max-w-4xl space-y-6">
  <Card.Root>
    <Card.Header>
      <Card.Title>Respaldos automáticos</Card.Title>
      <Card.Description>
        Se crea uno al abrir Bllt por primera vez cada día. Se guardan los últimos 7 días.
        Copia la carpeta a un pendrive de vez en cuando.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="bg-muted/60 flex flex-wrap items-center gap-3 rounded-xl p-4 text-sm">
        <FolderIcon class="text-primary size-5" />
        <span class="min-w-0 flex-1 truncate font-mono text-xs">{settings?.dir}</span>
        <Button
          variant="ghost"
          size="sm"
          onclick={() => settings && settingsApi.openPath(settings.dir).catch(() => undefined)}
          >Abrir</Button
        >
        <Button variant="outline" size="sm" onclick={chooseDir}>Cambiar carpeta</Button>
        {#if settings && settings.dir !== settings.defaultDir}
          <Button variant="ghost" size="sm" onclick={resetDir}>Usar Documentos</Button>
        {/if}
      </div>
      <div class="flex items-center gap-3">
        <Button class="rounded-full" disabled={busy} onclick={runNow}>Respaldar ahora</Button>
        {#if settings?.lastBackupAt}
          <span class="text-muted-foreground text-sm"
            >Último respaldo {formatRelative(settings.lastBackupAt)}</span
          >
        {/if}
        <Button
          variant="outline"
          class="ml-auto rounded-full"
          onclick={() => {
            restoreTarget = null
            restoreOpen = true
          }}>Restaurar desde archivo…</Button
        >
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header><Card.Title>Respaldos disponibles</Card.Title></Card.Header>
    <Card.Content>
      {#if backups.length === 0}
        <p class="text-muted-foreground py-6 text-center text-sm">
          Todavía no hay respaldos en esta carpeta.
        </p>
      {:else}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Archivo</Table.Head>
              <Table.Head>Fecha</Table.Head>
              <Table.Head class="text-right">Tamaño</Table.Head>
              <Table.Head class="w-28"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each backups as b (b.path)}
              <Table.Row>
                <Table.Cell class="font-mono text-xs">{b.file}</Table.Cell>
                <Table.Cell>{formatBusinessDateTime(b.createdAt)}</Table.Cell>
                <Table.Cell class="tabular text-right">{size(b.size)}</Table.Cell>
                <Table.Cell class="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => {
                      restoreTarget = b
                      restoreOpen = true
                    }}>Restaurar</Button
                  >
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </Card.Content>
  </Card.Root>
</div>

<AlertDialog.Root bind:open={restoreOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>¿Restaurar un respaldo?</AlertDialog.Title>
      <AlertDialog.Description>
        Los datos actuales se reemplazan por los del respaldo{restoreTarget
          ? ` del ${formatBusinessDateTime(restoreTarget.createdAt)}`
          : ''}. Antes se guarda una copia de la base actual en la carpeta de respaldos. Bllt se
        reiniciará.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
      <AlertDialog.Action onclick={restore}>Restaurar</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
