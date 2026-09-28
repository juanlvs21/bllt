import { rateConfirmInput } from '@bllt/shared'
import { z } from 'zod'
import { handle } from '../../core/ipc'
import { rateService } from './rate.service'

export function registerRateIpc(): void {
  handle('rates:today', {}, () => rateService.today())
  handle('rates:search', {}, () => rateService.search())
  handle('rates:confirm', { input: rateConfirmInput }, (input, user) =>
    rateService.confirm(user, input)
  )
  handle('rates:dismiss', { input: z.string().min(1) }, (id) => rateService.dismiss(id))
  handle('rates:history', {}, () => rateService.history())
}
