import {
  changePasswordInput,
  loginInput,
  recoverInput,
  Role,
  setupInput,
  userCreateInput,
  userResetPasswordInput,
  userSetActiveInput
} from '@bllt/shared'
import { handle } from '../../core/ipc'
import { userService } from './user.service'

export function registerUserIpc(): void {
  handle('auth:status', { auth: false }, () => userService.status())
  handle('auth:setup', { auth: false, input: setupInput }, (input) => userService.setup(input))
  handle('auth:login', { auth: false, input: loginInput }, (input) => userService.login(input))
  handle('auth:logout', { auth: false }, () => userService.logout())
  handle('auth:recover', { auth: false, input: recoverInput }, (input) =>
    userService.recover(input)
  )
  handle('auth:changePassword', { input: changePasswordInput }, (input, user) =>
    userService.changePassword(user, input.current, input.next)
  )

  handle('users:list', { role: Role.ADMIN }, () => userService.list())
  handle('users:create', { role: Role.ADMIN, input: userCreateInput }, (input) =>
    userService.create(input)
  )
  handle('users:setActive', { role: Role.ADMIN, input: userSetActiveInput }, (input, user) =>
    userService.setActive(user, input.id, input.active)
  )
  handle('users:resetPassword', { role: Role.ADMIN, input: userResetPasswordInput }, (input) =>
    userService.resetPassword(input.id, input.password)
  )
  handle('users:regenerateRecoveryCode', { role: Role.ADMIN }, (_input, user) =>
    userService.regenerateRecoveryCode(user)
  )
}
