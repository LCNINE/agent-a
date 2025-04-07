import { LoginCredentials } from 'src'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  isDirty: boolean
}

export type ConfigState = {
  config: AgentConfig
  setConfig: (newConfig: Partial<AgentConfig>) => void
  resetConfig: () => void
  setIsDirty: (isDirty: boolean) => void
  excludeUsernames?: string[]
}

const defaultConfig: AgentConfig = {
  prompt: { preset: 'casual' },
  commentLength: { min: 20, max: 50 },
  postIntervalSeconds: 600,
  workIntervalSeconds: 600,
  loopIntervalSeconds: 6 * 60 * 60,
  excludeUsernames: [],
  credentials: {
    username: '',
    password: ''
  },
  isDirty: false
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      isDirty: false,
      excludeUsernames: undefined,
      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig }
        })),
      setIsDirty: (isDirty: boolean) =>
        set((state) => ({
          config: { ...state.config, isDirty }
        })),
      resetConfig: () => set({ config: defaultConfig })
    }),

    {
      name: 'config',
      partialize: (state) => ({
        config: state.config
      })
    }
  )
)
