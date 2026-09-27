import type { WebSummary, WebUser } from '@bllt/shared'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

/** Same-origin calls; the session is an HttpOnly cookie, never stored in JS. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', ...init.headers }
    })
  } catch {
    throw new ApiError(0, 'Sin conexión')
  }
  const body = (await res.json().catch(() => ({}))) as { message?: string }
  if (!res.ok) throw new ApiError(res.status, body.message ?? 'Ocurrió un error')
  return body as T
}

export const api = {
  me: () => request<{ user: WebUser }>('/auth/me'),
  login: (username: string, password: string) =>
    request<{ user: WebUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  summary: () => request<WebSummary>('/summary'),
  suggestRate: (bsPerUsd: number) =>
    request<{ ok: true }>('/rate', { method: 'PUT', body: JSON.stringify({ bsPerUsd }) })
}
