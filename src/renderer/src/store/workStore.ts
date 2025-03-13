import { Work } from 'src'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkState {
  workList: Work
  upsert(work: Partial<Work>): void
}

export const useWorkStore = create<WorkState>()(
  persist(
    (set) => ({
      workList: {
        feedWork: true,
        hashtagWork: true,
        myFeedInteraction: true,
        myFeedCommentorInteraction: true,
        hashtags: []
      },

      upsert(work: Partial<Work>) {
        set((state) => ({
          workList: { ...state.workList, ...work }
        }))
      }
    }),

    {
      name: 'work' // localStorage 등에 저장될 key
    }
  )
)
