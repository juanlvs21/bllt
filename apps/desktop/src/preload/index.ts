/**
 * Exposes only concrete functions to the renderer: never ipcRenderer itself
 * nor the database.
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { EventChannel, type BlltApi } from '../types/api'

// Each channel resolves to the Result type declared in BlltApi; main guarantees the shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call =
  (channel: string): any =>
  (input?: unknown) =>
    ipcRenderer.invoke(channel, input)

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T) => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: BlltApi = {
  app: { info: call('app:info'), openPath: call('app:openPath') },
  auth: {
    status: call('auth:status'),
    setup: call('auth:setup'),
    login: call('auth:login'),
    logout: call('auth:logout'),
    recover: call('auth:recover'),
    changePassword: call('auth:changePassword')
  },
  users: {
    list: call('users:list'),
    create: call('users:create'),
    setActive: call('users:setActive'),
    resetPassword: call('users:resetPassword'),
    regenerateRecoveryCode: call('users:regenerateRecoveryCode')
  },
  products: {
    list: call('products:list'),
    findByCode: call('products:findByCode'),
    create: call('products:create'),
    update: call('products:update'),
    adjustStock: call('products:adjustStock')
  },
  customers: {
    list: call('customers:list'),
    create: call('customers:create'),
    update: call('customers:update')
  },
  rates: {
    today: call('rates:today'),
    fetchSuggestion: call('rates:fetchSuggestion'),
    confirm: call('rates:confirm'),
    dismiss: call('rates:dismiss'),
    history: call('rates:history')
  },
  sales: {
    create: call('sales:create'),
    list: call('sales:list'),
    get: call('sales:get'),
    void: call('sales:void')
  },
  dashboard: { summary: call('dashboard:summary') },
  sync: {
    status: call('sync:status'),
    runNow: call('sync:runNow'),
    getSettings: call('sync:getSettings'),
    saveSettings: call('sync:saveSettings'),
    test: call('sync:test')
  },
  backups: {
    list: call('backups:list'),
    settings: call('backups:settings'),
    runNow: call('backups:runNow'),
    chooseDir: call('backups:chooseDir'),
    resetDir: call('backups:resetDir'),
    restore: call('backups:restore'),
    chooseFileAndRestore: call('backups:chooseFileAndRestore')
  },
  exports: { start: call('exports:start') },
  events: {
    onExportProgress: (cb) => subscribe(EventChannel.EXPORT_PROGRESS, cb),
    onSyncStatus: (cb) => subscribe(EventChannel.SYNC_STATUS, cb),
    onRateSuggestion: (cb) => subscribe(EventChannel.RATE_SUGGESTION, cb),
    onSessionEnded: (cb) => subscribe(EventChannel.SESSION_ENDED, cb)
  }
}

contextBridge.exposeInMainWorld('api', api)
