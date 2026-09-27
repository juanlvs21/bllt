import { customerInput, customerUpdate, listQuery } from '@bllt/shared'
import { handle } from '../../core/ipc'
import { customerService } from './customer.service'

export function registerCustomerIpc(): void {
  handle('customers:list', { input: listQuery }, (query) => customerService.list(query))
  handle('customers:create', { input: customerInput }, (input) => customerService.create(input))
  handle('customers:update', { input: customerUpdate }, (input) => customerService.update(input))
}
