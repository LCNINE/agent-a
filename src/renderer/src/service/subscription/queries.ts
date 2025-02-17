import { useQuery } from "@tanstack/react-query";
import SubscriptionService from "./subscriptionService";
import { createClient } from "@/supabase/client";

interface SubscriptionResponse {
    subscriptionId: number;
    endDate: Date;
    isActive: boolean;
}

export function useCurrentSubscriptionQuery(userId: string) {
  const supabase = createClient();
  const { data, isLoading, error } = useQuery<SubscriptionResponse | null>({
    queryKey: ['currentSubscription', userId],
    queryFn: () => new SubscriptionService(supabase).getCurrentSubscription(userId),
  });

  return {
    data,
    isLoading,
    error
  };
}