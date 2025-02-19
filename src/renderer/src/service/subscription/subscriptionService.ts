import Service from "../Service";

interface Subscription {
    subscription_id: number;  
    end_date: Date;         
    is_active: boolean;
}
  
interface SubscriptionResponse {
    subscriptionId: number;
    endDate: Date;
    isActive: boolean;
}
  
class SubscriptionService extends Service {
    async getCurrentSubscription(userId: string): Promise<SubscriptionResponse | null> {
      const { data, error } = await this.supabase
        .rpc('get_current_subscription', {
          p_user_id: userId
        }) as { data: Subscription | null, error: any };
  
      if (error) {
        throw new Error(`Failed to get subscription: ${error.message}`);
      }
  
      if (!data) {
        return null;
      }
  
      return {
        subscriptionId: data.subscription_id,
        endDate: new Date(data.end_date),
        isActive: data.is_active
      };
    }
  }
  
export default SubscriptionService;
