// src/renderer/src/pages/HomePage/HomePage.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import Footer from "@/components/template/Footer";
import { AgentController } from "./AgentController";
import { useAuthContext } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useFreeTrialQuery, useStartFreeTrialMutation } from "@/service/free-trial/queries";

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { data: hasUsedFreeTrial, refetch } = useFreeTrialQuery(user?.id);
  const startFreeTrial = useStartFreeTrialMutation();

  const handleStartFreeTrial = () => {
    if (!user?.id) return;
    startFreeTrial.mutateAsync(user.id);
  };

  return (
    <div className="flex h-full flex-col">
      {!hasUsedFreeTrial && (
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
        <AgentController />
      </div>
      <Footer />
    </div>
  );
}