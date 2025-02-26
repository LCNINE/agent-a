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
  workCount: number
  commentLength: {
    min: number
    max: number
  }
  postIntervalSeconds: number
  workIntervalSeconds: number
  loopIntervalSeconds: number
  credentials: LoginCredentials
  isDirty: boolean
}

export type ConfigState = {
  config: AgentConfig
  setConfig: (newConfig: Partial<AgentConfig>) => void
  resetConfig: () => void
  setIsDirty: (isDirty: boolean) => void
}

const defaultConfig: AgentConfig = {
  prompt: { preset: 'casual' },
  workCount: 10,
  commentLength: { min: 20, max: 40 },
  postIntervalSeconds: 600,
  workIntervalSeconds: 600,
  loopIntervalSeconds: 6 * 60 * 60,
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
