// src>renderer>src>service>free-trial>queries.ts
import { useQuery } from "@tanstack/react-query";
import FreeTrialService from "./freeTrialService";
import { createClient } from "@/supabase/client";

export function useFreeTrialQuery(userId: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['free-trial', userId],
    queryFn: async () => {
      if (!userId) return false;
      
      return new FreeTrialService(supabase).checkFreeTrial(userId);
    },
    enabled: !!userId,
  });
}