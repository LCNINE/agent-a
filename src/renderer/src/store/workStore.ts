import { WorkType } from 'src'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { electronStorage } from '@/lib/electronStorage'

interface WorkState {
  // 계정별 work 설정 (username -> WorkType)
  workByAccount: Record<string, WorkType>
  // 현재 선택된 계정 (WorkPage에서 편집 중인 계정)
  selectedAccountForWork: string | null
  // 기본값 (신규 계정용)
  defaultWork: WorkType

  // 특정 계정의 work 가져오기
  getWorkForAccount(username: string): WorkType
  // 특정 계정의 work 업데이트
  upsertForAccount(username: string, work: Partial<WorkType>): void
  // 현재 선택된 계정의 work 업데이트 (편의용)
  upsert(work: Partial<WorkType>): void
  // 선택된 계정 설정
  setSelectedAccount(username: string | null): void
  // 계정 삭제 시 work도 삭제
  deleteAccountWork(username: string): void
  // 전체 리셋
  reset(): void

  // 하위 호환: workList getter (선택된 계정의 work 반환)
  workList: WorkType
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
    followEnabled: false,
    userCollection: {
      enabled: false,
      usersPerHashtag: 5,
      autoProcessEnabled: true,  // 더 이상 사용되지 않음 (실시간 처리로 전환), 호환성을 위해 유지
      autoProcessLikeEnabled: true,
      autoProcessCommentEnabled: true,
      postsPerCollectedUser: 3
    }
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
    postsPerUser: 3,
    skipOldPostsMonths: 0
  }
}

// workList computed selector (하위 호환용)
const selectWorkList = (state: WorkState): WorkType => {
  const { selectedAccountForWork, workByAccount, defaultWork } = state
  if (selectedAccountForWork && workByAccount[selectedAccountForWork]) {
    return workByAccount[selectedAccountForWork]
  }
  return defaultWork
}

export const useWorkStore = create<WorkState>()(
  persist(
    (set, get) => ({
      workByAccount: {},
      selectedAccountForWork: null,
      defaultWork: defaultWorkList,

      // 하위 호환: workList는 선택된 계정의 work 반환
      get workList() {
        return selectWorkList(get())
      },

      getWorkForAccount(username: string): WorkType {
        const { workByAccount, defaultWork } = get()
        if (workByAccount[username]) {
          return workByAccount[username]
        }
        // 계정에 설정이 없으면 기본값 복사해서 반환
        return JSON.parse(JSON.stringify(defaultWork))
      },

      upsertForAccount(username: string, work: Partial<WorkType>) {
        set((state) => {
          const currentWork = state.workByAccount[username] || JSON.parse(JSON.stringify(state.defaultWork))
          return {
            workByAccount: {
              ...state.workByAccount,
              [username]: { ...currentWork, ...work }
            }
          }
        })
      },

      upsert(work: Partial<WorkType>) {
        const { selectedAccountForWork } = get()
        if (selectedAccountForWork) {
          get().upsertForAccount(selectedAccountForWork, work)
        }
      },

      setSelectedAccount(username: string | null) {
        // 한 번의 set으로 selectedAccount와 workByAccount 모두 업데이트
        set((state) => {
          const newState: Partial<WorkState> = { selectedAccountForWork: username }

          // 선택된 계정에 work가 없으면 기본값으로 초기화
          if (username && !state.workByAccount[username]) {
            newState.workByAccount = {
              ...state.workByAccount,
              [username]: JSON.parse(JSON.stringify(state.defaultWork))
            }
          }

          return newState as WorkState
        })
      },

      deleteAccountWork(username: string) {
        set((state) => {
          const newWorkByAccount = { ...state.workByAccount }
          delete newWorkByAccount[username]
          return {
            workByAccount: newWorkByAccount,
            selectedAccountForWork: state.selectedAccountForWork === username ? null : state.selectedAccountForWork
          }
        })
      },

      reset() {
        set({
          workByAccount: {},
          selectedAccountForWork: null,
          defaultWork: defaultWorkList
        })
      }
    }),

    {
      name: 'work',
      version: 8,
      storage: createJSONStorage(() => electronStorage),
      partialize: (state) => ({
        workByAccount: state.workByAccount,
        selectedAccountForWork: state.selectedAccountForWork,
        defaultWork: state.defaultWork
      }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as any

        // userCollection 기본값 추가 헬퍼
        const ensureUserCollection = (workList: any) => {
          if (workList?.hashtagWork && !workList.hashtagWork.userCollection) {
            workList.hashtagWork.userCollection = {
              enabled: false,
              usersPerHashtag: 5,
              autoProcessEnabled: false,
              autoProcessLikeEnabled: true,
              autoProcessCommentEnabled: true,
              postsPerCollectedUser: 3
            }
          }
          return workList
        }

        // v6 이하에서 v7로 마이그레이션: workList -> workByAccount
        if (version < 7) {
          // 기존 workList가 있으면 기본값으로 사용
          let migratedDefaultWork = defaultWorkList

          if (state.workList) {
            // 기존 workList에 누락된 필드 채우기
            if (!state.workList.targetUserWork) {
              state.workList.targetUserWork = defaultWorkList.targetUserWork
            }
            if (state.workList.hashtagWork && state.workList.hashtagWork.followEnabled === undefined) {
              state.workList.hashtagWork.followEnabled = false
            }
            if (state.workList.feedWork) {
              if (state.workList.feedWork.suggestedFollowEnabled === undefined) {
                state.workList.feedWork.suggestedFollowEnabled = false
              }
              if (state.workList.feedWork.suggestedFollowCount === undefined) {
                state.workList.feedWork.suggestedFollowCount = 5
              }
            }
            ensureUserCollection(state.workList)
            migratedDefaultWork = state.workList
          }

          return {
            workByAccount: {},
            selectedAccountForWork: null,
            defaultWork: migratedDefaultWork
          }
        }

        // v7에서도 userCollection 필드 보장
        if (state.defaultWork) {
          ensureUserCollection(state.defaultWork)
        }
        if (state.workByAccount) {
          for (const key of Object.keys(state.workByAccount)) {
            ensureUserCollection(state.workByAccount[key])
          }
        }

        return state
      }
    }
  )
)
