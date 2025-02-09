// src>hooks>use-account.ts
import { useEffect } from "react";
import { useAccountQuery } from "@/service/account/queries";
import { useAccountStore } from "@/store/accountStore";

export function useAccount(userId: string | undefined) {
  const { data: accounts, isLoading } = useAccountQuery(userId);
  const accountStore = useAccountStore();
  const { accountList } = useAccountStore()
  console.log("sd;lfk'l;asdfwe", accountList)
  console.log("훅에서 어카운츠", accounts)
  console.log('userId:',userId)
  
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      const storeAccounts = accounts.map((account: { instagram_username: string }) => ({
        username: account.instagram_username,
        password: "",
      }));
      console.log("!!!!!!!!!!!!!!!!!!훅에서 유즈이펙트 안", storeAccounts)
      accountStore.syncAccounts(storeAccounts);
    }
  }, [accounts]);

  return {
    accountList,
    isLoading,
  };
}
