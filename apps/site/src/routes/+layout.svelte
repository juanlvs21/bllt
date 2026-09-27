<script lang="ts">
  import '../app.css'
  import { Button, Logo } from '@bllt/ui'
  import SunMoonIcon from '@lucide/svelte/icons/sun-moon'
  import { ModeWatcher, toggleMode } from 'mode-watcher'
  import { SITE } from '$lib/site'

  let { children } = $props()
</script>

<ModeWatcher />

<header class="bg-background/85 sticky top-0 z-20 border-b backdrop-blur">
  <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
    <a href="/" aria-label="Inicio"><Logo size={30} /></a>
    <nav class="text-muted-foreground flex gap-5 text-sm font-medium">
      <a class="hover:text-foreground" href="/docs/instalacion">Instalar</a>
      <a class="hover:text-foreground hidden sm:inline" href="/docs/guias/primer-arranque">Guías</a>
      <a class="hover:text-foreground hidden sm:inline" href="/docs/nube">Nube</a>
    </nav>
    <div class="ml-auto flex items-center gap-2">
      <Button variant="ghost" size="icon" onclick={toggleMode} aria-label="Cambiar tema"
        ><SunMoonIcon /></Button
      >
      <Button href={SITE.download} class="rounded-full px-4">Descargar</Button>
    </div>
  </div>
</header>

{@render children()}

<footer class="border-t">
  <div
    class="text-muted-foreground mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 py-8 text-sm"
  >
    <span
      >© 2026 Bllt by <a
        class="text-foreground hover:text-primary font-medium underline-offset-4 hover:underline"
        href="https://juanl.dev"
        target="_blank"
        rel="noopener">juanl.dev</a
      ></span
    >
    <a class="hover:text-foreground" href="/licencia">Licencia y marca</a>
    <a class="hover:text-foreground" href={SITE.repo}>GitHub</a>
    <a class="hover:text-foreground" href="mailto:bllt@juanl.dev">bllt@juanl.dev</a>
  </div>
</footer>
