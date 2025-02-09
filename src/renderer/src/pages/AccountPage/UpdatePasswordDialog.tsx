import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"
import { useAccountStore } from "@/store/accountStore"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

interface UpdatePasswordForm {
  password: string;
}

export function UpdatePasswordDialog({ 
  username, 
  trigger 
}: { 
  username: string;
  trigger: React.ReactNode;
}) {
  const { t } = useTranslation();
  const updatePassword = useAccountStore(state => state.updatePassword);
  const form = useForm<UpdatePasswordForm>();
  const [open, setOpen] = React.useState(false);

  async function onSubmit(values: UpdatePasswordForm) {
    updatePassword({ username, password: values.password });
    toast.success(t("accountTable.passwordUpdated"));
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("accountTable.changePassword")}</DialogTitle>
          <DialogDescription>
            {username}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit">{t("accountTable.passwordSave")}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}