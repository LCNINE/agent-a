// src/renderer/src/service/free-trial/queries.ts
import { useQuery } from "@tanstack/react-query";
import FreeTrialService from "./freeTrialService";
import { createClient } from "@/supabase/client";

export function useFreeTrialQuery(userId: string | undefined) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['freeTrial', userId],
    queryFn:  () => {
      if (!userId) {
        return false;
      }
      const result =  new FreeTrialService(supabase).hasUsedFreeTrial(userId);
      return result;
    },
    enabled: !!userId,
    
  });
}
