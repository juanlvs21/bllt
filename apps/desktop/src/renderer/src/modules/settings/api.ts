import type { CloudSettingsInput, ExportInput, UserCreateInput } from '@bllt/shared'
import { api, unwrap } from '../../lib/api'

export const settingsApi = {
  appInfo: () => unwrap(api.app.info()),
  openPath: (path: string) => unwrap(api.app.openPath(path)),
  users: {
    list: () => unwrap(api.users.list()),
    create: (input: UserCreateInput) => unwrap(api.users.create(input)),
    setActive: (id: string, active: boolean) => unwrap(api.users.setActive({ id, active })),
    resetPassword: (id: string, password: string) =>
      unwrap(api.users.resetPassword({ id, password })),
    regenerateRecoveryCode: () => unwrap(api.users.regenerateRecoveryCode())
  },
  cloud: {
    get: () => unwrap(api.sync.getSettings()),
    save: (input: CloudSettingsInput) => unwrap(api.sync.saveSettings(input)),
    test: (input: CloudSettingsInput) => unwrap(api.sync.test(input))
  },
  backups: {
    list: () => unwrap(api.backups.list()),
    settings: () => unwrap(api.backups.settings()),
    runNow: () => unwrap(api.backups.runNow()),
    chooseDir: () => unwrap(api.backups.chooseDir()),
    resetDir: () => unwrap(api.backups.resetDir()),
    restore: (path: string) => unwrap(api.backups.restore(path)),
    chooseFileAndRestore: () => unwrap(api.backups.chooseFileAndRestore())
  },
  exports: {
    start: (input: ExportInput) => unwrap(api.exports.start(input))
  }
}
