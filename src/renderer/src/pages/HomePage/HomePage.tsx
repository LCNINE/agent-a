// src>renderer>src>pages>HomePage>HomePage.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import Footer from "@/components/template/Footer";
import { AgentController } from "./AgentController";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/hooks/useAuth";
import { useFreeTrialQuery } from "@/service/free-trial/queries";
import FreeTrialService from "@/service/free-trial/freeTrialService";
import { createClient } from "@/supabase/client";

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { data: showFreeTrial, refetch } = useFreeTrialQuery(user?.id);
  console.log("홈에서user", user)
  console.log("홈에서 소프리트라이얼버튼", showFreeTrial)


  const handleStartFreeTrial = async () => {
    if (user?.id) {
      const supabase = createClient();
      await new FreeTrialService(supabase).createFreeTrial(user.id);
      refetch();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <h1 className="text-4xl font-bold">{t("appName")}</h1>
        <AgentController />
        {showFreeTrial && (
          <Button onClick={handleStartFreeTrial}>
            3일 무료체험하기
          </Button>
        )}
      </div>
      <Footer />
    </div>
  );
}