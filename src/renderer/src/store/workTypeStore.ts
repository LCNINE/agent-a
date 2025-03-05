import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type WorkType = 'hashtag_and_feed' | 'my_feed' | undefined

interface IWorkTypeState {
  workType: WorkType
  changeWorkType: (workType: WorkType) => void
}

const useWorkTypeStore = create<IWorkTypeState>()(
  persist(
    (set, get) => ({
      workType: undefined,

      changeWorkType: (workType: WorkType) => {
        set({ workType })
      }
    }),

    {
      name: 'work-type' // localStorage 등에 저장될 key
    }
  )
)

export default useWorkTypeStore
