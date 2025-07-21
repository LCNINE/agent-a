import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'
import { useAccountStore } from '@/store/accountStore'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface AddAccountForm {
  username: string
  password: string
}

export function AddAccountDialog({ trigger }: { trigger: React.ReactNode }) {
  const { t } = useTranslation()
  const { addAccount, selectAccount, accountList } = useAccountStore()
  const form = useForm<AddAccountForm>()
  const [open, setOpen] = React.useState(false)

  async function onSubmit(values: AddAccountForm) {
    if (!values.username || !values.password) {
      toast.error(t('accountTable.requiredFields'))
      return
    }
    try {
      addAccount(values)

      // 계정리스트가 0개면 하나 선택
      if (accountList.length === 0) {
        selectAccount(values)
      }

      toast.success(t('accountTable.accountAdded'))
      form.reset()
      setOpen(false)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Account with this username already exists') {
          toast.error(t('accountTable.usernameExists'))
        } else {
          toast.error(error.message)
        }
      } else {
        toast.error(t('accountTable.addError'))
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('accountTable.addAccount')}</DialogTitle>
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
            <Button type="submit">{t('accountTable.add')}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
