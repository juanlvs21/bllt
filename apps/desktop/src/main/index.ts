import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { beforeQuit, bootstrap } from './core/bootstrap'
import { initUpdater } from './libs/updater'
import { registerReceiptScheme } from './modules/sales/receipt.service'

// Isolated data folder for tests and development.
if (process.env['BLLT_USER_DATA_DIR']) app.setPath('userData', process.env['BLLT_USER_DATA_DIR'])

registerReceiptScheme()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: 'Bllt',
    autoHideMenuBar: true,
    backgroundColor: '#eeeaea',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => (mainWindow = null))

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url.startsWith('https://')) shell.openExternal(details.url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('dev.juanl.bllt')
    app.setAboutPanelOptions({
      applicationName: 'Bllt',
      credits: 'Inventario en dólares y bolívares',
      copyright: 'Copyright © 2026 Juan Villarroel'
    })
    // Packaged builds get the icon from the bundle; in dev the Dock shows Electron's.
    if (is.dev) app.dock?.setIcon(icon)
    app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

    try {
      bootstrap()
    } catch (error) {
      // Most likely cause: better-sqlite3 not rebuilt for this Electron version.
      dialog.showErrorBox(
        'Bllt no pudo iniciar',
        `No se pudo abrir la base de datos.\n\n${error instanceof Error ? error.message : String(error)}`
      )
      app.exit(1)
      return
    }
    createWindow()
    initUpdater()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', beforeQuit)
}
