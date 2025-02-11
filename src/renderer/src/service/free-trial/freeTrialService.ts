// src>renderer>src>service>free-trial>freeTrialService.ts
import Service from "../Service";

export interface FreeTrial {
  user_id: string;
  created_at: string;
}

class FreeTrialService extends Service {
  async checkFreeTrial(userId: string): Promise<boolean> {
    if (!userId) {
      throw new Error("No user ID");
    }

    const { data, error } = await this.supabase
      .from('free_trial_records')
      .select('user_id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      throw error;
    }

    return (data?.length ?? 0) === 0;
  }

  async createFreeTrial(userId: string): Promise<void> {
    if (!userId) {
      throw new Error("No user ID");
    }

    const { error } = await this.supabase
      .from('free_trial_records')
      .insert([{ user_id: userId }]);

    if (error) {
      throw error;
    }
  }
}

export default FreeTrialService;