import { create } from 'zustand'

type ErrorSectionType = 'all' | 'hashtag' | 'hashtagInteraction' | null

interface ErrorState {
  errorType: ErrorSectionType

  setError: (errorType: ErrorSectionType) => void
  clearError: () => void
}

export const useErrorStore = create<ErrorState>((set) => ({
  errorType: null,
  setError: (errorType) => set({ errorType }),
  clearError: () => set({ errorType: null })
}))
