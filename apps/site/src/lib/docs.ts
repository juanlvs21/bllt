import type { Component } from 'svelte'

export interface DocMeta {
  title: string
  description: string
  order: number
}

export interface DocEntry extends DocMeta {
  slug: string
  component: Component
}

const modules = import.meta.glob<{ default: Component; metadata: DocMeta }>(
  '../content/docs/**/*.md',
  {
    eager: true
  }
)

/** Every Markdown file in src/content/docs, keyed by its path ("instalacion", "guias/ventas"). */
export const docs: DocEntry[] = Object.entries(modules)
  .map(([path, mod]) => ({
    slug: path.replace('../content/docs/', '').replace(/\.md$/, ''),
    component: mod.default,
    ...mod.metadata
  }))
  .sort((a, b) => a.order - b.order)

export const guides = docs.filter((d) => d.slug.startsWith('guias/'))
export const mainDocs = docs.filter((d) => !d.slug.startsWith('guias/'))
