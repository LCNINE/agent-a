declare module 'electron-progressbar' {
  import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'

  interface ProgressBarOptions {
    indeterminate?: boolean
    initialValue?: number
    maxValue?: number
    closeOnComplete?: boolean
    title?: string
    text?: string
    detail?: string
    style?: {
      text?: object
      detail?: object
      bar?: object
      value?: object
    }
    browserWindow?: BrowserWindowConstructorOptions
  }

  class ProgressBar {
    constructor(options?: ProgressBarOptions)
    value: number
    text: string
    detail: string
    on(event: 'completed' | 'aborted' | 'progress', listener: () => void): this
    setCompleted(): void
    close(): void
    isCompleted(): boolean
    isInProgress(): boolean
    getOptions(): ProgressBarOptions
  }

  export = ProgressBar
}

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
      currentWork: WorkType
      running: {
        for: string
        until: string | null
      }
    }
  | {
      state: 'done'
      currentWork: WorkType
    }
  | {
      state: 'error'
      error: string
    }
  | {
      state: 'idle'
    }

type WorkItem = {
  count: number
  enabled: boolean
}

export interface TargetUser {
  username: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  processedAt?: number
  error?: string
}

export interface UserCollectionSettings {
  enabled: boolean                    // 유저 수집 활성화
  usersPerHashtag: number             // 해시태그당 수집 유저 수
  autoProcessEnabled: boolean         // 수집 후 자동 활동 실행
  autoProcessLikeEnabled: boolean     // 자동 활동: 좋아요
  autoProcessCommentEnabled: boolean  // 자동 활동: 댓글
  postsPerCollectedUser: number       // 유저당 처리할 게시물 수
}

export interface CollectedUser {
  id?: number
  instagram_username: string         // 수집 실행 계정
  collected_username: string         // 수집된 유저
  collected_from_hashtag?: string    // 출처 해시태그
  collected_from_post_id?: string    // 출처 게시물 ID
  like_count: number                 // 댓글 좋아요 수
  status: 'pending' | 'processing' | 'completed' | 'failed'
  session_id: string                 // 세션 ID
  processed_at?: string
  created_at?: string
}

export type WorkType = {
  feedWork: WorkItem & {
    suggestedFollowEnabled: boolean
    suggestedFollowCount: number
  }
  hashtagWork: WorkItem & {
    hashtags: string[]
    followEnabled: boolean
    userCollection: UserCollectionSettings  // 유저 수집 설정 추가
  }
  myFeedInteractionWork: WorkItem
  hashtagInteractionWork: WorkItem & { hashtags: string[] }
  targetUserWork: WorkItem & {
    targetUsers: TargetUser[]
    likeEnabled: boolean
    commentEnabled: boolean
    postsPerUser: number
  }
}

export interface WorkLog {
  timestamp: number
  action: string
  details?: string
  success?: boolean
}

export interface BotStatus {
  isRunning: boolean
  currentWork: WorkType | null
  waiting: {
    for: string
    until: string
  } | null
  logs?: WorkLog[]
  currentAction?: string
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
  workList: WorkType
  userId: string
}

interface AgentContext {
  start: (params: StartAgentParams) => Promise<void>
  stop: (agentId: string) => Promise<void>
  stopAll: () => Promise<void>
  getStatus: (agentId: string) => Promise<BotStatus>
  getAllStatuses: () => Promise<Record<string, BotStatus>>
  onStatusUpdate: (callback: (agentId: string, status: BotStatus) => void) => () => void
}

interface UpdateContext {
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => void
  onUpdateNotAvailable: (callback: () => void) => void
  onUpdateDownloaded: (callback: () => void) => void
  onDownloadProgress: (callback: (progress: { percent: number }) => void) => void
  onUpdateError: (callback: (error: string) => void) => void
  startDownload: () => Promise<void>
  installUpdate: () => Promise<void>
}

interface DialogContext {
  showConfirmation: () => Promise<boolean>
}

interface ElectronStoreContext {
  get: (key: string) => Promise<any>
  set: (key: string, value: any) => Promise<boolean>
  delete: (key: string) => Promise<boolean>
}

export {}
declare global {
  interface Window {
    themeMode: ThemeModeContext
    electronWindow: ElectronWindow
    agent: AgentContext
    update: UpdateContext
    dialog: DialogContext
    electronStore: ElectronStoreContext
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: any[]) => void) => void
        send: (channel: string, ...args: any[]) => void
      }
    }
  }
}
