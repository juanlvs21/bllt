<script lang="ts">
  import { Card, Logo } from '@bllt/ui'
  import { onMount } from 'svelte'
  import type { AppInfo } from '../../../../../types/api'
  import { settingsApi } from '../api'

  let info = $state<AppInfo | null>(null)
  onMount(async () => (info = await settingsApi.appInfo().catch(() => null)))
</script>

<Card.Root class="max-w-lg">
  <Card.Content class="space-y-3 py-6">
    <Logo size={40} />
    <p class="text-muted-foreground text-sm">Versión {info?.version} · se lee “billete”</p>
    <p class="text-sm">
      El código de Bllt es open source bajo la Apache License 2.0. El nombre, el logo y la identidad
      visual son marcas de Juan Villarroel.
    </p>
    <div class="flex gap-4 text-sm">
      <a
        class="text-primary underline"
        href="https://bllt.juanl.dev"
        target="_blank"
        rel="noreferrer">Sitio y guías</a
      >
      <a
        class="text-primary underline"
        href="https://bllt.juanl.dev/licencia"
        target="_blank"
        rel="noreferrer">Licencia</a
      >
      <a
        class="text-primary underline"
        href="https://github.com/juanlvs21/bllt"
        target="_blank"
        rel="noreferrer">GitHub</a
      >
    </div>
    <p class="text-muted-foreground font-mono text-xs break-all">Datos: {info?.dataPath}</p>
  </Card.Content>
</Card.Root>
