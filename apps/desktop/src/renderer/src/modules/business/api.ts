import type { BusinessInputRaw } from '@bllt/shared'
import { api, unwrap } from '../../lib/api'

export const businessApi = {
  get: () => unwrap(api.business.get()),
  save: (input: BusinessInputRaw) => unwrap(api.business.save(input))
}
