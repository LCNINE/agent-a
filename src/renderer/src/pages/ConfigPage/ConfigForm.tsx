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
import { cn } from '@renderer/lib/utils'
import { BookOpen, Coffee, HelpCircle, PencilLine, RotateCw, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import blockGuideImage from '../../images/guide_to_blocking_users.png'
import CustomPromptDialog from './CustomPromptDialog'
import { configSchema, type ConfigSchema } from './schema'

export function ConfigForm() {
  const { t } = useTranslation()
  const { config, setConfig, setIsDirty } = useConfigStore()
  const [isCustomPromptDialogOpen, setIsCustomPromptDialogOpen] = useState(false)

  const form = useForm<ConfigSchema>({
    resolver: zodResolver(configSchema),
    defaultValues: { ...config }
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
              ? 30
              : 50,
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

  return (
    <TooltipProvider delayDuration={100}>
      <div className="container max-w-3xl p-4 mx-auto">
        <Card className="flex h-[calc(100vh-150px)] flex-col shadow-lg">
          <CardHeader className="flex-shrink-0 p-2 bg-muted/50">
            <div className="flex items-center justify-between px-5">
              <CardTitle className="hidden text-xl font-bold">{t('configPage.title')}</CardTitle>
            </div>
          </CardHeader>

          <ScrollArea className="flex-grow">
            <CardContent className="p-6">
              <Form {...form}>
                <form id="config-form" onSubmit={(e) => e.preventDefault()} className="space-y-6">
                  {isCustomPromptDialogOpen && (
                    <CustomPromptDialog
                      visible={isCustomPromptDialogOpen}
                      setVisible={setIsCustomPromptDialogOpen}
                    />
                  )}

                  {/* 댓글 스타일 설정 */}
                  <div className="h-full p-4">
                    <div className="flex items-center mb-4">
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
                          <FormItem className="p-0 m-0">
                            <FormControl>
                              <div
                                className={`flex min-h-28 cursor-pointer items-center rounded-lg border p-4 transition-all hover:bg-muted/50 ${
                                  field.value === 'formal'
                                    ? 'border-primary/80 bg-primary/5 shadow-[0_0_0_2px_rgba(var(--primary),0.3)] dark:bg-primary/10'
                                    : ''
                                }`}
                                onClick={() => {
                                  field.onChange('formal')
                                  handleSubmit(form.getValues())
                                }}
                              >
                                <div className="flex items-center justify-center w-12 h-12 mr-3 bg-blue-100 rounded-full">
                                  <BookOpen className="w-6 h-6 text-blue-600" />
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
                          <FormItem className="p-0 m-0">
                            <FormControl>
                              <div
                                className={`flex min-h-28 cursor-pointer items-center rounded-lg border p-4 transition-all hover:bg-muted/50 ${
                                  field.value === 'casual'
                                    ? 'border-primary/80 bg-primary/5 shadow-[0_0_0_2px_rgba(var(--primary),0.3)] dark:bg-primary/10'
                                    : ''
                                }`}
                                onClick={() => {
                                  field.onChange('casual')
                                  handleSubmit(form.getValues())
                                }}
                              >
                                <div className="flex items-center justify-center w-12 h-12 mr-3 rounded-full bg-amber-100">
                                  <Coffee className="w-6 h-6 text-amber-600" />
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
                          <FormItem className="p-0 m-0">
                            <FormControl>
                              <div
                                className={`flex min-h-28 cursor-pointer items-center rounded-lg border p-4 transition-all hover:bg-muted/50 ${
                                  field.value === 'hyper'
                                    ? 'border-primary/80 bg-primary/5 shadow-[0_0_0_2px_rgba(var(--primary),0.3)] dark:bg-primary/10'
                                    : ''
                                }`}
                                onClick={() => {
                                  field.onChange('hyper')
                                  handleSubmit(form.getValues())
                                }}
                              >
                                <div className="flex items-center justify-center w-12 h-12 mr-3 bg-purple-100 rounded-full">
                                  <Sparkles className="w-6 h-6 text-purple-600" />
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
                          <FormItem className="p-0 m-0">
                            <FormControl>
                              <div
                                className={`flex min-h-28 cursor-pointer items-center rounded-lg border p-4 transition-all hover:bg-muted/50 ${
                                  field.value === 'custom'
                                    ? 'border-primary/80 bg-primary/5 shadow-[0_0_0_2px_rgba(var(--primary),0.3)] dark:bg-primary/10'
                                    : ''
                                }`}
                                onClick={() => {
                                  field.onChange('custom')
                                  setIsCustomPromptDialogOpen(true)
                                }}
                              >
                                <div className="flex items-center justify-center w-12 h-12 mr-3 bg-gray-100 rounded-full">
                                  <PencilLine className="w-6 h-6 text-gray-600" />
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
                  <div className="h-full p-4">
                    <div className="flex items-center mb-4 font-semibold">
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
                              field.value === 'short'
                                ? 'border-primary/80 bg-primary/5 shadow-[0_0_0_2px_rgba(var(--primary),0.3)] dark:bg-primary/10'
                                : ''
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
                              field.value === 'normal'
                                ? 'border-primary/80 bg-primary/5 shadow-[0_0_0_2px_rgba(var(--primary),0.3)] dark:bg-primary/10'
                                : ''
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
                              field.value === 'long'
                                ? 'border-primary/80 bg-primary/5 shadow-[0_0_0_2px_rgba(var(--primary),0.3)] dark:bg-primary/10'
                                : ''
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
                  <div className="p-4 bg-card">
                    <div className="relative py-2 space-y-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute top-0 right-0"
                            title="기본 값으로 되돌리기"
                            onClick={() => {
                              if (window.confirm('설정을 기본값으로 되돌리시겠습니까?')) {
                                form.setValue('postIntervalSeconds', 600)
                                form.setValue('workIntervalSeconds', 600)
                                form.setValue('loopIntervalSeconds', 21600)
                                handleSubmit(form.getValues())
                                toast.success('설정이 기본값으로 되돌아갔습니다.')
                              }
                            }}
                          >
                            <RotateCw className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>추천 값으로 되돌리기</p>
                        </TooltipContent>
                      </Tooltip>
                      {/* 댓글 시간 간격 */}
                      <FormField
                        control={form.control}
                        name="postIntervalSeconds"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center mb-2">
                              <FormLabel className="m-0 text-sm">
                                {t('configForm.label.postIntervalSeconds')}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-4 h-4 ml-2 cursor-help text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <p>{t('configForm.description.postIntervalSeconds')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <FormControl>
                              <Select
                                value={field.value?.toString()}
                                onValueChange={(value) => {
                                  field.onChange(Number(value))
                                  handleSubmit(form.getValues())
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="200">
                                    3{t('configForm.select.minute')} 20
                                    {t('configForm.select.second')}
                                  </SelectItem>
                                  <SelectItem value="350">
                                    5{t('configForm.select.minute')} 50
                                    {t('configForm.select.second')}
                                  </SelectItem>
                                  <SelectItem value="600">
                                    10{t('configForm.select.minute')}
                                  </SelectItem>
                                  <SelectItem value="650">
                                    10{t('configForm.select.minute')} 50
                                    {t('configForm.select.second')}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
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
                              <FormLabel className="m-0 text-sm">
                                {t('configForm.label.workIntervalSeconds')}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-4 h-4 ml-2 cursor-help text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm space-y-2 leading-relaxed">
                                  <p>{t('configForm.description.workIntervalSeconds')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <FormControl>
                              <Select
                                value={field.value?.toString()}
                                onValueChange={(value) => {
                                  field.onChange(Number(value))
                                  handleSubmit(form.getValues())
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="200">
                                    3{t('configForm.select.minute')} 20
                                    {t('configForm.select.second')}
                                  </SelectItem>
                                  <SelectItem value="350">
                                    5{t('configForm.select.minute')} 50
                                    {t('configForm.select.second')}
                                  </SelectItem>
                                  <SelectItem value="600">
                                    10{t('configForm.select.minute')}
                                  </SelectItem>
                                  <SelectItem value="650">
                                    10{t('configForm.select.minute')} 50
                                    {t('configForm.select.second')}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
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
                              <FormLabel className="m-0 text-sm">
                                {t('configForm.label.loopIntervalSeconds')}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-4 h-4 ml-2 cursor-help text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm space-y-2 leading-relaxed">
                                  <p>{t('configForm.description.loopIntervalSeconds')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <FormControl>
                              <Select
                                value={field.value?.toString()}
                                onValueChange={(value) => {
                                  field.onChange(Number(value))
                                  handleSubmit(form.getValues())
                                }}
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
                            <div className="flex items-center mb-2">
                              <FormLabel className="m-0 text-sm">
                                {t('configForm.label.excludeUsernames')}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-4 h-4 ml-2 cursor-help text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="py-4">
                                  <p className="text-lg">
                                    {t('configForm.description.excludeUsernames')}
                                  </p>

                                  <img
                                    src={blockGuideImage}
                                    alt="block"
                                    className="object-contain aspect-video w-96"
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
                                      className="flex items-center px-2 py-1 rounded-md bg-secondary"
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
