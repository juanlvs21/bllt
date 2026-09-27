import { api, unwrap } from '../../lib/api'

export const dashboardApi = {
  summary: () => unwrap(api.dashboard.summary()),
  syncStatus: () => unwrap(api.sync.status()),
  syncNow: () => unwrap(api.sync.runNow())
}
