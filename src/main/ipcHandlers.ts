import { BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { InstagramService } from './agent/InstagramService'
import { StartAgentParams } from '..'
import { AgentManager } from './agent/AgentManager'
import log from 'electron-log'

const WIN_MINIMIZE_CHANNEL = 'window:minimize'
const WIN_MAXIMIZE_CHANNEL = 'window:maximize'
const WIN_CLOSE_CHANNEL = 'window:close'

const THEME_MODE_CURRENT_CHANNEL = 'theme-mode:current'
const THEME_MODE_TOGGLE_CHANNEL = 'theme-mode:toggle'
const THEME_MODE_DARK_CHANNEL = 'theme-mode:dark'
const THEME_MODE_LIGHT_CHANNEL = 'theme-mode:light'
const THEME_MODE_SYSTEM_CHANNEL = 'theme-mode:system'

const AGENT_START_CHANNEL = 'agent:start'
const AGENT_STOP_CHANNEL = 'agent:stop'
const AGENT_STATUS_CHANNEL = 'agent:status'

function addWindowEventListeners(mainWindow: BrowserWindow) {
  ipcMain.handle(WIN_MINIMIZE_CHANNEL, () => {
    mainWindow.minimize()
  })
  ipcMain.handle(WIN_MAXIMIZE_CHANNEL, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.handle(WIN_CLOSE_CHANNEL, () => {
    mainWindow.close()
  })
}

function addThemeEventListeners() {
  ipcMain.handle(THEME_MODE_CURRENT_CHANNEL, () => nativeTheme.themeSource)
  ipcMain.handle(THEME_MODE_TOGGLE_CHANNEL, () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light'
    } else {
      nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
  })
  ipcMain.handle(THEME_MODE_DARK_CHANNEL, () => (nativeTheme.themeSource = 'dark'))
  ipcMain.handle(THEME_MODE_LIGHT_CHANNEL, () => (nativeTheme.themeSource = 'light'))
  ipcMain.handle(THEME_MODE_SYSTEM_CHANNEL, () => {
    nativeTheme.themeSource = 'system'
    return nativeTheme.shouldUseDarkColors
  })
}

export function addAgentEventListeners() {
  const manager = new AgentManager()

  ipcMain.handle(AGENT_START_CHANNEL, async (_, params: StartAgentParams) => {
    log.info('Start agent button clicked with params:', params)
    try {
      await manager.start(params.config, params.workList)
      log.info('Agent started successfully')
    } catch (error) {
      log.error('Failed to start agent:', error)
      throw error
    }
  })

  ipcMain.handle(AGENT_STOP_CHANNEL, async () => {
    manager.stop()
  })

  ipcMain.handle(AGENT_STATUS_CHANNEL, () => {
    return manager.getStatus()
  })
}

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow)
  addThemeEventListeners()
  addAgentEventListeners()
}
