import { createHash, randomUUID } from 'node:crypto'

export const newId = (): string => randomUUID()

/** Fixed namespace for ids derived from other ids (UUID v5). */
const NAMESPACE = Buffer.from('b11747ee3a7d4c0f9e6a2d4f5c1b8a90', 'hex')

/**
 * A UUID that is always the same for the same seed. Two PCs voiding the same sale generate the
 * same movement ids, so the second insert is ignored and the stock comes back only once.
 */
export function deterministicId(seed: string): string {
  const hash = createHash('sha1').update(NAMESPACE).update(seed).digest()
  hash[6] = (hash[6]! & 0x0f) | 0x50
  hash[8] = (hash[8]! & 0x3f) | 0x80
  const hex = hash.subarray(0, 16).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
