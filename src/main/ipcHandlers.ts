import { BrowserWindow, ipcMain, nativeTheme } from 'electron'
import log from 'electron-log'
import { StartAgentParams } from '..'
import { AgentManager } from './agent/managers/AgentManager'
import { startPowerSaveBlocker, stopPowerSaveBlocker } from './index'

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
const AGENT_STOP_ALL_CHANNEL = 'agent:stop-all'
const AGENT_STATUS_CHANNEL = 'agent:status'
const AGENT_ALL_STATUSES_CHANNEL = 'agent:all-statuses'

const managers = new Map<string, AgentManager>()
const lastLogsMap = new Map<string, any[]>()

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

let mainWindowRef: BrowserWindow | null = null

function addAgentEventListeners(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow

  ipcMain.handle(AGENT_START_CHANNEL, async (_, params: StartAgentParams) => {
    const agentId = params.config.credentials.username
    log.info(`Start agent for ${agentId}`)

    if (managers.has(agentId)) {
      const existing = managers.get(agentId)!
      if (existing.getStatus().isRunning) {
        log.info(`Agent ${agentId} is already running`)
        return
      }
    }

    try {
      if (managers.size === 0) {
        startPowerSaveBlocker()
      }

      const manager = new AgentManager(params.workList, params.config, mainWindow, agentId, params.userId)
      managers.set(agentId, manager)
      await manager.start(params.config, params.workList)

      log.info(`Agent ${agentId} started successfully`)
    } catch (error) {
      log.error(`Failed to start agent ${agentId}:`, error)
      managers.delete(agentId)
      if (managers.size === 0) {
        stopPowerSaveBlocker()
      }
      throw error
    }
  })

  ipcMain.handle(AGENT_STOP_CHANNEL, async (_, agentId: string) => {
    const manager = managers.get(agentId)
    if (manager) {
      lastLogsMap.set(agentId, manager.getStatus().logs || [])
      await manager.stop()
      managers.delete(agentId)

      if (managers.size === 0) {
        stopPowerSaveBlocker()
      }
    }
  })

  ipcMain.handle(AGENT_STOP_ALL_CHANNEL, async () => {
    for (const [agentId, manager] of managers) {
      lastLogsMap.set(agentId, manager.getStatus().logs || [])
      await manager.stop()
    }
    managers.clear()
    stopPowerSaveBlocker()
  })

  ipcMain.handle(AGENT_STATUS_CHANNEL, (_, agentId: string) => {
    const manager = managers.get(agentId)
    if (!manager) {
      return {
        isRunning: false,
        currentWork: null,
        waiting: null,
        logs: lastLogsMap.get(agentId) || [],
        currentAction: '중지됨'
      }
    }
    const status = manager.getStatus()
    if (status.logs && status.logs.length > 0) {
      lastLogsMap.set(agentId, status.logs)
    }
    return status
  })

  ipcMain.handle(AGENT_ALL_STATUSES_CHANNEL, () => {
    const result: Record<string, any> = {}

    // 실행 중인 에이전트
    for (const [agentId, manager] of managers) {
      const status = manager.getStatus()
      if (status.logs && status.logs.length > 0) {
        lastLogsMap.set(agentId, status.logs)
      }
      result[agentId] = status
    }

    // 마지막 로그가 있는 중지된 에이전트
    for (const [agentId, logs] of lastLogsMap) {
      if (!result[agentId]) {
        result[agentId] = {
          isRunning: false,
          currentWork: null,
          waiting: null,
          logs,
          currentAction: '중지됨'
        }
      }
    }

    return result
  })
}

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow)
  addThemeEventListeners()
  addAgentEventListeners(mainWindow)
}
