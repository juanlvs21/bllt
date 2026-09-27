<script lang="ts">
  import { parseRate, rateToInput } from '@bllt/shared'
  import type { HTMLInputAttributes } from 'svelte/elements'
  import { cn } from '../lib/utils'

  type Props = Omit<HTMLInputAttributes, 'value'> & {
    /** Scaled Bs/USD (4 decimals); null while empty or invalid. */
    value?: number | null
  }

  let { value = $bindable(null), class: className, ...rest }: Props = $props()

  let text = $state(value == null ? '' : rateToInput(value))
  let lastEmitted: number | null | undefined = value

  $effect(() => {
    if (value !== lastEmitted) {
      text = value == null ? '' : rateToInput(value)
      lastEmitted = value
    }
  })

  function onInput(event: Event) {
    text = (event.currentTarget as HTMLInputElement).value
    lastEmitted = parseRate(text)
    value = lastEmitted
  }
</script>

<div
  class={cn(
    'border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex h-12 w-full items-center rounded-xl border bg-transparent transition-colors focus-within:ring-3',
    className
  )}
>
  <input
    {...rest}
    inputmode="decimal"
    autocomplete="off"
    class="tabular placeholder:text-muted-foreground h-full w-full min-w-0 bg-transparent px-4 text-2xl font-semibold outline-none"
    value={text}
    oninput={onInput}
  />
  <span class="text-muted-foreground pr-4 text-sm whitespace-nowrap">Bs / USD</span>
</div>
