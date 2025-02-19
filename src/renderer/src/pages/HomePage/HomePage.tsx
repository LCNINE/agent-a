// src/renderer/src/pages/HomePage/HomePage.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import Footer from "@/components/template/Footer";
import { AgentController } from "./AgentController";
import { useAuthContext } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useFreeTrialQuery, useStartFreeTrialMutation } from "@/service/free-trial/queries";
import { useCurrentSubscriptionQuery } from "@/service/subscription/queries";

export default function HomePage() {
  const { t } = useTranslation();
  // const { user } = useAuthContext();
  const user ={
    id:'0a1f7515-1f9b-4205-94f4-103ec162f9d3'
  }
  const { data: hasUsedFreeTrial, refetch } = useFreeTrialQuery(user?.id);
  const { data: subscription } = useCurrentSubscriptionQuery(user?.id ?? '');
  const startFreeTrial = useStartFreeTrialMutation();
  console.log("subscription", subscription);

  const isSubscriptionActive = subscription?.isActive ?? false;

  const handleStartFreeTrial = () => {
    if (!user?.id) return;
    startFreeTrial.mutateAsync(user.id);
  };

  return (
    <div className="flex h-full flex-col">
      {!hasUsedFreeTrial && !isSubscriptionActive && (
        <div className="absolute top-20 right-6">
          <Button 
            onClick={handleStartFreeTrial}
            disabled={startFreeTrial.isPending}
            variant="outline"
            size="sm"
          >
            {startFreeTrial.isPending ? '처리중...' : '3일 무료체험 시작하기'}
          </Button>
        </div>
      )}
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">{t("appName")}</h1>
        {!isSubscriptionActive && (
          <p className="text-red-500 mb-2">
            {t("subscription.inactive")}
          </p>
        )}
        <AgentController isSubscriptionActive={isSubscriptionActive} />
      </div>
      <Footer />
    </div>
  );
}