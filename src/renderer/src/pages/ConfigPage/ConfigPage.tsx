import React from "react";
import Footer from "@/components/template/Footer";
import { useTranslation } from "react-i18next";
import { ConfigForm } from "./ConfigForm";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ConfigPage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 min-h-0 flex-col justify-center gap-2">
        <h1 className="text-3xl font-bold">{t("configPage.title")}</h1>
        <ScrollArea>
          <div className="mb-20">
           <ConfigForm/>
          </div>
        </ScrollArea>
      </div>
      <Footer />
    </div>
  );
}
