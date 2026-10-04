import { api, unwrap } from '../../lib/api'

export const dashboardApi = {
  summary: () => unwrap(api.dashboard.summary()),
  syncStatus: () => unwrap(api.sync.status()),
  syncNow: () => unwrap(api.sync.runNow()),
  devices: () => unwrap(api.sync.devices()),
  conflicts: () => unwrap(api.sync.conflicts()),
  negativeStock: async () =>
    (await unwrap(api.products.page({ page: 1, perPage: 10 }))).negativeStock
}
