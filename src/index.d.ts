interface ThemeModeContext {
  toggle: () => Promise<boolean>
  dark: () => Promise<void>
  light: () => Promise<void>
  system: () => Promise<boolean>
  current: () => Promise<'dark' | 'light' | 'system'>
}

interface ElectronWindow {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
}

export interface LoginCredentials {
  username: string
  password: string
}

export type WorkerStatus =
  | {
      state: 'running'
      currentWork: Work
      running: {
        for: string
        until: string | null
      }
    }
  | {
      state: 'done'
      currentWork: Work
    }
  | {
      state: 'error'
      error: string
    }
  | {
      state: 'idle'
    }

export type WorkType = 'hashtag_and_feed' | 'my_feed'

export type Work = (
  | {
      type: 'feed'
    }
  | {
      type: 'hashtag'
      tag: string
    }
) & {
  id: string
}

export interface Feed {
  id: number
  url: string
  name: string | null
  active: boolean
}

export type FeedWork = {
  feedWorkModeType: 'basic' | 'advanced'
  likeCommentsEnabled: boolean
  replyCommentsEnabled: boolean
  feedList: Feed[]
}

export interface BotStatus {
  isRunning: boolean
  currentWork: Work | null
  waiting: {
    for: string
    until: string
  } | null
}

export type AgentConfig = {
  prompt:
    | {
        preset: 'formal' | 'casual' | 'hyper'
      }
    | {
        preset: 'custom'
        custom: string
      }
  workCount: number
  commentLength: {
    min: number
    max: number
  }
  postIntervalSeconds: number
  workIntervalSeconds: number
  loopIntervalSeconds: number
  credentials: LoginCredentials
  excludeUsernames?: string[]
}

export interface StartAgentParams {
  config: AgentConfig
  workType: WorkType
  workList: Work[] | FeedWork[]
}

interface AgentContext {
  start: (params: StartAgentParams) => Promise<void>
  stop: () => Promise<void>
  getStatus: () => Promise<BotStatus>
}

interface AgentContext {
  start: (params: StartAgentParams) => Promise<void>
  stop: () => Promise<void>
  getStatus: () => Promise<BotStatus>
}

interface UpdateContext {
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => void
  onUpdateDownloaded: (callback: () => void) => void
  onDownloadProgress: (callback: (progress: { percent: number }) => void) => void
  startDownload: () => void
  installUpdate: () => void
}

interface DialogContext {
  showConfirmation: () => Promise<boolean>
}

export {}
declare global {
  interface Window {
    themeMode: ThemeModeContext
    electronWindow: ElectronWindow
    agent: AgentContext
    update: UpdateContext
    dialog: DialogContext
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: any[]) => void) => void
        send: (channel: string, ...args: any[]) => void
      }
    }
  }
}
