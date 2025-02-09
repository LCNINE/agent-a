import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

interface CounterState {
  count: number,
  increment: () => void,
}

export const useCounterStore = create<CounterState>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 }))
    }),
    {
      name: "counter"
    }
  )
)