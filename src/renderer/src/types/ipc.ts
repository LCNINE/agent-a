import type { AgentConfig } from '@/store/configStore'
import type { Work } from '@/store/workStore'

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

export interface BotStatus {
  isRunning: boolean
  currentWork: Work | null
  waiting: {
    for: string
    until: string
  } | null
}
