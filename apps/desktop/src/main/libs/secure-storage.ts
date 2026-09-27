import { safeStorage } from 'electron'

const PLAIN_PREFIX = 'plain:'
const ENC_PREFIX = 'enc:'

/** Encrypts secrets with the OS keychain (DPAPI on Windows) when available. */
export const secureStorage = {
  available(): boolean {
    return safeStorage.isEncryptionAvailable()
  },
  encrypt(value: string): string {
    if (!safeStorage.isEncryptionAvailable()) return PLAIN_PREFIX + value
    return ENC_PREFIX + safeStorage.encryptString(value).toString('base64')
  },
  decrypt(stored: string): string {
    if (stored.startsWith(PLAIN_PREFIX)) return stored.slice(PLAIN_PREFIX.length)
    if (stored.startsWith(ENC_PREFIX)) {
      return safeStorage.decryptString(Buffer.from(stored.slice(ENC_PREFIX.length), 'base64'))
    }
    return ''
  }
}
