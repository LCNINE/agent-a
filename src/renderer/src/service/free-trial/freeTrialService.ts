// src/renderer/src/service/free-trial/freeTrialService.ts
import Service from "../Service";

class FreeTrialService extends Service {
  async hasUsedFreeTrial(userId: string): Promise<boolean> {
    
    if (!userId) {
      throw new Error("No user ID");
    }

    const { data, error } = await this.supabase
      .from('free_trial_records')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()


    if (error) {
      return false;
    }

    const result = !!data;
    return result;
  }

  async startFreeTrial(userId: string) {
    console.log('startFreeTrial', userId);
    const { data, error } = await this.supabase
    .rpc('start_free_trial', {
      user_id_param: userId
    });

    if (error) {
        throw new Error(`Failed to start free trial: ${error.message}`);
    }

    return data;
  }
}

export default FreeTrialService;