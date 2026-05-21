//src\renderer\src\store\accountStore.ts

import { LoginCredentials } from 'src'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { electronStorage } from '@/lib/electronStorage'

interface AccountState {
  accountList: LoginCredentials[]
  activeAccounts: string[] // 활성화된 계정 username 목록
  selectedAccount: LoginCredentials | null
  isAuthenticated: boolean
  lastLoginTime: number | null
  sessionTimeout: number
  syncAccounts(accounts: LoginCredentials[]): void
  addAccount(account: LoginCredentials): void
  deleteAccount(username: string): void
  updateAccount(params: { oldUsername: string; newUsername: string; password: string }): void
  selectAccount(credentials: LoginCredentials): void
  toggleAccountActive(username: string, maxInstances: number): boolean
  login(credentials: LoginCredentials): void
  logout(): void
  checkSession(): boolean
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accountList: [],
      activeAccounts: [],
      selectedAccount: null,
      isAuthenticated: false,
      lastLoginTime: null,
      sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7일

      syncAccounts(accounts) {
        set((state) => ({
          accountList: accounts.map((account) => ({
            username: account.username,
            password: state.accountList.find((a) => a.username === account.username)?.password || ''
          }))
        }))
      },

      addAccount(account) {
        set((state) => {
          // Check if account with same username already exists
          if (state.accountList.some((a) => a.username === account.username)) {
            throw new Error('Account with this username already exists')
          }
          return {
            accountList: [...state.accountList, account]
          }
        })
      },

      deleteAccount(username) {
        set((state) => {
          const newList = state.accountList.filter((a) => a.username !== username)
          const newSelectedAccount =
            state.selectedAccount?.username === username ? null : state.selectedAccount

          return {
            accountList: newList,
            selectedAccount: newSelectedAccount,
            activeAccounts: state.activeAccounts.filter((u) => u !== username)
          }
        })
      },

      updateAccount({ oldUsername, newUsername, password }) {
        set((state) => {
          // Check if new username already exists (except for the account being updated)
          if (
            oldUsername !== newUsername &&
            state.accountList.some((a) => a.username === newUsername)
          ) {
            throw new Error('Account with this username already exists')
          }

          const newList = state.accountList.map((a) =>
            a.username === oldUsername ? { username: newUsername, password } : a
          )

          const newSelectedAccount =
            state.selectedAccount?.username === oldUsername
              ? { username: newUsername, password }
              : state.selectedAccount

          return {
            accountList: newList,
            selectedAccount: newSelectedAccount,
            activeAccounts: state.activeAccounts.map((u) => (u === oldUsername ? newUsername : u))
          }
        })
      },
      selectAccount(credentials) {
        set({ selectedAccount: credentials })
      },

      toggleAccountActive(username, maxInstances) {
        const state = get()
        const isActive = state.activeAccounts.includes(username)
        if (isActive) {
          // 비활성화
          set({ activeAccounts: state.activeAccounts.filter((u) => u !== username) })
          return true
        } else {
          // 활성화 - 플랜 제한 확인
          if (state.activeAccounts.length >= maxInstances) {
            return false
          }
          set({ activeAccounts: [...state.activeAccounts, username] })
          return true
        }
      },

      login(credentials) {
        set({
          selectedAccount: credentials,
          isAuthenticated: true,
          lastLoginTime: Date.now()
        })
      },

      logout() {
        set({
          selectedAccount: null,
          isAuthenticated: false,
          lastLoginTime: null
        })
      },

      checkSession() {
        const { lastLoginTime, sessionTimeout, isAuthenticated } = get()

        if (!isAuthenticated || !lastLoginTime) return false

        const now = Date.now()
        const sessionValid = now - lastLoginTime < sessionTimeout

        if (!sessionValid) {
          // 세션이 만료되었으면 자동 로그아웃
          get().logout()
          return false
        }

        // 세션이 유효하면 마지막 로그인 시간 갱신
        set({ lastLoginTime: now })
        return true
      }
    }),
    {
      name: 'account',
      storage: createJSONStorage(() => electronStorage)
    }
  )
)
