import React from "react"
import {
  Dialog,
  DialogContent,
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
import { Edit2 } from "lucide-react"

interface EditAccountForm {
  username: string;
  password: string;
}

export function EditAccountDialog({ 
  account,
  trigger 
}: { 
  account: { username: string; password: string };
  trigger: React.ReactNode;
}) {
  const { t } = useTranslation();
  const updateAccount = useAccountStore(state => state.updateAccount);
  const form = useForm<EditAccountForm>({
    defaultValues: {
      username: account.username,
      password: account.password
    }
  });
  const [open, setOpen] = React.useState(false);

  async function onSubmit(values: EditAccountForm) {
    updateAccount({ 
      oldUsername: account.username,
      newUsername: values.username, 
      password: values.password 
    });
    toast.success(t("accountTable.accountUpdated"));
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("accountTable.edit")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
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
            <Button type="submit">{t("accountTable.save")}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}