import type { BlltApi } from '../types/api'

declare global {
  interface Window {
    api: BlltApi
  }
}

export {}
