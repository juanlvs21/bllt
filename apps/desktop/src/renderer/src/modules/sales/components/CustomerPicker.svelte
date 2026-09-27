<script lang="ts">
  import { Button, Command, Popover } from '@bllt/ui'
  import CheckIcon from '@lucide/svelte/icons/check'
  import ChevronsIcon from '@lucide/svelte/icons/chevrons-up-down'
  import UserPlusIcon from '@lucide/svelte/icons/user-plus'
  import type { CustomerDto } from '../../../../../types/api'
  import { attempt } from '../../../lib/api'
  import { customersApi } from '../../customers/api'
  import CustomerDialog from '../../customers/components/CustomerDialog.svelte'

  let { value = $bindable(null) }: { value?: CustomerDto | null } = $props()

  let open = $state(false)
  let customers = $state<CustomerDto[]>([])
  let query = $state('')
  let createOpen = $state(false)

  async function load() {
    customers = (await attempt(() => customersApi.list())) ?? []
  }

  $effect(() => {
    if (open) void load()
  })

  function pick(customer: CustomerDto | null) {
    value = customer
    open = false
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        class="h-10 w-full justify-between rounded-xl font-normal"
      >
        <span class={value ? 'font-medium' : 'text-muted-foreground'}>
          {value ? `${value.name}${value.document ? ` · ${value.document}` : ''}` : 'Venta anónima'}
        </span>
        <ChevronsIcon class="opacity-50" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-(--bits-popover-anchor-width) p-0" align="start">
    <Command.Root>
      <Command.Input placeholder="Buscar por nombre o cédula…" bind:value={query} />
      <Command.List>
        <Command.Empty>No se encontró el cliente.</Command.Empty>
        <Command.Group>
          <Command.Item value="__anon" onSelect={() => pick(null)}>
            <CheckIcon class={value ? 'opacity-0' : ''} /> Venta anónima
          </Command.Item>
          <Command.Item
            value="__new"
            onSelect={() => {
              open = false
              createOpen = true
            }}
          >
            <UserPlusIcon /> Registrar cliente nuevo
          </Command.Item>
        </Command.Group>
        <Command.Group heading="Clientes">
          {#each customers as c (c.id)}
            <Command.Item value={`${c.name} ${c.document ?? ''} ${c.id}`} onSelect={() => pick(c)}>
              <CheckIcon class={value?.id === c.id ? '' : 'opacity-0'} />
              <span>{c.name}</span>
              {#if c.document}<span class="text-muted-foreground ml-auto font-mono text-xs"
                  >{c.document}</span
                >{/if}
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>

<CustomerDialog bind:open={createOpen} initialName={query} onSaved={(c) => (value = c)} />
