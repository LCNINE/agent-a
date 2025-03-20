import { WorkType } from 'src'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkState {
  workList: WorkType
  upsert(work: Partial<WorkType>): void
  reset(): void
}

const defaultWorkList: WorkType = {
  feedWork: {
    count: 3,
    enabled: true
  },
  hashtagWork: {
    count: 0,
    enabled: false,
    hashtags: []
  },
  myFeedInteraction: {
    count: 3,
    enabled: true
  },
  hashtagInteractionWork: {
    count: 0,
    enabled: false,
    hashtags: []
  }
}
export const useWorkStore = create<WorkState>()(
  persist(
    (set) => ({
      workList: defaultWorkList,

      upsert(work: WorkType) {
        set((state) => ({
          workList: { ...state.workList, ...work }
        }))
      },

      reset() {
        set({
          workList: defaultWorkList
        })
      }
    }),

    {
      name: 'work',
      version: 1
    }
  )
)
