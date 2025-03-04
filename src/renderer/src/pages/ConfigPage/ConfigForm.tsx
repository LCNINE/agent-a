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
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent
} from '@renderer/components/ui/select'

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
      <div className="container mx-auto max-w-3xl p-4">
        <Card className="flex h-[calc(100vh-150px)] flex-col shadow-lg">
          <CardHeader className="flex-shrink-0 bg-muted/50 p-2">
            <div className="flex items-center justify-between px-5">
              <CardTitle className="text-xl font-bold">{t('configPage.title')}</CardTitle>

              {/* 저장 버튼 */}
              <Button
                type="submit"
                form="config-form"
                className="flex transform items-center justify-center gap-1 bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:bg-green-500"
              >
                <Save className="h-4 w-4" />
                {t('configForm.submit')}
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
                      <FormItem className="rounded-lg border bg-card p-4">
                        <div className="mb-4 flex items-center">
                          <FormLabel className="m-0 text-base font-medium">
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
                                    ? 'border border-red-500 text-red-500'
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
                                    ? 'border border-red-500 text-red-500'
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
                                className={`flex-1 py-3 ${field.value === 'hyper' ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''} ${
                                  form.formState.errors.prompt?.preset
                                    ? 'border border-red-500 text-red-500'
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
                          <p className="mt-1 text-center text-[0.8rem] font-medium text-destructive">
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
                      <FormItem className="rounded-lg border bg-card p-4">
                        <div className="mb-2 flex items-center">
                          <FormLabel className="m-0 text-base">
                            {t('configForm.label.workCount')}
                          </FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="ml-2 h-4 w-4 cursor-help text-muted-foreground" />
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
                          <p className="mt-1 text-[0.8rem] font-medium text-destructive">
                            {t('configForm.validation.workCount')}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* 댓글 길이 설정 */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* 댓글 최소 길이 */}
                    <FormField
                      control={form.control}
                      name="commentLength.min"
                      render={({ field }) => (
                        <FormItem className="rounded-lg border bg-card p-4">
                          <div className="mb-2 flex items-center">
                            <FormLabel className="m-0 text-base">
                              {t('configForm.label.commentLength.min')}
                            </FormLabel>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="ml-2 h-4 w-4 cursor-help text-muted-foreground" />
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
                            <p className="mt-1 text-[0.8rem] font-medium text-destructive">
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
                        <FormItem className="rounded-lg border bg-card p-4">
                          <div className="mb-2 flex items-center">
                            <FormLabel className="m-0 text-base">
                              {t('configForm.label.commentLength.max')}
                            </FormLabel>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="ml-2 h-4 w-4 cursor-help text-muted-foreground" />
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
                            <p className="mt-1 text-[0.8rem] font-medium text-destructive">
                              {t('configForm.validation.commentLength.max')}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 시간 간격 설정 */}
                  <div className="rounded-lg border bg-card p-4">
                    <div className="space-y-4">
                      {/* 댓글 시간 간격 */}
                      <FormField
                        control={form.control}
                        name="postIntervalSeconds"
                        render={({ field }) => (
                          <FormItem>
                            <div className="mb-2 flex items-center">
                              <FormLabel className="m-0 text-sm">
                                {t('configForm.label.postIntervalSeconds')}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="ml-2 h-4 w-4 cursor-help text-muted-foreground" />
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
                            <div className="mb-2 flex items-center">
                              <FormLabel className="m-0 text-sm">
                                {t('configForm.label.workIntervalSeconds')}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="ml-2 h-4 w-4 cursor-help text-muted-foreground" />
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
                            <div className="mb-2 flex items-center">
                              <FormLabel className="m-0 text-sm">
                                {t('configForm.label.loopIntervalSeconds')}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="ml-2 h-4 w-4 cursor-help text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('configForm.description.loopIntervalSeconds')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <FormControl>
                              <Select
                                value={field.value.toString()}
                                onValueChange={(value) => field.onChange(Number(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t('configForm.select.intervalPlaceholder')}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="30">
                                    30 {t('configForm.select.minute')}
                                  </SelectItem>
                                  <SelectItem value="60">
                                    1 {t('configForm.select.hour')}
                                  </SelectItem>
                                  <SelectItem value="300">
                                    3 {t('configForm.select.hour')}
                                  </SelectItem>
                                  <SelectItem value="600">
                                    6 {t('configForm.select.hour')}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
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
