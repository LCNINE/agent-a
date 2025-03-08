//src\renderer\src\store\accountStore.ts

import { LoginCredentials } from 'src'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AccountState {
  accountList: LoginCredentials[]
  selectedAccount: LoginCredentials | null
  syncAccounts(accounts: LoginCredentials[]): void
  addAccount(account: LoginCredentials): void
  deleteAccount(username: string): void
  updateAccount(params: { oldUsername: string; newUsername: string; password: string }): void
  selectAccount(credentials: LoginCredentials): void
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      accountList: [],
      selectedAccount: null,

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
            selectedAccount: newSelectedAccount
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
            selectedAccount: newSelectedAccount
          }
        })
      },
      selectAccount(credentials) {
        set({ selectedAccount: credentials })
      }
    }),
    {
      name: 'account' // localStorage 등에 저장될 key
    }
  )
)
