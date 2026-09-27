import { ipcMain, BrowserWindow } from 'electron'
import type { Role } from '@bllt/shared'
import type { ZodType } from 'zod'
import type { SessionUser } from '../../types/api'
import { toErrorResult } from './errors'
import { session } from './session'

interface HandleOptions<I> {
  /** Zod schema for the single argument; omitted for calls without input. */
  input?: ZodType<I>
  /** false for calls allowed before login. Defaults to true. */
  auth?: boolean
  role?: Role
}

/**
 * Registers an IPC adapter: validates input with Zod, checks the session and
 * role, and always resolves to a Result.
 */
export function handle<I, O>(
  channel: string,
  options: HandleOptions<I>,
  fn: (input: I, user: SessionUser) => O | Promise<O>
): void {
  ipcMain.handle(channel, async (_event, raw: unknown) => {
    try {
      const user =
        options.auth === false ? (session.get() as SessionUser) : session.require(options.role)
      const input = options.input ? options.input.parse(raw) : (raw as I)
      const data = await fn(input, user)
      return { ok: true, data: data ?? null }
    } catch (error) {
      return toErrorResult(error)
    }
  })
}

/** Pushes an event to every open window. */
export function broadcast(channel: string, payload?: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}
