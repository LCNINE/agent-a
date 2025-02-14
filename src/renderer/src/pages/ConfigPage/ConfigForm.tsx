import React from "react"
import { useConfigStore } from "@/store/configStore";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgentConfig } from "@/store/configStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl, FormDescription } from "@/components/ui/form";
import { configSchema, ConfigSchema } from "./schema";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";



export function ConfigForm() {
  const { t } = useTranslation()
  const { config, setConfig } = useConfigStore();
  const form = useForm<ConfigSchema>({
    resolver: zodResolver(configSchema),
    defaultValues: config,
  });

  function onSubmit(values: ConfigSchema) {
    setConfig(values);
    toast.success(t("configForm.toast.submitSuccess"))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="prompt.preset"
          render={({ field }) => (
            <FormItem>
              <ToggleGroup type="single" onValueChange={field.onChange} value={field.value}>
                <ToggleGroupItem value="formal">{t("configForm.field.prompt.formal")}</ToggleGroupItem>
                <ToggleGroupItem value="casual">{t("configForm.field.prompt.casual")}</ToggleGroupItem>
                <ToggleGroupItem value="hyper">{t("configForm.field.prompt.hyper")}</ToggleGroupItem>
                <ToggleGroupItem value="custom">{t("configForm.field.prompt.custom")}</ToggleGroupItem>
              </ToggleGroup>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="commentLength.min"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("configForm.label.commentLength.min")}</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="commentLength.max"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("configForm.label.commentLength.max")}</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="postIntervalSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("configForm.label.postIntervalSeconds")}</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormDescription>
                {t("configForm.description.postIntervalSeconds")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workIntervalSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("configForm.label.workIntervalSeconds")}</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormDescription>
                {t("configForm.description.workIntervalSeconds")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="loopIntervalSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("configForm.label.loopIntervalSeconds")}</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormDescription>
                {t("configForm.description.loopIntervalSeconds")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">{t("configForm.submit")}</Button>
      </form>
    </Form>
  );
}
