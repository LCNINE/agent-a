import { BrowserWindow, ipcMain, nativeTheme } from 'electron'
import log from 'electron-log'
import { StartAgentParams } from '..'
import { AgentManager } from './agent/managers/AgentManager'

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


let lastLogs: any[] = [];

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

let currentManager: AgentManager | null = null
let mainWindowRef: BrowserWindow | null = null

function addAgentEventListeners(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow;
  
  ipcMain.handle(AGENT_START_CHANNEL, async (_, params: StartAgentParams) => {
    log.info('Start agent button clicked with params:', params)
    try {
      currentManager = new AgentManager(params.workList, params.config, mainWindow)
      await currentManager.start(params.config, params.workList)

      log.info('Agent started successfully')
    } catch (error) {
      log.error('Failed to start agent:', error)
      throw error
    }
  })

  ipcMain.handle(AGENT_STOP_CHANNEL, async () => {
    if (currentManager) {
      // 중지하기 전에 마지막 로그 상태 저장
      lastLogs = currentManager.getStatus().logs || [];
      await currentManager.stop()
      currentManager = null
    }
  })

  ipcMain.handle(AGENT_STATUS_CHANNEL, () => {
    if (!currentManager) {
      return { 
        isRunning: false,
        currentWork: null,
        waiting: null,
        logs: lastLogs, 
        currentAction: '중지됨'
      }
    }
    // 로그를 계속 최신 상태로 유지
    const status = currentManager.getStatus();
    if (status.logs && status.logs.length > 0) {
      lastLogs = status.logs;
    }
    return status;
  })
}

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow)
  addThemeEventListeners()
  addAgentEventListeners(mainWindow)
}
