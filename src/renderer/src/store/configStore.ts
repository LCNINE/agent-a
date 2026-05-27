import { LoginCredentials } from 'src'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { electronStorage } from '@/lib/electronStorage'

export type AgentPrompt =
  | { preset: 'formal' | 'casual' | 'hyper' }
  | { preset: 'custom'; custom: string }

export type AgentConfig = {
  prompt: AgentPrompt
  commentLength: {
    min: number
    max: number
  }
  commentLengthPreset: 'short' | 'normal' | 'long'
  postIntervalSeconds: number
  workIntervalSeconds: number
  loopIntervalSeconds: number
  credentials: LoginCredentials
  excludeUsernames?: string[]
  isDirty: boolean
}

export type ConfigState = {
  config: AgentConfig
  promptByAccount: Record<string, AgentPrompt>
  setConfig: (newConfig: Partial<AgentConfig>) => void
  resetConfig: () => void
  setIsDirty: (isDirty: boolean) => void
  setPromptForAccount: (username: string, prompt: AgentPrompt) => void
  getPromptForAccount: (username: string) => AgentPrompt
  deleteAccountPrompt: (username: string) => void
  excludeUsernames?: string[]
}

const defaultConfig: AgentConfig = {
  prompt: { preset: 'casual' },
  commentLength: { min: 30, max: 50 },
  commentLengthPreset: 'normal',
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
    (set, get) => ({
      config: defaultConfig,
      promptByAccount: {},
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
      resetConfig: () => set({ config: defaultConfig }),
      setPromptForAccount: (username, prompt) =>
        set((state) => ({
          promptByAccount: { ...state.promptByAccount, [username]: prompt }
        })),
      getPromptForAccount: (username) => {
        const { promptByAccount, config } = get()
        return promptByAccount[username] ?? config.prompt
      },
      deleteAccountPrompt: (username) =>
        set((state) => {
          const next = { ...state.promptByAccount }
          delete next[username]
          return { promptByAccount: next }
        })
    }),

    {
      name: 'config',
      storage: createJSONStorage(() => electronStorage),
      partialize: (state) => ({
        config: state.config,
        promptByAccount: state.promptByAccount
      })
    }
  )
)
