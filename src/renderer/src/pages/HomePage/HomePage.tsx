// src/renderer/src/pages/HomePage/HomePage.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import Footer from "@/components/template/Footer";
import { AgentController } from "./AgentController";
import { useAuthContext } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useFreeTrialQuery } from "@/service/free-trial/queries";
import { createClient } from "@/supabase/client";
import FreeTrialService from "@/service/free-trial/freeTrialService";
// import { useSubscriptionQuery } from "@/service/subscription/queries";

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { data: hasUsedFreeTrial, refetch } = useFreeTrialQuery(user?.id);
  // const { data: subscription } = useSubscriptionQuery(user?.id);
  const [isStarting, setIsStarting] = React.useState(false);

  // const isSubscriptionActive = React.useMemo(() => {
  //   if (!subscription) return false;
  //   return new Date(subscription.expires_at) > new Date();
  // }, [subscription]);

  const handleStartFreeTrial = async () => {
    if (!user?.id) return;
    setIsStarting(true);
    try {
      const supabase = createClient();
      await new FreeTrialService(supabase).startFreeTrial(user.id);
      await refetch();
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <h1 className="text-4xl font-bold">{t("appName")}</h1>
        {!hasUsedFreeTrial && (
          <Button 
            onClick={handleStartFreeTrial}
            className="mb-4"
            disabled={isStarting}
          >
            {isStarting ? '처리중...' : '3일 무료체험 시작하기'}
          </Button>
        )}
        <AgentController />
        {/* {isSubscriptionActive ? (
          <AgentController />
        ) : (
          <div className="text-center text-gray-500">
            구독이 만료되었습니다. 서비스를 이용하시려면 구독을 갱신해주세요.
          </div>
        )} */}
      </div>
      <Footer />
    </div>
  );
}
