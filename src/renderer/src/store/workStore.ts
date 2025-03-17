import { WorkType } from 'src'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkState {
  workList: WorkType
  upsert(work: Partial<WorkType>): void
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

      upsert(work: Partial<WorkType>) {
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
