// src>pages>AccountPage>AccountPage.tsx
import Footer from "@/components/template/Footer";
import React from "react";
import { useTranslation } from "react-i18next";
import { AccountTable } from "./AccountTable";
import { useAccount } from "@/hooks/use-account";
import { useAuthContext } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function AccountPage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { accountList, isLoading } = useAccount(user?.id);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold md:text-3xl">
            {t("accountTable.title")}
          </h1>
        </div>
        <div className="rounded-lg border bg-card">
          <AccountTable accounts={accountList || []} />
        </div>
      </div>
      <Footer />
    </div>
  );
}
