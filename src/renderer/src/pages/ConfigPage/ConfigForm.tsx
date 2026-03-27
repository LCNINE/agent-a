'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { cn } from '@renderer/lib/utils'
import { Check, Clock, HelpCircle, MessageSquare, PencilLine, Timer, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import blockGuideImage from '../../images/guide_to_blocking_users.png'
import CustomPromptDialog from './CustomPromptDialog'
import { configSchema, type ConfigSchema } from './schema'
import useCreateClient from '@/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function ConfigForm() {
  const { t } = useTranslation()
  const { config, setConfig, setIsDirty } = useConfigStore()
  const [isCustomPromptDialogOpen, setIsCustomPromptDialogOpen] = useState(false)
  const supabase = useCreateClient()
  const { user } = useAuth()

  const form = useForm<ConfigSchema>({
    resolver: zodResolver(configSchema),
    defaultValues: { ...config }
  })

  useEffect(() => {
    form.reset(config)
  }, [])

  useEffect(() => {
    const loadBlockedAccounts = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('block_account')
          .select('block_ids')
          .eq('member_id', user.id)
          .maybeSingle()

        if (error) {
          console.error('차단된 계정 로드 실패:', error)
          return
        }

        // 차단 목록이 없으면 스킵
        if (!data) return

        if (data && data.block_ids) {
          const blockIds =
            typeof data.block_ids === 'string'
              ? (JSON.parse(data.block_ids) as string[])
              : data.block_ids

          form.setValue('excludeUsernames', blockIds)
          setConfig({ ...config, excludeUsernames: blockIds })
        }
      } catch (error) {
        console.error('차단된 계정 로드 중 오류:', error)
      }
    }

    loadBlockedAccounts()
  }, [user])

  async function handleSubmit(values: Omit<ConfigSchema, 'commentLengthPreset'>) {
    if (!user) return

    try {
      const blockIdsJson = JSON.stringify(values.excludeUsernames || [])

      const { data: existingData, error: fetchError } = await supabase
        .from('block_account')
        .select('*')
        .eq('member_id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('차단된 계정 조회 실패:', fetchError)
        return
      }

      if (existingData) {
        const { error: updateError } = await supabase
          .from('block_account')
          .update({
            block_ids: blockIdsJson
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('차단된 계정 업데이트 실패:', updateError)
          toast.error(t('configForm.error.updateBlockedAccounts'))
          return
        }
      } else {
        const { error: insertError } = await supabase.from('block_account').insert({
          id: user.id,
          member_id: user.id,
          block_ids: blockIdsJson
        })

        if (insertError) {
          console.error('차단된 계정 생성 실패:', insertError)
          toast.error(t('configForm.error.createBlockedAccounts'))
          return
        }
      }

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
      toast.success('설정이 저장되었습니다')
    } catch (error) {
      console.error('설정 저장 중 오류:', error)
      toast.error(t('configForm.error.save'))
    }
  }

  // 시간 포맷팅 헬퍼
  const formatTime = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600)
      return `${hours}시간`
    }
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (secs === 0) return `${minutes}분`
    return `${minutes}분 ${secs}초`
  }

  const commentStyles = [
    { value: 'formal', label: '정중한', emoji: '🎩' },
    { value: 'casual', label: '친근한', emoji: '😊' },
    { value: 'hyper', label: '열정적', emoji: '🔥' },
    { value: 'custom', label: '직접 작성', emoji: '✏️' }
  ]

  const commentLengths = [
    { value: 'short', label: '짧게', desc: '10~20자' },
    { value: 'normal', label: '보통', desc: '30~50자' },
    { value: 'long', label: '길게', desc: '50~100자' }
  ]

  const restTimeOptions = [
    { value: 200, label: '3분 20초' },
    { value: 350, label: '5분 50초' },
    { value: 600, label: '10분' },
    { value: 650, label: '10분 50초' }
  ]

  const workIntervalOptions = [
    { value: 200, label: '3분 20초' },
    { value: 350, label: '5분 50초' },
    { value: 600, label: '10분' },
    { value: 650, label: '10분 50초' }
  ]

  const loopIntervalOptions = [
    { value: 1800, label: '30분' },
    { value: 3600, label: '1시간' },
    { value: 10800, label: '3시간' },
    { value: 21600, label: '6시간' }
  ]

  return (
    <TooltipProvider delayDuration={100}>
      <div className="container mx-auto max-w-2xl p-4">
        <ScrollArea className="h-[calc(100vh-120px)] scrollbar-apple">
          <Form {...form}>
            <form id="config-form" onSubmit={(e) => e.preventDefault()} className="space-y-6 pb-6">
              {isCustomPromptDialogOpen && (
                <CustomPromptDialog
                  visible={isCustomPromptDialogOpen}
                  setVisible={setIsCustomPromptDialogOpen}
                />
              )}

              {/* 섹션 1: 댓글 스타일 */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-apple-blue" />
                    <h3 className="font-semibold">댓글 스타일</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">AI가 작성할 댓글의 톤을 선택하세요</p>
                </div>
                <CardContent className="p-4">
                  <FormField
                    control={form.control}
                    name="prompt.preset"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="grid grid-cols-4 gap-2">
                            {commentStyles.map((style) => (
                              <button
                                key={style.value}
                                type="button"
                                onClick={() => {
                                  field.onChange(style.value)
                                  if (style.value === 'custom') {
                                    setIsCustomPromptDialogOpen(true)
                                  } else {
                                    handleSubmit(form.getValues())
                                  }
                                }}
                                className={cn(
                                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200',
                                  field.value === style.value
                                    ? 'border-primary bg-primary/10 shadow-apple-sm'
                                    : 'border-transparent bg-muted/50 hover:bg-muted'
                                )}
                              >
                                <span className="text-xl">{style.emoji}</span>
                                <span className="text-xs font-medium">{style.label}</span>
                              </button>
                            ))}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* 댓글 길이 */}
                  <div className="mt-5 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">댓글 길이</span>
                    </div>
                    <FormField
                      control={form.control}
                      name="commentLengthPreset"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex gap-2">
                              {commentLengths.map((length) => (
                                <button
                                  key={length.value}
                                  type="button"
                                  onClick={() => {
                                    field.onChange(length.value)
                                    handleSubmit(form.getValues())
                                  }}
                                  className={cn(
                                    'flex-1 py-2.5 px-3 rounded-xl border-2 transition-all duration-200 text-center',
                                    field.value === length.value
                                      ? 'border-primary bg-primary/10'
                                      : 'border-transparent bg-muted/50 hover:bg-muted'
                                  )}
                                >
                                  <div className="text-sm font-medium">{length.label}</div>
                                  <div className="text-[10px] text-muted-foreground">{length.desc}</div>
                                </button>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 섹션 2: 작업 타이밍 */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-apple-orange" />
                    <h3 className="font-semibold">작업 타이밍</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">자연스러운 활동을 위한 시간 설정</p>
                </div>
                <CardContent className="p-0">
                  {/* 게시물 작업 후 쉬는 시간 */}
                  <FormField
                    control={form.control}
                    name="postIntervalSeconds"
                    render={({ field }) => (
                      <div className="p-4 border-b border-border/30">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">게시물 작업 후 쉬는 시간</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">각 게시물에 좋아요 또는 댓글 후 대기하는 시간입니다</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {formatTime(field.value || 600)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {restTimeOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                field.onChange(option.value)
                                handleSubmit(form.getValues())
                              }}
                              className={cn(
                                'flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                                field.value === option.value
                                  ? 'bg-primary text-primary-foreground shadow-apple-sm'
                                  : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  />

                  {/* 작업 사이 대기 시간 */}
                  <FormField
                    control={form.control}
                    name="workIntervalSeconds"
                    render={({ field }) => (
                      <div className="p-4 border-b border-border/30">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">작업 사이 대기 시간</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">피드 작업 → 해시태그 작업 등 작업이 전환될 때 대기하는 시간입니다</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {formatTime(field.value || 600)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {workIntervalOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                field.onChange(option.value)
                                handleSubmit(form.getValues())
                              }}
                              className={cn(
                                'flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                                field.value === option.value
                                  ? 'bg-primary text-primary-foreground shadow-apple-sm'
                                  : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  />

                  {/* 전체 사이클 반복 주기 */}
                  <FormField
                    control={form.control}
                    name="loopIntervalSeconds"
                    render={({ field }) => (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">전체 작업 반복 주기</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">모든 작업을 완료한 후 처음부터 다시 시작하기까지 대기하는 시간입니다</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {formatTime(field.value || 21600)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {loopIntervalOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                field.onChange(option.value)
                                handleSubmit(form.getValues())
                              }}
                              className={cn(
                                'flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                                field.value === option.value
                                  ? 'bg-primary text-primary-foreground shadow-apple-sm'
                                  : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 섹션 3: 차단 계정 */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚫</span>
                    <h3 className="font-semibold">제외할 계정</h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="p-4">
                        <p className="mb-2">댓글을 달지 않을 계정을 추가하세요</p>
                        <img
                          src={blockGuideImage}
                          alt="block guide"
                          className="w-72 rounded-lg"
                        />
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">이 계정들의 게시물에는 댓글을 달지 않습니다</p>
                </div>
                <CardContent className="p-4">
                  <FormField
                    control={form.control}
                    name="excludeUsernames"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="space-y-3">
                            {/* 입력 필드 */}
                            <div className="flex gap-2">
                              <Input
                                placeholder="@username 입력 후 엔터"
                                className="flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const inputEl = e.target as HTMLInputElement
                                    const value = inputEl.value.trim().replace('@', '')

                                    if (!value) return

                                    if (!field.value) {
                                      field.onChange([value])
                                    } else if (!field.value.includes(value)) {
                                      field.onChange([...field.value, value])
                                      handleSubmit(form.getValues())
                                    }

                                    inputEl.value = ''
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const inputEl = document.querySelector(
                                    'input[placeholder="@username 입력 후 엔터"]'
                                  ) as HTMLInputElement
                                  const value = inputEl?.value.trim().replace('@', '')

                                  if (!value) return

                                  if (!field.value) {
                                    field.onChange([value])
                                  } else if (!field.value.includes(value)) {
                                    field.onChange([...field.value, value])
                                    handleSubmit(form.getValues())
                                  }

                                  if (inputEl) inputEl.value = ''
                                }}
                              >
                                추가
                              </Button>
                            </div>

                            {/* 태그 목록 */}
                            {field.value && field.value.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {field.value.map((username, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-1.5 bg-muted rounded-full pl-3 pr-1.5 py-1 text-sm"
                                  >
                                    <span>@{username}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newUsernames = [...(field.value || [])]
                                        newUsernames.splice(index, 1)
                                        field.onChange(newUsernames)
                                        handleSubmit(form.getValues())
                                      }}
                                      className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {(!field.value || field.value.length === 0) && (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                제외할 계정이 없습니다
                              </p>
                            )}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </form>
          </Form>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
