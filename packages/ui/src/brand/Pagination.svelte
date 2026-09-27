<script lang="ts">
  import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS, type PerPage } from '@bllt/shared'
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import { Button } from '../components/button'
  import * as Select from '../components/select'
  import { cn } from '../lib/utils'

  let {
    page = $bindable(1),
    perPage = $bindable(DEFAULT_PER_PAGE),
    total,
    class: className = ''
  }: {
    page?: number
    perPage?: PerPage
    /** Rows matching the current filters, across every page. */
    total: number
    class?: string
  } = $props()

  const pages = $derived(Math.max(1, Math.ceil(total / perPage)))
  const first = $derived(total === 0 ? 0 : (page - 1) * perPage + 1)
  const last = $derived(Math.min(page * perPage, total))
</script>

<div
  class={cn('text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-3 text-sm', className)}
>
  <div class="flex items-center gap-2">
    <span>Mostrar</span>
    <Select.Root
      type="single"
      value={String(perPage)}
      onValueChange={(value) => {
        perPage = Number(value) as PerPage
        page = 1
      }}
    >
      <Select.Trigger size="sm" class="w-20" aria-label="Elementos por página"
        >{perPage}</Select.Trigger
      >
      <Select.Content>
        {#each PER_PAGE_OPTIONS as option (option)}
          <Select.Item value={String(option)} label={String(option)} />
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
  <span class="tabular">{first}–{last} de {total}</span>
  <div class="ml-auto flex items-center gap-2">
    <span class="tabular">Página {page} de {pages}</span>
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Página anterior"
      title="Página anterior"
      disabled={page <= 1}
      onclick={() => (page -= 1)}><ChevronLeftIcon /></Button
    >
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Página siguiente"
      title="Página siguiente"
      disabled={page >= pages}
      onclick={() => (page += 1)}><ChevronRightIcon /></Button
    >
  </div>
</div>
