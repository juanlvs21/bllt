<script lang="ts">
  import { Dialog } from '@bllt/ui'
  import RateConfirmForm from './RateConfirmForm.svelte'

  let { open = $bindable(false) }: { open?: boolean } = $props()
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Tasa del día</Dialog.Title>
      <Dialog.Description>Confirma o corrige los bolívares por dólar de hoy.</Dialog.Description>
    </Dialog.Header>
    {#if open}
      <RateConfirmForm onConfirmed={() => (open = false)} />
    {/if}
  </Dialog.Content>
</Dialog.Root>
