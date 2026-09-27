import type { LoginInput, RecoverInput, SetupInputRaw } from '@bllt/shared'
import { api, unwrap } from '../../lib/api'

export const authApi = {
  status: () => unwrap(api.auth.status()),
  setup: (input: SetupInputRaw) => unwrap(api.auth.setup(input)),
  login: (input: LoginInput) => unwrap(api.auth.login(input)),
  logout: () => unwrap(api.auth.logout()),
  recover: (input: RecoverInput) => unwrap(api.auth.recover(input)),
  changePassword: (current: string, next: string) =>
    unwrap(api.auth.changePassword({ current, next }))
}
