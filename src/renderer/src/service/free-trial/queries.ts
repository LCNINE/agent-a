// src/renderer/src/service/free-trial/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import FreeTrialService from './freeTrialService'
import { createClient } from '@/supabase/client'
import { toast } from 'sonner'

interface Subscription {
  subscription_id: number
  end_date: Date
  is_active: boolean
}

export function useFreeTrialQuery(userId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['freeTrial', userId],
    queryFn: () => {
      if (!userId) {
        return false
      }
      const result = new FreeTrialService(supabase).hasUsedFreeTrial(userId)
      return result
    },
    enabled: !!userId
  })
}

export function useStartFreeTrialMutation() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      return await new FreeTrialService(supabase).startFreeTrial(userId)
    },
    onSuccess: (_, userId) => {
      // 캐시 업데이트를 한번에 처리
      queryClient.setQueriesData({ queryKey: ['freeTrial', userId] }, true)

      queryClient.setQueriesData(
        { queryKey: ['currentSubscription', userId] },
        (old: Subscription | undefined) =>
          old
            ? {
                ...old,
                isActive: true
              }
            : undefined
      )

      toast.success('3일 무료체험이 시작되었습니다.')
    },
    onError: () => {
      toast.error('무료체험 시작에 실패했습니다. 다시 시도해주세요.')
    }
  })
}