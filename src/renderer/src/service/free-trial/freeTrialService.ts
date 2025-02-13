// src/renderer/src/service/free-trial/freeTrialService.ts
import Service from "../Service";

class FreeTrialService extends Service {
  async hasUsedFreeTrial(userId: string): Promise<boolean> {
    console.log('[hasUsedFreeTrial] 시작, userId:', userId);
    
    if (!userId) {
      console.log('[hasUsedFreeTrial] userId가 없음, 에러 발생');
      throw new Error("No user ID");
    }

    console.log('[hasUsedFreeTrial] Supabase 쿼리 실행 전');
    const { data, error } = await this.supabase
      .from('free_trial_records')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('[hasUsedFreeTrial] Supabase 응답:', { data, error });

    if (error) {
      console.log('[hasUsedFreeTrial] 에러 발생:', error);
      return false;
    }

    const result = !!data;
    console.log('[hasUsedFreeTrial] 최종 결과:', result);
    return result;
  }

  async createFreeTrialRecord(userId: string) {
    console.log('[createFreeTrialRecord] 시작, userId:', userId);
    
    if (!userId) {
      console.log('[createFreeTrialRecord] userId가 없음, 에러 발생');
      throw new Error("No user ID");
    }

    console.log('[createFreeTrialRecord] Supabase 쿼리 실행 전');
    const { data, error } = await this.supabase
      .from('free_trial_records')
      .insert([
        { user_id: userId }
      ])
      .select()
      .single();

    console.log('[createFreeTrialRecord] Supabase 응답:', { data, error });

    if (error) {
      console.log('[createFreeTrialRecord] 에러 발생:', error);
      throw error;
    }

    console.log('[createFreeTrialRecord] 성공:', data);
    return data;
  }
}

export default FreeTrialService;
