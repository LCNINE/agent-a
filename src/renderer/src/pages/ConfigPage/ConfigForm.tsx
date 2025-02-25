import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useConfigStore } from '@/store/configStore'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { configSchema, ConfigSchema } from './schema'

export function ConfigForm() {
  const { t } = useTranslation()
  const { config, setConfig, setIsDirty } = useConfigStore()
  const form = useForm<ConfigSchema>({
    resolver: zodResolver(configSchema),
    defaultValues: config
  })

  async function onSubmit(values: ConfigSchema) {
    setConfig(values)
    form.reset(values)
    toast.success(t('configForm.toast.submitSuccess'))
  }

  useEffect(() => {
    setIsDirty(form.formState.isDirty)
  }, [form.formState.isDirty])
  console.log('form.formState.errors.prompt?.preset:', form.formState.errors.prompt?.preset)
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="prompt.preset"
          render={({ field }) => (
            <FormItem>
              <ToggleGroup type="single" onValueChange={field.onChange} value={field.value}>
                <ToggleGroupItem
                  value="formal"
                  className={
                    form.formState.errors.prompt?.preset ? 'border-red-500 border text-red-500' : ''
                  }
                >
                  {t('configForm.field.prompt.formal')}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="casual"
                  className={
                    form.formState.errors.prompt?.preset ? 'border-red-500 border text-red-500' : ''
                  }
                >
                  {t('configForm.field.prompt.casual')}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="hyper"
                  className={
                    form.formState.errors.prompt?.preset ? 'border-red-500 border text-red-500' : ''
                  }
                >
                  {t('configForm.field.prompt.hyper')}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value=""
                  onClick={() => {
                    toast.info('개발중인 기능입니다.')
                  }}
                >
                  {t('configForm.field.prompt.custom')}
                </ToggleGroupItem>
              </ToggleGroup>
              {form.formState.errors.prompt?.preset && (
                <p className="text-[0.8rem] font-medium text-destructive text-center mt-1">
                  {t('configForm.validation.preset')}
                </p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="commentLength.min"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('configForm.label.commentLength.min')}</FormLabel>
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
              <FormLabel>{t('configForm.label.commentLength.max')}</FormLabel>
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
              <FormLabel>{t('configForm.label.postIntervalSeconds')}</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormDescription>{t('configForm.description.postIntervalSeconds')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workIntervalSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('configForm.label.workIntervalSeconds')}</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormDescription>{t('configForm.description.workIntervalSeconds')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="loopIntervalSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('configForm.label.loopIntervalSeconds')}</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormDescription>{t('configForm.description.loopIntervalSeconds')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">{t('configForm.submit')}</Button>
      </form>
    </Form>
  )
}
