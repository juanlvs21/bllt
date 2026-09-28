import { api } from './api'

/** Last name the Worker gave, so it shows at once and offline. */
const KEY = 'bllt:business-name'

function stored(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

/** Business name the desktop synced to the Worker; empty until the first sync. */
export const business = $state({ name: stored() })

/** Page title and iOS home screen label; the manifest's name comes from the Worker. */
function apply(name: string): void {
  const label = name || 'Bllt'
  document.title = label
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', label)
}

/** Asks the Worker for the current name; offline, the stored one stays. */
export async function loadBusiness(): Promise<void> {
  apply(business.name)
  try {
    const { name } = await api.business()
    business.name = name
    apply(name)
    localStorage.setItem(KEY, name)
  } catch {
    // Offline or storage blocked: keep what we have.
  }
}
