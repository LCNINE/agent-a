import Service from '../Service'
import { differenceInDays, differenceInHours, format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Subscription {
  subscription_id: number
  end_date: Date
  is_active: boolean
  start_date: Date
  plan_id: number | null
  plan_name: string
  plan_display_name: string
  max_instances: number
}

export interface SubscriptionResponse {
  subscriptionId: number
  endDate: Date
  isActive: boolean
  remainingDays: number
  remainingHours: number
  formattedEndDate: string
  planId: number | null
  planName: string
  planDisplayName: string
  maxInstances: number
}

class SubscriptionService extends Service {
  async getCurrentSubscription(userId: string): Promise<SubscriptionResponse | null> {
    const { data, error } = (await this.supabase.rpc('get_current_subscription', {
      p_user_id: userId
    })) as { data: Subscription | null; error: any }

    if (error) {
      throw new Error(`Failed to get subscription: ${error.message}`)
    }

    if (!data) {
      return null
    }

    const now = new Date()
    const endDate = new Date(data.end_date)

    const remainingDays = differenceInDays(endDate, now)
    const remainingHours = differenceInHours(endDate, now) % 24
    const formattedEndDate = format(endDate, 'PPP', { locale: ko })

    return {
      subscriptionId: data.subscription_id,
      endDate: new Date(data.end_date),
      isActive: data.is_active,
      remainingDays,
      remainingHours,
      formattedEndDate,
      planId: data.plan_id,
      planName: data.plan_name ?? 'basic',
      planDisplayName: data.plan_display_name ?? '베이직',
      maxInstances: data.max_instances ?? 1
    }
  }
}

export default SubscriptionService
