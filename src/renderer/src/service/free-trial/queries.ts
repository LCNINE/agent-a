// src/renderer/src/service/free-trial/queries.ts
import { useQuery } from "@tanstack/react-query";
import FreeTrialService from "./freeTrialService";
import { createClient } from "@/supabase/client";

export function useFreeTrialQuery(userId: string | undefined) {
  const supabase = createClient()
  console.log('[useFreeTrialQuery] 초기화됨, userId:', userId);
  console.log('[useFreeTrialQuery] enabled 상태:', !!userId);
  
  return useQuery({
    queryKey: ['freeTrial', userId],
    queryFn:  () => {
      console.log('[useFreeTrialQuery] queryFn 실행, userId:', userId);
      if (!userId) {
        console.log('[useFreeTrialQuery] userId가 없음, false 반환');
        return false;
      }
      const result =  new FreeTrialService(supabase).hasUsedFreeTrial(userId);
      console.log('[useFreeTrialQuery] 결과:', result);
      return result;
    },
    enabled: !!userId,
    
  });
}
