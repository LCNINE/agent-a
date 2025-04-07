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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { HelpCircle, Save, BookOpen, Coffee, Sparkles, PencilLine } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import blockGuideImage from '../../images/guide_to_blocking_users.png'
import { configSchema, type ConfigSchema } from './schema'
import { useBlocker } from '@tanstack/react-router'
import { cn } from '@renderer/lib/utils'

export function ConfigForm() {
  const { t } = useTranslation()
  const { config, setConfig, setIsDirty } = useConfigStore()
  const form = useForm<ConfigSchema>({
    resolver: zodResolver(configSchema),
    defaultValues: { ...config, commentLengthPreset: 'normal' }
  })

  useEffect(() => {
    form.reset(config)
  }, [])

  function handleSubmit(values: Omit<ConfigSchema, 'commentLengthPreset'>) {
    setConfig({
      ...values,
      commentLength: {
        min:
          form.watch('commentLengthPreset') === 'short'
            ? 10
            : form.watch('commentLengthPreset') === 'normal'
              ? 20
              : 30,
        max:
          form.watch('commentLengthPreset') === 'short'
            ? 20
            : form.watch('commentLengthPreset') === 'normal'
              ? 50
              : 100
      }
    })

    form.reset(values)
  }

  useEffect(() => {
    setIsDirty(form.formState.isDirty)
  }, [form.formState.isDirty, setIsDirty])

  return (
    <TooltipProvider delayDuration={100}>
      <div className="container mx-auto max-w-3xl p-4">
        <Card className="flex h-[calc(100vh-150px)] flex-col shadow-lg">
          <CardHeader className="flex-shrink-0 bg-muted/50 p-2">
            <div className="flex items-center justify-between px-5">
              <CardTitle className="hidden text-xl font-bold">{t('configPage.title')}</CardTitle>
            </div>
          </CardHeader>

          <ScrollArea className="flex-grow">
            <CardContent className="p-6">
              <Form {...form}>
                <form id="config-form" onSubmit={(e) => e.preventDefault()} className="space-y-6">
                  {/* 대화 스타일 설정 */}
                  <div className="h-full rounded-lg border p-4">
                    <div className="mb-4 flex items-center">
                      <FormLabel className="m-0 text-base font-semibold">
                        {t('configForm.label.prompt')}
                      </FormLabel>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* 정중한 모드 */}
                      <FormField
                        control={form.control}
                        name="prompt.preset"
                        render={({ field }) => (
                          <FormItem className="m-0 p-0">
                            <FormControl>
                              <div
                                className={`flex min-h-28 cursor-pointer items-center rounded-lg border p-4 transition-all hover:bg-muted/50 ${
                                  field.value === 'formal' ? 'border-primary bg-muted/50' : ''
                                }`}
                                onClick={() => field.onChange('formal')}
                              >
                                <div className="mr-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                                  <BookOpen className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold">
                                    {t('configForm.field.prompt.formal')}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {t('configForm.prompt.formalDesc')}
                                  </p>
                                </div>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* 친근한 모드 */}
                      <FormField
                        control={form.control}
                        name="prompt.preset"
                        render={({ field }) => (
                          <FormItem className="m-0 p-0">
                            <FormControl>
                              <div
                                className={`flex min-h-28 cursor-pointer items-center rounded-lg border p-4 transition-all hover:bg-muted/50 ${
                                  field.value === 'casual' ? 'border-primary bg-muted/50' : ''
                                }`}
                                onClick={() => field.onChange('casual')}
                              >
                                <div className="mr-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                                  <Coffee className="h-6 w-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold">
                                    {t('configForm.field.prompt.casual')}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {t('configForm.prompt.casualDesc')}
                                  </p>
                                </div>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* 열정적인 모드 */}
                      <FormField
                        control={form.control}
                        name="prompt.preset"
                        render={({ field }) => (
                          <FormItem className="m-0 p-0">
                            <FormControl>
                              <div
                                className={`flex min-h-28 cursor-pointer items-center rounded-lg border p-4 transition-all hover:bg-muted/50 ${
                                  field.value === 'hyper' ? 'border-primary bg-muted/50' : ''
                                }`}
                                onClick={() => field.onChange('hyper')}
                              >
                                <div className="mr-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                                  <Sparkles className="h-6 w-6 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold">
                                    {t('configForm.field.prompt.hyper')}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {t('configForm.prompt.hyperDesc')}
                                  </p>
                                </div>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* 사용자 지정 */}
                      <FormField
                        control={form.control}
                        name="prompt.preset"
                        render={({ field }) => (
                          <FormItem className="m-0 p-0">
                            <FormControl>
                              <div
                                className={`flex min-h-28 cursor-pointer items-center rounded-lg border p-4 transition-all hover:bg-muted/50 ${
                                  field.value === 'custom' ? 'border-primary bg-muted/50' : ''
                                }`}
                                onClick={() => {
                                  field.onChange('custom')
                                  toast.info('개발중인 기능입니다.')
                                }}
                              >
                                <div className="mr-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                  <PencilLine className="h-6 w-6 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold">
                                    {t('configForm.field.prompt.custom')}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {t('configForm.prompt.customDesc')}
                                  </p>
                                </div>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    {form.formState.errors.prompt?.preset && (
                      <p className="mt-1 text-center text-[0.8rem] font-medium text-destructive">
                        {t('configForm.validation.preset')}
                      </p>
                    )}
                  </div>

                  {/* 댓글 길이 설정 */}
                  <div className="h-full rounded-lg border p-4">
                    <div className="mb-4 flex items-center font-semibold">
                      {t('configForm.label.commentLength')}
                    </div>
                    <div className="flex items-center justify-between">
                      {/* 댓글 길이 짧게 */}
                      <FormField
                        control={form.control}
                        name="commentLengthPreset"
                        render={({ field }) => (
                          <FormItem
                            className={cn(
                              'flex h-16 w-40 cursor-pointer items-center justify-center rounded-lg border p-4 transition-all hover:bg-muted/50',
                              field.value === 'short' ? 'border-primary bg-muted/50' : ''
                            )}
                            onClick={() => {
                              field.onChange('short')
                              handleSubmit(form.getValues())
                            }}
                          >
                            <FormControl>
                              <div
                                className={`flex w-full flex-col items-center justify-center ${field.value === 'short' ? 'font-medium text-primary' : ''}`}
                              >
                                <span className="font-semibold">
                                  {t('configForm.label.shortComment.label')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {t('configForm.label.shortComment.description')}
                                </span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* 댓글 길이 중간 */}
                      <FormField
                        control={form.control}
                        name="commentLengthPreset"
                        render={({ field }) => (
                          <FormItem
                            className={cn(
                              'flex h-16 w-40 cursor-pointer items-center justify-center rounded-lg border p-4 transition-all hover:bg-muted/50',
                              field.value === 'normal' ? 'border-primary bg-muted/50' : ''
                            )}
                            onClick={() => {
                              field.onChange('normal')
                              handleSubmit(form.getValues())
                            }}
                          >
                            <FormControl>
                              <div
                                className={`flex w-full flex-col items-center justify-center ${field.value === 'normal' ? 'font-medium text-primary' : ''}`}
                              >
                                <span className="font-semibold">
                                  {t('configForm.label.normalComment.label')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {t('configForm.label.normalComment.description')}
                                </span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* 댓글 길이 길게 */}
                      <FormField
                        control={form.control}
                        name="commentLengthPreset"
                        render={({ field }) => (
                          <FormItem
                            className={cn(
                              'flex h-16 w-40 cursor-pointer items-center justify-center rounded-lg border p-4 transition-all hover:bg-muted/50',
                              field.value === 'long' ? 'border-primary bg-muted/50' : ''
                            )}
                            onClick={() => {
                              field.onChange('long')
                              handleSubmit(form.getValues())
                            }}
                          >
                            <FormControl>
                              <div
                                className={`flex w-full flex-col items-center justify-center ${field.value === 'long' ? 'font-medium text-primary' : ''}`}
                              >
                                <span className="font-semibold">
                                  {t('configForm.label.longComment.label')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {t('configForm.label.longComment.description')}
                                </span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
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
                                value={field.value?.toString()}
                                onValueChange={(value) => field.onChange(Number(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1800">
                                    30{t('configForm.select.minute')}
                                  </SelectItem>
                                  <SelectItem value="3600">
                                    1{t('configForm.select.hour')}
                                  </SelectItem>
                                  <SelectItem value="10800">
                                    3{t('configForm.select.hour')}
                                  </SelectItem>
                                  <SelectItem value="21600">
                                    6{t('configForm.select.hour')}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 차단 유저 목록 */}
                      <FormField
                        control={form.control}
                        name="excludeUsernames"
                        render={({ field }) => (
                          <FormItem>
                            <div className="mb-2 flex items-center">
                              <FormLabel className="m-0 text-sm">
                                {t('configForm.label.excludeUsernames')}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="ml-2 h-4 w-4 cursor-help text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="py-4">
                                  <p className="text-lg">
                                    {t('configForm.description.excludeUsernames')}
                                  </p>

                                  <img
                                    src={blockGuideImage}
                                    alt="block"
                                    className="aspect-video w-96 object-contain"
                                  />
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <FormControl>
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {field.value?.map((username, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center rounded-md bg-secondary px-2 py-1"
                                    >
                                      <span className="text-sm">{username}</span>
                                      <button
                                        type="button"
                                        title={`${username} 제거`}
                                        className="ml-1.5 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                          const newUsernames = [...(field.value || [])]
                                          newUsernames.splice(index, 1)
                                          field.onChange(newUsernames)
                                        }}
                                        aria-label={`${username} 제거`}
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M18 6 6 18"></path>
                                          <path d="m6 6 12 12"></path>
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    placeholder={t('configForm.description.excludeUsernames')}
                                    className="flex-1"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        const inputEl = e.target as HTMLInputElement
                                        const value = inputEl.value.trim()

                                        if (!value) return

                                        if (!field.value) {
                                          field.onChange([value])
                                        } else if (!field.value.includes(value)) {
                                          field.onChange([...field.value, value])
                                        }

                                        inputEl.value = ''
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-shrink-0"
                                    onClick={() => {
                                      const inputEl = document.querySelector(
                                        'input[placeholder="' +
                                          t('configForm.description.excludeUsernames') +
                                          '"]'
                                      ) as HTMLInputElement
                                      const value = inputEl?.value.trim()

                                      if (!value) return

                                      if (!field.value) {
                                        field.onChange([value])
                                      } else if (!field.value.includes(value)) {
                                        field.onChange([...field.value, value])
                                      }

                                      if (inputEl) inputEl.value = ''
                                    }}
                                  >
                                    {t('accountTable.add')}
                                  </Button>
                                </div>
                              </div>
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
