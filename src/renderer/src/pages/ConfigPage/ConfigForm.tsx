'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useConfigStore } from '@/store/configStore'
import { zodResolver } from '@hookform/resolvers/zod'
import { HelpCircle, Save } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { configSchema, type ConfigSchema } from './schema'

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
  }, [form.formState.isDirty, setIsDirty])

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 max-w-3xl">
        <Card className="shadow-lg flex flex-col h-[calc(100vh-150px)]">
          <CardHeader className="bg-muted/50 p-2 flex-shrink-0 ">
            <div className="flex justify-between items-center px-5">
              <CardTitle className="text-xl font-bold">{t('configPage.title')}</CardTitle>

              <Button
                type="submit"
                form="config-form"
                className="py-2 px-4 flex items-center justify-center gap-1 text-sm"
              >
                <Save className="h-4 w-4" />
                {t('configForm.submit') || '저장'}
              </Button>
            </div>
          </CardHeader>

          <ScrollArea className="flex-grow">
            <CardContent className="p-6">
              <Form {...form}>
                <form id="config-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* 대화 스타일 설정 */}
                  <FormField
                    control={form.control}
                    name="prompt.preset"
                    render={({ field }) => (
                      <FormItem className="bg-card p-4 rounded-lg border">
                        <div className="flex items-center mb-4">
                          <FormLabel className="text-base font-medium m-0">
                            {t('configForm.label.prompt')}
                          </FormLabel>
                        </div>

                        <ToggleGroup
                          type="single"
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-wrap gap-2"
                        >
                          {/* 격식체 */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ToggleGroupItem
                                value="formal"
                                className={`flex-1 py-3 ${field.value === 'formal' ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''} ${
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

                          {/* 대화체 */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ToggleGroupItem
                                value="casual"
                                className={`flex-1 py-3 ${field.value === 'casual' ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''} ${
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

                          {/* 과장형 */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ToggleGroupItem
                                value="hyper"
                                className={`flex-1 py-3 ${field.value === 'hyper' ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground ' : ''} ${
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

                          {/* 사용자 지정 */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ToggleGroupItem
                                value="custom"
                                className={`flex-1 py-3 ${field.value === 'custom' ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''}`}
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
                      <FormItem className="bg-card p-4 rounded-lg border">
                        <div className="flex items-center mb-2">
                          <FormLabel className="text-base m-0">
                            {t('configForm.label.workCount')}
                          </FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('configForm.tooltip.commentCount')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <FormControl>
                          <Input type="number" {...field} className="mt-2" />
                        </FormControl>
                        {form.formState.errors.workCount && (
                          <p className="text-[0.8rem] font-medium text-destructive mt-1">
                            {t('configForm.validation.workCount')}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* 댓글 길이 설정 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 댓글 최소 길이 */}
                    <FormField
                      control={form.control}
                      name="commentLength.min"
                      render={({ field }) => (
                        <FormItem className="bg-card p-4 rounded-lg border">
                          <div className="flex items-center mb-2">
                            <FormLabel className="text-base m-0">
                              {t('configForm.label.commentLength.min')}
                            </FormLabel>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('configForm.tooltip.commentLength.min')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <FormControl>
                            <Input type="number" {...field} className="mt-2" />
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
                        <FormItem className="bg-card p-4 rounded-lg border">
                          <div className="flex items-center mb-2">
                            <FormLabel className="text-base m-0">
                              {t('configForm.label.commentLength.max')}
                            </FormLabel>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('configForm.tooltip.commentLength.max')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <FormControl>
                            <Input type="number" {...field} className="mt-2" />
                          </FormControl>
                          {form.formState.errors.commentLength?.max && (
                            <p className="text-[0.8rem] font-medium text-destructive mt-1">
                              {t('configForm.validation.commentLength.max')}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 시간 간격 설정 */}
                  <div className="bg-card p-4 rounded-lg border">
                    <div className="space-y-4">
                      {/* 댓글 시간 간격 */}
                      <FormField
                        control={form.control}
                        name="postIntervalSeconds"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center mb-2">
                              <FormLabel className="text-sm m-0">
                                {t('configForm.label.postIntervalSeconds')}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('configForm.description.postIntervalSeconds')}</p>
                                </TooltipContent>
                              </Tooltip>
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
                            <div className="flex items-center mb-2">
                              <FormLabel className="text-sm m-0">
                                {t('configForm.label.workIntervalSeconds')}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('configForm.description.workIntervalSeconds')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 전체 작업 간 간격 */}
                      <FormField
                        control={form.control}
                        name="loopIntervalSeconds"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center mb-2">
                              <FormLabel className="text-sm m-0">
                                {t('configForm.label.loopIntervalSeconds')}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('configForm.description.loopIntervalSeconds')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    </TooltipProvider>
  )
}
