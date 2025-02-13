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

  async createFreeTrialRecord(userId: string) {
    
    if (!userId) {
      throw new Error("No user ID");
    }

    const { data, error } = await this.supabase
      .from('free_trial_records')
      .insert([
        { user_id: userId }
      ])
      .select()
      .maybeSingle();


    if (error) {
      throw error;
    }

    return data;
  }
}

export default FreeTrialService;
