<script lang="ts">
  import { Button } from '@bllt/ui'
  import DownloadIcon from '@lucide/svelte/icons/download'
  import WifiOffIcon from '@lucide/svelte/icons/wifi-off'
  import CoinsIcon from '@lucide/svelte/icons/coins'
  import SmartphoneIcon from '@lucide/svelte/icons/smartphone'
  import ShieldIcon from '@lucide/svelte/icons/shield-check'
  import ReceiptIcon from '@lucide/svelte/icons/receipt-text'
  import UsersIcon from '@lucide/svelte/icons/users'
  import FileTextIcon from '@lucide/svelte/icons/file-text'
  import CheckIcon from '@lucide/svelte/icons/check'
  import { SITE } from '$lib/site'

  const features = [
    {
      icon: WifiOffIcon,
      title: 'Sin internet',
      text: 'Todo vive en tu PC. Si se cae la conexión, sigues vendiendo.'
    },
    {
      icon: CoinsIcon,
      title: 'Tasa BCV del día',
      text: 'La sugiere sola y tú la confirmas. Cada venta guarda la suya.'
    },
    {
      icon: ReceiptIcon,
      title: 'Ganancias reales',
      text: 'Guarda el costo de cada venta: las ganancias pasadas no cambian.'
    },
    {
      icon: UsersIcon,
      title: 'Dueño y empleados',
      text: 'Tus empleados venden; tú manejas usuarios, respaldos y exportes.'
    },
    {
      icon: ShieldIcon,
      title: 'Respaldos automáticos',
      text: 'Una copia diaria en Documentos/Bllt, sin que hagas nada.'
    },
    {
      icon: SmartphoneIcon,
      title: 'Varias PCs y teléfono',
      text: 'Opcional y gratis con Cloudflare: las mismas ventas e inventario en varias PCs, y el resumen en el teléfono.'
    }
  ]

  const receiptPoints = [
    'Logo, nombre y RIF de tu negocio en el membrete.',
    'Cliente, tasa del día y cada producto en USD y Bs.',
    'Tamaño carta; si la venta es larga, sigue en varias páginas.',
    'Lo imprimes o lo guardas en Documentos/Bllt/Receipts.'
  ]
</script>

<svelte:head>
  <title>{SITE.title}</title>
  <meta
    name="description"
    content="Bllt (se lee billete) es una app de escritorio gratis y open source para controlar inventario, ventas y clientes en dólares con la tasa BCV del día. Funciona sin internet."
  />
  <meta property="og:title" content={SITE.title} />
  <meta
    property="og:description"
    content="Inventario y ventas en USD con la tasa BCV de cada venta. Sin internet."
  />
  <meta property="og:image" content="{SITE.url}/capturas/08-dashboard.png" />
  <link rel="canonical" href={SITE.url} />
</svelte:head>

<main>
  <section class="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
    <div>
      <h1 class="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
        Inventario en dólares<br /><span class="text-primary">y bolívares</span>, sin internet.
      </h1>
      <p class="text-muted-foreground mt-5 max-w-lg text-lg">
        Para el negocio pequeño en Venezuela: registra productos, ventas y clientes en USD y guarda
        la tasa BCV con la que se hizo cada venta. Gratis y open source.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <Button href={SITE.download} class="h-12 rounded-full px-6 text-base"
          ><DownloadIcon /> Descargar para Windows</Button
        >
        <Button href="/docs/instalacion" variant="outline" class="h-12 rounded-full px-6 text-base"
          >Cómo instalar</Button
        >
      </div>
      <p class="text-muted-foreground mt-3 text-xs">
        Windows 10 o superior · última versión en GitHub Releases
      </p>
    </div>
    <div class="relative">
      <div
        class="bg-gold absolute -top-6 -right-6 size-40 rounded-full opacity-80 blur-2xl"
        aria-hidden="true"
      ></div>
      <img
        src="/capturas/08-dashboard.png"
        alt="Pantalla de inicio de Bllt con la tasa del día y las ganancias en dólares y bolívares"
        class="ring-foreground/10 relative rounded-2xl shadow-2xl ring-1"
        width="1366"
        height="820"
      />
    </div>
  </section>

  <section class="mx-auto max-w-5xl px-4 pb-16 lg:pb-24">
    <h2 class="text-center text-2xl font-bold">Así se usa</h2>
    <p class="text-muted-foreground mx-auto mt-2 max-w-2xl text-center">
      Entrar, confirmar la tasa del día, registrar un producto y venderlo con su comprobante en PDF.
      Todo en menos de un minuto.
    </p>
    <video
      class="ring-foreground/10 mt-8 w-full rounded-2xl shadow-2xl ring-1"
      width="1366"
      height="820"
      poster="/video/demo.jpg"
      autoplay
      muted
      loop
      playsinline
      controls
      preload="metadata"
      aria-label="Demostración de Bllt: inicio de sesión, tasa del día, nuevo producto y venta con comprobante en PDF"
    >
      <source src="/video/demo.webm" type="video/webm" />
      <source src="/video/demo.mp4" type="video/mp4" />
    </video>
  </section>

  <section class="bg-card border-y">
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-2 lg:grid-cols-3">
      {#each features as f (f.title)}
        <div>
          <div
            class="bg-secondary text-secondary-foreground mb-3 flex size-11 items-center justify-center rounded-xl"
          >
            <f.icon class="size-5" />
          </div>
          <h2 class="font-bold">{f.title}</h2>
          <p class="text-muted-foreground mt-1 text-sm">{f.text}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="mx-auto max-w-6xl px-4 py-16">
    <h2 class="text-2xl font-bold">Una venta de ejemplo</h2>
    <p class="text-muted-foreground mt-2 max-w-2xl">
      Tasa confirmada del día: 855,6625 Bs/USD. El Comedor Doña Carmen se lleva 14 artículos:
      harina, arroz, café, aceite, queso, huevos y más. Total
      <strong class="text-foreground">$33,05 · Bs 28.279,65</strong>; ganancia
      <strong class="text-primary">$9,05 · Bs 7.743,75</strong>. Si mañana sube la tasa, esa venta
      sigue valiendo lo mismo.
    </p>
    <div class="mt-8 grid gap-6 md:grid-cols-2">
      <img
        src="/capturas/06-new-sale.png"
        alt="Pantalla de nueva venta con el carrito y el cliente"
        class="ring-foreground/10 rounded-xl ring-1"
        loading="lazy"
      />
      <img
        src="/capturas/07-invoice.png"
        alt="Comprobante de venta con montos en USD y Bs"
        class="ring-foreground/10 rounded-xl ring-1"
        loading="lazy"
      />
    </div>
  </section>

  <section class="bg-card border-y">
    <div class="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2">
      <div>
        <div
          class="bg-secondary text-secondary-foreground mb-4 flex size-11 items-center justify-center rounded-xl"
        >
          <FileTextIcon class="size-5" />
        </div>
        <h2 class="text-2xl font-bold">Comprobante en PDF</h2>
        <p class="text-muted-foreground mt-2 max-w-lg">
          Al terminar una venta pulsa <strong class="text-foreground">Imprimir</strong>: Bllt arma
          el comprobante en PDF y te lo muestra antes de imprimirlo o guardarlo.
        </p>
        <ul class="mt-6 space-y-3">
          {#each receiptPoints as point (point)}
            <li class="flex gap-3">
              <CheckIcon class="text-primary mt-0.5 size-5 shrink-0" />
              <span>{point}</span>
            </li>
          {/each}
        </ul>
        <p class="text-muted-foreground mt-6 text-sm">
          Es un comprobante informativo, no una factura fiscal.
        </p>
      </div>
      <img
        src="/capturas/12-receipt-pdf.png"
        alt="Vista previa del comprobante en PDF con el membrete del negocio, el cliente y los productos en USD y Bs"
        class="ring-foreground/10 mx-auto w-full max-w-lg rounded-xl shadow-xl ring-1"
        width="900"
        height="1000"
        loading="lazy"
      />
    </div>
  </section>

  <section class="mx-auto max-w-6xl px-4 py-20">
    <div
      class="bg-primary text-primary-foreground flex flex-wrap items-center justify-between gap-6 rounded-3xl p-10"
    >
      <div>
        <h2 class="text-2xl font-bold">¿Más de una PC, o ver el día desde el teléfono?</h2>
        <p class="text-primary-foreground/80 mt-1">
          Despliega tu propia nube gratis en Cloudflare con un botón: cada PC sigue funcionando sin
          internet y se pone al día sola.
        </p>
      </div>
      <Button href="/docs/nube" variant="secondary" class="h-11 rounded-full px-6"
        >Ver la guía</Button
      >
    </div>
  </section>
</main>
