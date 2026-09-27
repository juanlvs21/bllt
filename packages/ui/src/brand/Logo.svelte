<script lang="ts">
  import { cn } from '../lib/utils'

  // Same geometry as assets/brand/logo-*.svg; colors follow the theme tokens.
  let {
    class: className = '',
    wordmark = true,
    size = 32
  }: { class?: string; wordmark?: boolean; size?: number } = $props()

  const width = $derived(wordmark ? (size * 154) / 64 : size)
</script>

<span class={cn('inline-flex items-center select-none', className)}>
  <svg
    {width}
    height={size}
    viewBox={wordmark ? '0 0 154 64' : '0 0 64 64'}
    role="img"
    aria-label="Bllt"
  >
    <path
      d="M15 26 C15 5 49 5 49 26"
      fill="none"
      stroke="var(--primary)"
      stroke-width="4.5"
      stroke-linecap="round"
    />
    <circle cx="32" cy="21" r="9" fill="var(--gold)" />
    <circle
      cx="32"
      cy="21"
      r="5.5"
      fill="none"
      stroke="#3b2a05"
      stroke-opacity=".35"
      stroke-width="1.5"
    />
    <path
      fill-rule="evenodd"
      fill="var(--primary)"
      d="M8 26 H56 Q58 26 57.6 28 L52 51 Q51.2 55 47 55 H17 Q12.8 55 12 51 L6.4 28 Q6 26 8 26 Z M22.25 34 a1.75 1.75 0 0 1 3.5 0 V47 a1.75 1.75 0 0 1 -3.5 0 ZM30.25 34 a1.75 1.75 0 0 1 3.5 0 V47 a1.75 1.75 0 0 1 -3.5 0 ZM38.25 34 a1.75 1.75 0 0 1 3.5 0 V47 a1.75 1.75 0 0 1 -3.5 0 Z"
    />
    {#if wordmark}
      <path
        fill="var(--foreground)"
        d="M93.586 50Q91.182 50 89.125 49.042Q87.068 48.085 85.712 46.458Q84.356 44.832 84.047 42.853V30.589Q84.356 28.609 85.719 27.079Q87.081 25.549 89.138 24.688Q91.195 23.827 93.586 23.827Q97.237 23.827 100.014 25.511Q102.79 27.195 104.359 30.158Q105.927 33.121 105.927 36.926Q105.927 40.719 104.359 43.662Q102.79 46.606 100.014 48.303Q97.237 50 93.586 50ZM78.597 49.486V12H87.57V30.524L86.091 36.605L87.377 42.737V49.486ZM91.966 42.03Q93.406 42.03 94.512 41.368Q95.617 40.706 96.247 39.549Q96.877 38.392 96.877 36.913Q96.877 35.435 96.247 34.278Q95.617 33.121 94.492 32.459Q93.367 31.797 91.928 31.797Q90.488 31.797 89.376 32.459Q88.264 33.121 87.66 34.259Q87.055 35.396 87.055 36.913Q87.055 38.43 87.679 39.587Q88.302 40.744 89.414 41.387Q90.526 42.03 91.966 42.03ZM108.061 49.486V12H117.034V49.486ZM120.71 49.486V12H129.683V49.486ZM136.805 49.486V13.98H145.778V49.486ZM131.277 31.797V24.341H151.306V31.797Z"
      />
    {/if}
  </svg>
</span>
