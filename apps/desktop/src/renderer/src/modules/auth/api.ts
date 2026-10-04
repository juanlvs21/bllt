import type { CloudSettingsInputRaw, LoginInput, RecoverInput, SetupInputRaw } from '@bllt/shared'
import { api, unwrap } from '../../lib/api'

export const authApi = {
  status: () => unwrap(api.auth.status()),
  setup: (input: SetupInputRaw) => unwrap(api.auth.setup(input)),
  login: (input: LoginInput) => unwrap(api.auth.login(input)),
  logout: () => unwrap(api.auth.logout()),
  /** First launch: what the Worker says about the business. */
  inspectCloud: (input: CloudSettingsInputRaw) => unwrap(api.sync.inspect(input)),
  /** First launch: joins a business that already exists and downloads its data. */
  joinCloud: (input: CloudSettingsInputRaw) => unwrap(api.sync.join(input)),
  recover: (input: RecoverInput) => unwrap(api.auth.recover(input)),
  changePassword: (current: string, next: string) =>
    unwrap(api.auth.changePassword({ current, next }))
}
