// src>service>account>accountService.ts
import Service from "../Service";

export interface InstagramAccount {
  id: string;
  instagram_username: string;
  // created_at: string;
}

class AccountService extends Service {

  async fetchAccounts(userId: string): Promise<InstagramAccount[]> {
    if (!userId) {
      throw new Error("No user ID");
    }

    const { data, error } = await this.supabase
      .from('subscription_accounts')
      .select('instagram_username, id')
      .eq('user_id', userId)
      .order('created_at');

    if (error) {
      throw error;
    }

    return data || [];
  }
}

export default AccountService;
