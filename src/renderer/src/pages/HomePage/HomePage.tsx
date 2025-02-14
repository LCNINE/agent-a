import React from "react";
import { useTranslation } from "react-i18next";
import Footer from "@/components/template/Footer";
import { AgentController } from "./AgentController";
import { useAuthContext } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useFreeTrialQuery } from "@/service/free-trial/queries";
import { createClient } from "@/supabase/client";
import FreeTrialService from "@/service/free-trial/freeTrialService";

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { data: hasUsedFreeTrial, refetch } = useFreeTrialQuery(user?.id);
  const [isStarting, setIsStarting] = React.useState(false);

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
      {!hasUsedFreeTrial && (
        <div className="absolute top-20 right-6">
          <Button 
            onClick={handleStartFreeTrial}
            disabled={isStarting}
            variant="outline"
            size="sm"
          >
            {isStarting ? '처리중...' : '3일 무료체험 시작하기'}
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