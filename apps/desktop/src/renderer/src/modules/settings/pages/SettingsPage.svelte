<script lang="ts">
  import { Tabs } from '@bllt/ui'
  import PageHeader from '../../../layout/PageHeader.svelte'
  import { router } from '../../../lib/router.svelte'
  import { session } from '../../../lib/session.svelte'
  import AboutTab from '../components/AboutTab.svelte'
  import AccountTab from '../components/AccountTab.svelte'
  import BackupsTab from '../components/BackupsTab.svelte'
  import CloudTab from '../components/CloudTab.svelte'
  import ExportTab from '../components/ExportTab.svelte'
  import UsersTab from '../components/UsersTab.svelte'

  let tab = $state(router.params.tab ?? 'account')
</script>

<PageHeader title="Configuración" />

<Tabs.Root bind:value={tab} class="gap-6">
  <Tabs.List>
    <Tabs.Trigger value="account">Mi cuenta</Tabs.Trigger>
    {#if session.isAdmin}
      <Tabs.Trigger value="users">Usuarios</Tabs.Trigger>
      <Tabs.Trigger value="cloud">Nube</Tabs.Trigger>
      <Tabs.Trigger value="backups">Respaldos</Tabs.Trigger>
      <Tabs.Trigger value="export">Exportar</Tabs.Trigger>
    {/if}
    <Tabs.Trigger value="about">Acerca de</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="account"><AccountTab /></Tabs.Content>
  {#if session.isAdmin}
    <Tabs.Content value="users"><UsersTab /></Tabs.Content>
    <Tabs.Content value="cloud"><CloudTab /></Tabs.Content>
    <Tabs.Content value="backups"><BackupsTab /></Tabs.Content>
    <Tabs.Content value="export"><ExportTab /></Tabs.Content>
  {/if}
  <Tabs.Content value="about"><AboutTab /></Tabs.Content>
</Tabs.Root>
