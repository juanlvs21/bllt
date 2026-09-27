import { handle } from '../../core/ipc'
import { dashboardService } from './dashboard.service'

export function registerDashboardIpc(): void {
  handle('dashboard:summary', {}, () => dashboardService.summary())
}
