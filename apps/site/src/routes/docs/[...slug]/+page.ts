import { error } from '@sveltejs/kit'
import { docs } from '$lib/docs'
import type { EntryGenerator, PageLoad } from './$types'

export const entries: EntryGenerator = () => docs.map((d) => ({ slug: d.slug }))

export const load: PageLoad = ({ params }) => {
  const doc = docs.find((d) => d.slug === params.slug)
  if (!doc) error(404, 'Guía no encontrada')
  return { slug: doc.slug }
}
