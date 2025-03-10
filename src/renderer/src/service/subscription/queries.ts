import { useQuery } from '@tanstack/react-query'
import SubscriptionService from './subscriptionService'
import useCreateClient from '@/supabase/client'

interface SubscriptionResponse {
  subscriptionId: number
  endDate: Date
  isActive: boolean
  remainingDays: number
  remainingHours: number
  formattedEndDate: string
}

export function useCurrentSubscriptionQuery(userId: string) {
  const supabase = useCreateClient()
  const { data, isLoading, error } = useQuery<SubscriptionResponse | null>({
    queryKey: ['currentSubscription', userId],
    queryFn: () => new SubscriptionService(supabase).getCurrentSubscription(userId)
  })

  return {
    data,
    isLoading,
    error,
    remainingDays: data?.remainingDays,
    remainingHours: data?.remainingHours,
    formattedEndDate: data?.formattedEndDate
  }
}
