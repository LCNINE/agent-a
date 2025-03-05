import { Feed } from 'src'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type FeedWorkModeType = 'basic' | 'advanced'

type MyFeedWorkStore = {
  feeds: Feed[]
  feedWorkModeType: FeedWorkModeType
  likeCommentsEnabled: boolean
  replyCommentsEnabled: boolean
  toggleLikeComments: (value?: boolean) => void
  toggleReplyComments: (value?: boolean) => void
  changeFeedWorkMode: (type: FeedWorkModeType) => void
  addFeed: (feed: Feed) => void
  removeFeed: (id: number) => void
  toggleFeedActive: (id: number) => void
}

const useMyFeedWorkStore = create<MyFeedWorkStore>()(
  persist(
    (set, get) => ({
      feeds: [],
      feedWorkModeType: 'basic',
      likeCommentsEnabled: true,
      replyCommentsEnabled: true,

      toggleLikeComments: (value?: boolean) => {
        set((state) => ({
          ...state,
          likeCommentsEnabled: value !== undefined ? value : !state.likeCommentsEnabled
        }))
      },

      toggleReplyComments: (value?: boolean) => {
        set((state) => ({
          ...state,
          replyCommentsEnabled: value !== undefined ? value : !state.replyCommentsEnabled
        }))
      },

      changeFeedWorkMode: (type: FeedWorkModeType) => {
        set((state) => ({
          ...state,
          feedWorkModeType: type
        }))
      },

      addFeed: (feed: Feed) => {
        set((state) => ({
          ...state,
          feeds: [...state.feeds, feed]
        }))
      },

      removeFeed: (id: number) => {
        set((state) => ({
          ...state,
          feeds: state.feeds.filter((feed) => feed.id !== id)
        }))
      },
      toggleFeedActive: (id: number) => {
        set((state) => ({
          ...state,
          feeds: state.feeds.map((feed) =>
            feed.id === id ? { ...feed, active: !feed.active } : feed
          )
        }))
      }
    }),

    {
      name: 'my-feed-work-storage'
    }
  )
)

export default useMyFeedWorkStore
