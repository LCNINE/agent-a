import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
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
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function ConfigForm() {
  const { t } = useTranslation()
  const { config, setConfig, setIsDirty } = useConfigStore()
  const form = useForm<ConfigSchema>({
    resolver: zodResolver(configSchema),
    defaultValues: config
  })

  console.log(config)

  async function onSubmit(values: ConfigSchema) {
    setConfig(values)
    form.reset(values)
    toast.success(t('configForm.toast.submitSuccess'))
  }

  useEffect(() => {
    setIsDirty(form.formState.isDirty)
  }, [form.formState.isDirty])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="prompt.preset"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center mb-2">
                <FormLabel className="text-base font-medium">
                  {t('configForm.label.prompt')}
                </FormLabel>
              </div>

              <ToggleGroup
                type="single"
                onValueChange={field.onChange}
                value={field.value}
                className="justify-start "
              >
                <TooltipProvider>
                  {/* 격식체 */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value="formal"
                        className={`${field.value === 'formal' ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''} ${
                          form.formState.errors.prompt?.preset
                            ? 'border-red-500 border text-red-500'
                            : 'border shadow-sm'
                        }`}
                      >
                        {t('configForm.field.prompt.formal')}
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('configForm.tooltip.prompt.formalDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  {/* 대화체 */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value="casual"
                        className={`${field.value === 'casual' ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''} ${
                          form.formState.errors.prompt?.preset
                            ? 'border-red-500 border text-red-500'
                            : 'border shadow-sm'
                        }`}
                      >
                        {t('configForm.field.prompt.casual')}
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('configForm.tooltip.prompt.casualDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  {/* 과장형 */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value="hyper"
                        className={`${field.value === 'hyper' ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground ' : ''} ${
                          form.formState.errors.prompt?.preset
                            ? 'border-red-500 border text-red-500'
                            : 'border shadow-sm'
                        }`}
                      >
                        {t('configForm.field.prompt.hyper')}
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('configForm.tooltip.prompt.hyperDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  {/* 사용자 지정 */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value="custom"
                        className={`${field.value === 'custom' ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''}`}
                        onClick={() => {
                          toast.info('개발중인 기능입니다.')
                        }}
                      >
                        {t('configForm.field.prompt.custom')}
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('configForm.tooltip.prompt.customDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </ToggleGroup>
              {form.formState.errors.prompt?.preset && (
                <p className="text-[0.8rem] font-medium text-destructive text-center mt-1">
                  {t('configForm.validation.preset')}
                </p>
              )}
            </FormItem>
          )}
        />

        {/* 작업 개수 */}
        <FormField
          control={form.control}
          name="workCount"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <FormLabel>{t('configForm.label.workCount')}</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('configForm.tooltip.commentCount')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              {form.formState.errors.workCount && (
                <p className="text-[0.8rem] font-medium text-destructive mt-1">
                  {t('configForm.validation.workCount')}
                </p>
              )}
            </FormItem>
          )}
        />

        {/* 댓글 최소 길이 */}
        <FormField
          control={form.control}
          name="commentLength.min"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <FormLabel>{t('configForm.label.commentLength.min')}</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('configForm.tooltip.commentLength.min')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              {form.formState.errors.commentLength?.min && (
                <p className="text-[0.8rem] font-medium text-destructive mt-1">
                  {t('configForm.validation.commentLength.min')}
                </p>
              )}
            </FormItem>
          )}
        />

        {/* 댓글 최대 길이 */}
        <FormField
          control={form.control}
          name="commentLength.max"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <FormLabel>{t('configForm.label.commentLength.max')}</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('configForm.tooltip.commentLength.max')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>

              {form.formState.errors.commentLength?.max && (
                <p className="text-[0.8rem] font-medium text-destructive mt-1">
                  {t('configForm.validation.commentLength.max')}
                </p>
              )}
            </FormItem>
          )}
        />

        {/* 댓글 시간 간격 */}
        <FormField
          control={form.control}
          name="postIntervalSeconds"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <FormLabel>{t('configForm.label.postIntervalSeconds')}</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('configForm.description.postIntervalSeconds')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 작업 간 간격 */}
        <FormField
          control={form.control}
          name="workIntervalSeconds"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <FormLabel>{t('configForm.label.workIntervalSeconds')}</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('configForm.description.workIntervalSeconds')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 전체 작업 간간 간격 */}
        <FormField
          control={form.control}
          name="loopIntervalSeconds"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <FormLabel>{t('configForm.label.loopIntervalSeconds')}</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('configForm.description.loopIntervalSeconds')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 저장 */}
        <Button type="submit" className="w-full">
          {t('configForm.submit')}
        </Button>
      </form>
    </Form>
  )
}
