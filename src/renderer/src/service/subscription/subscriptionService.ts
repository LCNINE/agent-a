// src/renderer/src/service/subscription/subscriptionService.ts
import Service from "../Service";

export interface Subscription {
  id: string;
  user_id: string;
  expires_at: string;
}

class SubscriptionService extends Service {
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    if (!userId) {
      throw new Error("No user ID");
    }

    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
}

export default SubscriptionService;