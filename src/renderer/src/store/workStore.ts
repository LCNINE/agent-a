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
    enabled: true,
    suggestedFollowEnabled: false,
    suggestedFollowCount: 5
  },
  hashtagWork: {
    count: 1,
    enabled: false,
    hashtags: [],
    followEnabled: false
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
      version: 6,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as WorkState
        if (version < 4) {
          // targetUserWork가 없으면 기본값 추가
          if (!state.workList.targetUserWork) {
            state.workList.targetUserWork = defaultWorkList.targetUserWork
          }
        }
        if (version < 5) {
          // hashtagWork에 followEnabled 추가
          if (state.workList.hashtagWork) {
            if (state.workList.hashtagWork.followEnabled === undefined) {
              state.workList.hashtagWork.followEnabled = false
            }
          }
        }
        if (version < 6) {
          // feedWork에 suggestedFollowEnabled, suggestedFollowCount 추가
          if (state.workList.feedWork) {
            if (state.workList.feedWork.suggestedFollowEnabled === undefined) {
              state.workList.feedWork.suggestedFollowEnabled = false
            }
            if (state.workList.feedWork.suggestedFollowCount === undefined) {
              state.workList.feedWork.suggestedFollowCount = 5
            }
          }
        }
        return state
      }
    }
  )
)
