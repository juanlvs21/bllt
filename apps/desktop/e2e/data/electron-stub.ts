/** Just enough of Electron for the data layer to load outside the app. */
import { join } from 'node:path'

export const app = {
  isPackaged: false,
  getPath: (name: string) => join(process.env['BLLT_TEST_DIR'] ?? '.', name)
}
export const net = { fetch: () => Promise.reject(new Error('sin red en la prueba')) }
export const BrowserWindow = { getAllWindows: () => [] as never[], getFocusedWindow: () => null }
export const ipcMain = { handle: () => undefined }
export const safeStorage = {
  isEncryptionAvailable: () => false,
  encryptString: (s: string) => Buffer.from(s),
  decryptString: (b: Buffer) => b.toString()
}
export const dialog = {}
