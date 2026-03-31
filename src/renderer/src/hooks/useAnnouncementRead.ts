import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'lastReadAnnouncementId'

function getSnapshot(): number {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? parseInt(stored, 10) : 0
}

function subscribe(callback: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback()
    }
  }
  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}

export function useAnnouncementRead() {
  const lastReadId = useSyncExternalStore(subscribe, getSnapshot, () => 0)

  const markAsRead = useCallback((id: number) => {
    localStorage.setItem(STORAGE_KEY, id.toString())
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
  }, [])

  const hasUnread = useCallback(
    (latestId: number | null | undefined): boolean => {
      if (latestId == null) return false
      return latestId > lastReadId
    },
    [lastReadId]
  )

  return {
    lastReadId,
    markAsRead,
    hasUnread
  }
}
