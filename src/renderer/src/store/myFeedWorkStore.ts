import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface FeedItem {
  id: string
  title: string
  content: string
  createdAt: number
  isRead?: boolean
}

interface MyFeedWorkState {
  feedItems: FeedItem[]
  loading: boolean
  error: string | null

  addFeedItem: (item: Omit<FeedItem, 'id' | 'createdAt'>) => void
  removeFeedItem: (id: string) => void
  updateFeedItem: (id: string, updates: Partial<FeedItem>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAllFeeds: () => void
}

const useMyFeedWorkStore = create<MyFeedWorkState>()(
  persist(
    (set, get) => ({
      feedItems: [],
      loading: false,
      error: null,

      addFeedItem: (item) => {
        const newItem: FeedItem = {
          ...item,
          id: Date.now().toString(),
          createdAt: Date.now(),
          isRead: false
        }

        set((state) => ({
          feedItems: [newItem, ...state.feedItems]
        }))
      },

      removeFeedItem: (id) => {
        set((state) => ({
          feedItems: state.feedItems.filter((item) => item.id !== id)
        }))
      },

      updateFeedItem: (id, updates) => {
        set((state) => ({
          feedItems: state.feedItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          )
        }))
      },

      markAsRead: (id) => {
        set((state) => ({
          feedItems: state.feedItems.map((item) =>
            item.id === id ? { ...item, isRead: true } : item
          )
        }))
      },

      markAllAsRead: () => {
        set((state) => ({
          feedItems: state.feedItems.map((item) => ({ ...item, isRead: true }))
        }))
      },

      clearAllFeeds: () => {
        set({ feedItems: [] })
      }
    }),
    {
      name: 'my-feed-work-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        feedItems: state.feedItems
      })
    }
  )
)

export default useMyFeedWorkStore
