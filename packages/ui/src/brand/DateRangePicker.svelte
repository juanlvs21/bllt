<script lang="ts">
  import { formatBusinessDate } from '@bllt/shared'
  import { parseDate, type DateValue } from '@internationalized/date'
  import CalendarIcon from '@lucide/svelte/icons/calendar'
  import type { DateRange } from 'bits-ui'
  import { Button } from '../components/button'
  import * as Popover from '../components/popover'
  import { RangeCalendar } from '../components/range-calendar'
  import { cn } from '../lib/utils'

  let {
    from = $bindable(''),
    to = $bindable(''),
    max,
    id,
    placeholder = 'Todas las fechas',
    class: className = ''
  }: {
    /** Business date "YYYY-MM-DD", or '' for no lower bound. */
    from?: string
    /** Business date "YYYY-MM-DD", or '' for no upper bound. */
    to?: string
    /** Last selectable business date. */
    max?: string
    id?: string
    placeholder?: string
    class?: string
  } = $props()

  let open = $state(false)
  let value = $state<DateRange>({ start: undefined, end: undefined })
  let month = $state<DateValue | undefined>()

  const maxValue = $derived(max ? parseDate(max) : undefined)

  // Opening starts from the bound range, showing its last month on the right.
  function onOpenChange(next: boolean) {
    if (!next) return
    value = { start: from ? parseDate(from) : undefined, end: to ? parseDate(to) : undefined }
    const last = value.end ?? maxValue ?? value.start
    month = last?.subtract({ months: 1 })
  }

  // Only a complete range reaches the bindings, so half a pick never filters.
  function onValueChange(next: DateRange) {
    if (!next.start || !next.end) return
    from = next.start.toString()
    to = next.end.toString()
    open = false
  }
</script>

<Popover.Root bind:open {onOpenChange}>
  <Popover.Trigger {id}>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        class={cn('justify-start font-normal', !(from && to) && 'text-muted-foreground', className)}
      >
        <CalendarIcon />
        {from && to
          ? from === to
            ? formatBusinessDate(from)
            : `${formatBusinessDate(from)} – ${formatBusinessDate(to)}`
          : placeholder}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <RangeCalendar
      bind:value
      bind:placeholder={month}
      {onValueChange}
      {maxValue}
      numberOfMonths={2}
      locale="es-VE"
      weekStartsOn={1}
    />
  </Popover.Content>
</Popover.Root>
