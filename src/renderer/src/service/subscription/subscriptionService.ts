import Service from '../Service'
import { differenceInDays, differenceInHours, format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Subscription {
  subscription_id: number
  end_date: Date
  is_active: boolean
  start_date: Date
}

interface SubscriptionResponse {
  subscriptionId: number
  endDate: Date
  isActive: boolean
  remainingDays: number
  remainingHours: number
  formattedEndDate: string
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
      formattedEndDate
    }
  }
}

export default SubscriptionService
