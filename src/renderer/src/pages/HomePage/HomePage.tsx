// src/renderer/src/pages/HomePage/HomePage.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import Footer from "@/components/template/Footer";
import { AgentController } from "./AgentController";
import { useAuthContext } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useFreeTrialQuery, useStartFreeTrialMutation } from "@/service/free-trial/queries";
import { createClient } from "@/supabase/client";
import FreeTrialService from "@/service/free-trial/freeTrialService";

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { data: hasUsedFreeTrial } = useFreeTrialQuery(user?.id);
  const startFreeTrial = useStartFreeTrialMutation();

  const handleStartFreeTrial = async () => {
    if (!user?.id) return;
    await startFreeTrial.mutateAsync(user.id);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <h1 className="text-4xl font-bold">{t("appName")}</h1>
        {!hasUsedFreeTrial && (
          <Button 
            onClick={handleStartFreeTrial}
            className="mb-4"
            disabled={startFreeTrial.isPending}
          >
            {startFreeTrial.isPending ? '처리중...' : '3일 무료체험 시작하기'}
          </Button>
        )}
        <AgentController/>
      </div>
      <Footer />
    </div>
  );
}
