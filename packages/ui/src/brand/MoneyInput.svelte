<script lang="ts">
  import { centsToInput, parseUsdToCents } from '@bllt/shared'
  import type { HTMLInputAttributes } from 'svelte/elements'
  import { cn } from '../lib/utils'

  type Props = Omit<HTMLInputAttributes, 'value'> & {
    /** Amount in USD cents; null while the text is empty or invalid. */
    value?: number | null
    currency?: string
  }

  let { value = $bindable(null), currency = '$', class: className, ...rest }: Props = $props()

  let text = $state(value == null ? '' : centsToInput(value))
  let lastEmitted: number | null | undefined = value

  // Keep the text in sync when the parent changes the value (e.g. a form reset).
  $effect(() => {
    if (value !== lastEmitted) {
      text = value == null ? '' : centsToInput(value)
      lastEmitted = value
    }
  })

  function onInput(event: Event) {
    text = (event.currentTarget as HTMLInputElement).value
    const parsed = parseUsdToCents(text)
    lastEmitted = parsed === null || parsed < 0 ? null : parsed
    value = lastEmitted
  }
</script>

<div
  class={cn(
    'border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex h-8 w-full items-center rounded-lg border bg-transparent text-sm transition-colors focus-within:ring-3',
    className
  )}
>
  <span class="text-muted-foreground pl-2.5 text-sm">{currency}</span>
  <input
    {...rest}
    inputmode="decimal"
    autocomplete="off"
    class="tabular placeholder:text-muted-foreground h-full w-full min-w-0 bg-transparent px-1.5 outline-none"
    value={text}
    oninput={onInput}
  />
</div>
