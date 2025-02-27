import React, { ReactNode, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { useForm, useWatch } from 'react-hook-form'
import { workSchema, WorkSchema } from './schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useWorkStore, Work } from '@/store/workStore'
import { useTranslation } from 'react-i18next'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { generateUUID } from '@/utils/uuid'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { HashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type WorkFormDialogProps = {
  work: Work | null
  trigger?: ReactNode
}
export function WorkFormDialog({ work, trigger }: WorkFormDialogProps) {
  const [open, setOpen] = useState(false)

  const { t } = useTranslation()

  const form = useForm<WorkSchema>({
    mode: 'onChange',
    resolver: zodResolver(workSchema),
    defaultValues: work ?? {
      type: 'feed'
    }
  })
  const watchedType = useWatch({
    control: form.control,
    name: 'type'
  })

  const { add, update } = useWorkStore()

  function onSubmit(values: WorkSchema) {
    if (work == null) {
      // create
      add({
        id: generateUUID(),
        ...values
      })
      values.type === 'hashtag' && form.reset({ type: 'hashtag' }) // 사용자 친화적인것을 위해..
    } else {
      // update
      update({
        id: work.id,
        ...values
      })
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm">
            {work == null ? t('workForm.trigger.create') : t('workForm.trigger.update')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {work == null ? t('workForm.title.create') : t('workForm.title.update')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('workForm.type.label')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="feed">{t('workForm.type.select.feed')}</SelectItem>
                      <SelectItem value="hashtag">{t('workForm.type.select.hashtag')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedType === 'hashtag' && (
              <FormField
                control={form.control}
                name="tag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('workForm.tag.label')}</FormLabel>
                    <FormControl>
                      <div className="flex flex-row items-center gap-2">
                        <HashIcon />
                        <Input {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit">
              {work == null ? t('workForm.submit.create') : t('workForm.submit.update')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
