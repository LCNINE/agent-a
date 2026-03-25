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
    count: 1,
    enabled: false,
    hashtags: []
  },
  myFeedInteractionWork: {
    count: 1,
    enabled: false
  },
  hashtagInteractionWork: {
    count: 1,
    enabled: false,
    hashtags: []
  },
  targetUserWork: {
    count: 10,
    enabled: false,
    targetUsers: [],
    likeEnabled: true,
    commentEnabled: true,
    postsPerUser: 3
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
      version: 4,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as WorkState
        if (version < 4) {
          // targetUserWork가 없으면 기본값 추가
          if (!state.workList.targetUserWork) {
            state.workList.targetUserWork = defaultWorkList.targetUserWork
          }
        }
        return state
      }
    }
  )
)
