import { StateStorage } from 'zustand/middleware'

/**
 * zustand persist용 electron-store 어댑터
 * localStorage 대신 electron-store를 사용하여 데이터를 영구 저장
 */
export const electronStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await window.electronStore.get(name)
      if (value) {
        return JSON.stringify(value)
      }

      const localValue = localStorage.getItem(name)
      if (localValue) {
        await window.electronStore.set(name, JSON.parse(localValue))
      }

      return localValue
    } catch (error) {
      console.error('electronStorage getItem error:', error)
      return null
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value)
      await window.electronStore.set(name, parsed)
    } catch (error) {
      console.error('electronStorage setItem error:', error)
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await window.electronStore.delete(name)
    } catch (error) {
      console.error('electronStorage removeItem error:', error)
    }
  }
}
