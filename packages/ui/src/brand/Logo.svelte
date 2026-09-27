<script lang="ts">
  import { cn } from '../lib/utils'

  let {
    class: className = '',
    wordmark = true,
    size = 32
  }: { class?: string; wordmark?: boolean; size?: number } = $props()
</script>

<span class={cn('inline-flex items-center gap-2 select-none', className)}>
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <rect x="3" y="9" width="42" height="30" rx="8" fill="var(--primary)" />
    <rect
      x="8"
      y="14"
      width="32"
      height="20"
      rx="4"
      fill="none"
      stroke="var(--primary-foreground)"
      stroke-opacity="0.45"
      stroke-width="1.5"
    />
    <circle cx="36" cy="33" r="9" fill="var(--gold)" stroke="var(--card)" stroke-width="2.5" />
    <path
      d="M17 17.5h6.2a3.6 3.6 0 0 1 0 7.2H17m0-7.2v13h7a3.9 3.9 0 0 0 0-7.8"
      fill="none"
      stroke="var(--primary-foreground)"
      stroke-width="2.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
  {#if wordmark}
    <span class="text-foreground font-extrabold tracking-tight" style="font-size: {size * 0.7}px">
      bllt
    </span>
  {/if}
</span>
