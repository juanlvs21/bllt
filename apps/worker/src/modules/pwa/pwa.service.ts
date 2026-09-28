import type { Env } from '../../core/env'
import { BUSINESS_NAME_KEY, syncRepository } from '../sync/sync.repository'

/** Business name the desktop synced; empty until the first sync. */
export async function businessName(env: Env): Promise<string> {
  return ((await syncRepository.meta(env.DB, BUSINESS_NAME_KEY)) ?? '').trim()
}

/**
 * The PWA manifest with the synced business name, so the app installs under it. The page asks
 * /api/business itself; the manifest is read by the browser, so the Worker fills it in.
 */
export async function serveManifest(request: Request, env: Env): Promise<Response> {
  // The body depends on the synced name too, so the asset's ETag can't validate it: always ask
  // for the full file and send it without validators.
  const headers = new Headers(request.headers)
  headers.delete('if-none-match')
  headers.delete('if-modified-since')
  const res = await env.ASSETS.fetch(new Request(request, { headers }))
  const name = await businessName(env)
  if (!res.ok || !name) return res

  const manifest = (await res.json()) as Record<string, unknown>
  const out = new Headers(res.headers)
  for (const h of ['content-length', 'etag', 'last-modified']) out.delete(h)
  return new Response(JSON.stringify({ ...manifest, name, short_name: name }), {
    status: res.status,
    headers: out
  })
}
