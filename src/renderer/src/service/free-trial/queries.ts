// src/renderer/src/service/free-trial/queries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FreeTrialService from "./freeTrialService";
import { createClient } from "@/supabase/client";

export function useFreeTrialQuery(userId: string | undefined) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['freeTrial', userId],
    queryFn: async () => {
      if (!userId) {
        return false;
      }
      const result = await new FreeTrialService(supabase).hasUsedFreeTrial(userId);
      return result;
    },
    enabled: !!userId,
  });
}

export function useStartFreeTrialMutation() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      await new FreeTrialService(supabase).startFreeTrial(userId);
    },
    onMutate: async (userId) => {
      const previousData = queryClient.getQueryData(['freeTrial', userId]);
      
      queryClient.setQueryData(['freeTrial', userId], true);
      
      return { previousData };
    },
    onError: (err, userId, context) => {
      queryClient.setQueryData(
        ['freeTrial', userId],
        context?.previousData
      );
    },
    onSettled: (_, __, userId) => {
      queryClient.invalidateQueries({
        queryKey: ['freeTrial', userId]
      });
    }
  });
}