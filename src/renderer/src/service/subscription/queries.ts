// src/renderer/src/service/subscription/queries.ts
import { useQuery } from "@tanstack/react-query";
import SubscriptionService from "./subscriptionService";
import { createClient } from "@/supabase/client";

export function useSubscriptionQuery(userId: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['subscription', userId],
    queryFn: async () => {
      if (!userId) return null;
      return new SubscriptionService(supabase).getActiveSubscription(userId);
    },
    enabled: !!userId,
  });
}
