import { create } from 'zustand'

export type ErrorSectionType =
  | 'all'
  | 'feedWork'
  | 'hashtagWork'
  | 'myFeedInteractionWork'
  | 'hashtagInteractionWork'
  | 'feedWorkCount'
  | 'hashtagWorkCount'
  | 'myFeedInteractionWorkCount'
  | 'hashtagInteractionWorkCount'
  | 'noHashtags'
  | 'noHashtagInteractions'

interface ErrorState {
  errorTypes: ErrorSectionType[]
  addError: (errorType: ErrorSectionType) => void
  removeError: (errorType: ErrorSectionType) => void
  clearAllErrors: () => void
  hasError: (errorType: ErrorSectionType) => boolean
}

export const useErrorStore = create<ErrorState>((set, get) => ({
  errorTypes: [],
  addError: (errorType) =>
    set((state) => ({
      errorTypes: state.errorTypes.includes(errorType)
        ? state.errorTypes
        : [...state.errorTypes, errorType]
    })),
  removeError: (errorType) =>
    set((state) => ({
      errorTypes: state.errorTypes.filter((type) => type !== errorType)
    })),
  clearAllErrors: () => set({ errorTypes: [] }),
  hasError: (errorType) => get().errorTypes.includes(errorType)
}))
