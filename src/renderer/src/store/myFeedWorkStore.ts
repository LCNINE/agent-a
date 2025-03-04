import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type FeedWorkModeType = 'basic' | 'advanced'

type MyFeedWorkStore = {
  feedWorkModeType: FeedWorkModeType
  likeCommentsEnabled: boolean
  replyCommentsEnabled: boolean
  toggleLikeComments: (value?: boolean) => void
  toggleReplyComments: (value?: boolean) => void
  changeFeedWorkMode: (type: FeedWorkModeType) => void
}

const useMyFeedWorkStore = create<MyFeedWorkStore>()(
  persist(
    (set, get) => ({
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
      }
    }),

    {
      name: 'my-feed-work-storage'
    }
  )
)

export default useMyFeedWorkStore
