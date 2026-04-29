'use client'

import { useWorkStore } from '@/store/workStore'
import { useAccountStore } from '@/store/accountStore'
import { zodResolver } from '@hookform/resolvers/zod'
import Footer from '@renderer/components/template/Footer'
import { Form } from '@renderer/components/ui/form'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { useErrorStore } from '@renderer/store/errorStore'
import { Hash, MessageSquare, Rss, Users, FileUp, Heart, MessageCircle, UserPlus, User, UserSearch, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { WorkType, TargetUser, UserCollectionSettings } from 'src'
import { workSchema, WorkSchema } from './schema'
import WorkSection from './WorkSection'
import { useForm } from 'react-hook-form'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import TargetUserImportDialog from '@renderer/components/TargetUserImportDialog'
import HashtagImportDialog from '@renderer/components/HashtagImportDialog'
import TargetUserList from '@renderer/components/TargetUserList'
import { cn } from '@renderer/lib/utils'
import { CustomToast } from '@renderer/components/CustomToast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select"

export default function WorkPage() {
  const workByAccount = useWorkStore((state) => state.workByAccount)
  const defaultWork = useWorkStore((state) => state.defaultWork)
  const upsert = useWorkStore((state) => state.upsert)
  const selectedAccountForWork = useWorkStore((state) => state.selectedAccountForWork)
  const setSelectedAccount = useWorkStore((state) => state.setSelectedAccount)

  const { accountList, activeAccounts } = useAccountStore()
  const { hasError, removeError, addError } = useErrorStore()

  // 계정 목록 (활성화된 계정만)
  const availableAccounts = accountList.filter(a => activeAccounts.includes(a.username))

  // 첫 로드 시 첫 번째 활성 계정 선택
  useEffect(() => {
    if (!selectedAccountForWork && availableAccounts.length > 0) {
      setSelectedAccount(availableAccounts[0].username)
    }
  }, [availableAccounts, selectedAccountForWork, setSelectedAccount])

  // 현재 선택된 계정의 workList (계정 변경 시 다시 계산)
  const workList = useMemo(() => {
    if (selectedAccountForWork && workByAccount[selectedAccountForWork]) {
      return workByAccount[selectedAccountForWork]
    }
    return defaultWork
  }, [selectedAccountForWork, workByAccount, defaultWork])

  const [newHashtag, setNewHashtag] = useState('')
  const [newHashtagInteraction, setNewHashtagInteraction] = useState('')
  const [isHashtagListOpen, setIsHashtagListOpen] = useState(false)
  const [isHashtagInteractionListOpen, setIsHashtagInteractionListOpen] = useState(false)
  const hashtagInputRef = useRef<HTMLInputElement>(null)
  const hashtagInteractionInputRef = useRef<HTMLInputElement>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isHashtagImportDialogOpen, setIsHashtagImportDialogOpen] = useState(false)
  const [isUserCollectionGuideOpen, setIsUserCollectionGuideOpen] = useState(false)

  const form = useForm<WorkSchema>({
    defaultValues: {
      ...workList
    },
    resolver: zodResolver(workSchema),
    mode: 'all'
  })

  // 피드 작업 유효성 검사 - 실시간 경고
  useEffect(() => {
    const { feedWork } = workList

    // 피드 활성화 + count 0 → 경고
    if (feedWork.enabled && feedWork.count === 0) {
      addError('feedWorkCount')
      CustomToast({
        status: 'error',
        message: '피드 작업 개수가 0입니다. 작업 개수를 설정해주세요.',
        position: 'top-center',
        duration: 3000
      })
    }
  }, [
    workList.feedWork.enabled,
    workList.feedWork.count
  ])

  const handleAddHashtag = () => {
    const trimmedHashtag = newHashtag.replace(/\s+/g, '')
    if (trimmedHashtag) {
      upsert({
        ...workList,
        hashtagWork: {
          ...workList.hashtagWork,
          hashtags: [...workList.hashtagWork.hashtags, trimmedHashtag]
        }
      })
      setNewHashtag('')
      removeError('noHashtags')
    }
    hashtagInputRef.current?.focus()
  }

  const handleAddHashtagInteraction = () => {
    const trimmedHashtag = newHashtagInteraction.replace(/\s+/g, '')

    if (trimmedHashtag) {
      upsert({
        ...workList,
        hashtagInteractionWork: {
          ...workList.hashtagInteractionWork,
          hashtags: [...workList.hashtagInteractionWork.hashtags, trimmedHashtag]
        }
      })
      setNewHashtagInteraction('')
      removeError('noHashtagInteractions')
    }
    hashtagInteractionInputRef.current?.focus()
  }

  const handleSwitchChange = (key: keyof WorkType, value: boolean) => {
    const currentItem = workList[key]

    upsert({
      [key]: {
        ...currentItem,
        enabled: !currentItem.enabled
      }
    })
  }

  const handleImportTargetUsers = (users: TargetUser[]) => {
    const existingUsernames = new Set(workList.targetUserWork.targetUsers.map(u => u.username))
    const newUsers = users.filter(u => !existingUsernames.has(u.username))

    upsert({
      targetUserWork: {
        ...workList.targetUserWork,
        targetUsers: [...workList.targetUserWork.targetUsers, ...newUsers]
      }
    })
  }

  const handleImportHashtags = (incoming: string[]) => {
    const existing = new Set(workList.hashtagWork.hashtags)
    const added: string[] = []
    for (const tag of incoming) {
      if (!existing.has(tag)) {
        existing.add(tag)
        added.push(tag)
      }
    }

    if (added.length === 0) {
      CustomToast({
        status: 'info',
        message: `추가할 해시태그가 없습니다. (중복 ${incoming.length}개 제외됨)`,
        position: 'top-center',
        duration: 2500
      })
      return
    }

    upsert({
      ...workList,
      hashtagWork: {
        ...workList.hashtagWork,
        hashtags: [...workList.hashtagWork.hashtags, ...added]
      }
    })
    removeError('noHashtags')

    const skipped = incoming.length - added.length
    CustomToast({
      status: 'success',
      message:
        skipped > 0
          ? `${added.length}개 추가 / 중복 ${skipped}개 제외`
          : `${added.length}개 해시태그가 추가되었습니다.`,
      position: 'top-center',
      duration: 2500
    })
  }

  const handleAddTargetUser = (username: string) => {
    if (workList.targetUserWork.targetUsers.some(u => u.username === username)) {
      return
    }
    upsert({
      targetUserWork: {
        ...workList.targetUserWork,
        targetUsers: [
          ...workList.targetUserWork.targetUsers,
          { username, status: 'pending' as const }
        ]
      }
    })
  }

  const handleRemoveTargetUser = (username: string) => {
    upsert({
      targetUserWork: {
        ...workList.targetUserWork,
        targetUsers: workList.targetUserWork.targetUsers.filter(u => u.username !== username)
      }
    })
  }

  const handleClearAllTargetUsers = () => {
    upsert({
      targetUserWork: {
        ...workList.targetUserWork,
        targetUsers: []
      }
    })
  }

  const handleTargetUserSettingChange = (
    key: 'likeEnabled' | 'commentEnabled' | 'postsPerUser' | 'skipOldPostsMonths',
    value: boolean | number
  ) => {
    upsert({
      targetUserWork: {
        ...workList.targetUserWork,
        [key]: value
      }
    })
  }

  const handleHashtagFollowChange = (enabled: boolean) => {
    upsert({
      hashtagWork: {
        ...workList.hashtagWork,
        followEnabled: enabled
      }
    })
  }

  const handleUserCollectionChange = (
    key: keyof UserCollectionSettings,
    value: boolean | number
  ) => {
    upsert({
      hashtagWork: {
        ...workList.hashtagWork,
        userCollection: {
          ...workList.hashtagWork.userCollection,
          [key]: value
        }
      }
    })
  }

  const handleSuggestedFollowChange = (enabled: boolean) => {
    upsert({
      feedWork: {
        ...workList.feedWork,
        suggestedFollowEnabled: enabled
      }
    })
  }

  const handleSuggestedFollowCountChange = (count: number) => {
    upsert({
      feedWork: {
        ...workList.feedWork,
        suggestedFollowCount: Math.min(20, Math.max(1, count))
      }
    })
    removeError('suggestedFollowCount')
  }

  // 선택된 계정이 없거나 유효하지 않으면 안내 메시지
  if (availableAccounts.length === 0) {
    return (
      <TooltipProvider delayDuration={100}>
        <div className="flex h-[calc(100vh-90px)] flex-col">
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <User className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground text-center">
              활성화된 계정이 없습니다.<br />
              계정 페이지에서 계정을 활성화해주세요.
            </p>
          </div>
          <Footer />
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <div className="flex h-[calc(100vh-90px)] flex-col">
            <ScrollArea className="h-full scrollbar-apple">
              <div className="mx-auto max-w-2xl space-y-5 p-6">
                {/* 계정 선택 드롭다운 */}
                <div className="flex items-center gap-3 p-4 rounded-2xl border bg-card/50 backdrop-blur-sm">
                  <User className="h-5 w-5 text-apple-blue" />
                  <Label className="text-sm font-medium whitespace-nowrap">작업 설정 계정</Label>
                  <Select
                    value={selectedAccountForWork || ''}
                    onValueChange={(value) => setSelectedAccount(value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="계정을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAccounts.map((account) => (
                        <SelectItem key={account.username} value={account.username}>
                          @{account.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <WorkSection
                  title="피드 작업"
                  type="feedWork"
                  icon={<Rss className="h-5 w-5 text-apple-blue" />}
                  description="피드에서 자동으로 좋아요 및 댓글을 작성합니다."
                  enabled={workList.feedWork.enabled}
                  onToggle={() => {
                    handleSwitchChange('feedWork', workList.feedWork.enabled)
                    removeError('feedWork')
                    removeError('feedWorkCount')
                  }}
                  error={hasError('feedWorkCount')}
                >
                  {/* 추천 유저 팔로우 - 임시 비활성화
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-apple-green" />
                        <Label className="text-sm">추천 유저 팔로우</Label>
                      </div>
                      <Switch
                        checked={workList.feedWork.suggestedFollowEnabled}
                        onCheckedChange={handleSuggestedFollowChange}
                      />
                    </div>
                    {workList.feedWork.suggestedFollowEnabled && (
                      <div className="flex items-center gap-3 pl-2">
                        <Label className="text-sm whitespace-nowrap">팔로우 수</Label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={workList.feedWork.suggestedFollowCount}
                          onChange={(e) => handleSuggestedFollowCountChange(parseInt(e.target.value) || 5)}
                          className={cn(
                            "w-20",
                            (!workList.feedWork.suggestedFollowCount || workList.feedWork.suggestedFollowCount === 0) &&
                            "ring-2 ring-apple-blue/50 border-apple-blue"
                          )}
                        />
                        {(!workList.feedWork.suggestedFollowCount || workList.feedWork.suggestedFollowCount === 0) && (
                          <span className="text-xs text-apple-orange">팔로우 수를 설정해주세요</span>
                        )}
                      </div>
                    )}
                  </div>
                  */}
                </WorkSection>

                <WorkSection
                  title="타겟 유저 프로필 방문"
                  type="targetUserWork"
                  icon={<Users className="h-5 w-5 text-apple-purple" />}
                  description="지정한 유저의 프로필을 방문하여 게시물에 좋아요/댓글을 작성합니다."
                  enabled={workList.targetUserWork.enabled}
                  onToggle={() => {
                    handleSwitchChange('targetUserWork', workList.targetUserWork.enabled)
                  }}
                  showCount={false}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsImportDialogOpen(true)}
                        className="flex-1"
                      >
                        <FileUp className="h-4 w-4 mr-2" />
                        엑셀에서 불러오기
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-apple-red" />
                          <Label className="text-sm">좋아요</Label>
                        </div>
                        <Switch
                          checked={workList.targetUserWork.likeEnabled}
                          onCheckedChange={(checked) =>
                            handleTargetUserSettingChange('likeEnabled', checked)
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-apple-blue" />
                          <Label className="text-sm">댓글</Label>
                        </div>
                        <Switch
                          checked={workList.targetUserWork.commentEnabled}
                          onCheckedChange={(checked) =>
                            handleTargetUserSettingChange('commentEnabled', checked)
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Label className="text-sm whitespace-nowrap">유저당 게시물 수</Label>
                      <Input
                        type="number"
                        min={1}
                        value={workList.targetUserWork.postsPerUser}
                        onChange={(e) =>
                          handleTargetUserSettingChange(
                            'postsPerUser',
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-20"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Label className="text-sm whitespace-nowrap">오래된 게시물 스킵</Label>
                      <Select
                        value={String(workList.targetUserWork.skipOldPostsMonths || 0)}
                        onValueChange={(v) => handleTargetUserSettingChange('skipOldPostsMonths', Number(v))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">비활성화</SelectItem>
                          <SelectItem value="1">1개월 이상</SelectItem>
                          <SelectItem value="3">3개월 이상</SelectItem>
                          <SelectItem value="6">6개월 이상</SelectItem>
                          <SelectItem value="12">12개월 이상</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <TargetUserList
                      users={workList.targetUserWork.targetUsers}
                      onAddUser={handleAddTargetUser}
                      onRemoveUser={handleRemoveTargetUser}
                      onClearAll={handleClearAllTargetUsers}
                    />
                  </div>
                </WorkSection>

                <TargetUserImportDialog
                  open={isImportDialogOpen}
                  onOpenChange={setIsImportDialogOpen}
                  onImport={handleImportTargetUsers}
                />

                <HashtagImportDialog
                  open={isHashtagImportDialogOpen}
                  onOpenChange={setIsHashtagImportDialogOpen}
                  onImport={handleImportHashtags}
                />

<WorkSection
                  title="해시태그 검색 작업"
                  type="hashtagWork"
                  icon={<Hash className="h-5 w-5 text-apple-purple" />}
                  description="특정 해시태그로 검색된 게시물에 자동으로 상호작용합니다."
                  enabled={workList.hashtagWork.enabled}
                  onToggle={() => {
                    handleSwitchChange('hashtagWork', workList.hashtagWork.enabled)
                    removeError('hashtagWork')
                    removeError('noHashtags')
                  }}
                  hashtags={workList.hashtagWork.hashtags}
                  onAddHashtag={(tag) => {
                    upsert({
                      ...workList,
                      hashtagWork: {
                        ...workList.hashtagWork,
                        hashtags: [...workList.hashtagWork.hashtags, tag]
                      }
                    })
                    removeError('noHashtags')
                  }}
                  onRemoveHashtag={(tag) => {
                    upsert({
                      ...workList,
                      hashtagWork: {
                        ...workList.hashtagWork,
                        hashtags: workList.hashtagWork.hashtags.filter((hashtag) => hashtag !== tag)
                      }
                    })
                    removeError('noHashtags')
                  }}
                  onImportHashtags={() => setIsHashtagImportDialogOpen(true)}
                  onClearHashtags={() => {
                    const prevCount = workList.hashtagWork.hashtags.length
                    upsert({
                      ...workList,
                      hashtagWork: {
                        ...workList.hashtagWork,
                        hashtags: []
                      }
                    })
                    CustomToast({
                      status: 'success',
                      message: `해시태그 ${prevCount}개가 모두 삭제되었습니다.`,
                      position: 'top-center',
                      duration: 2500
                    })
                  }}
                  error={hasError('noHashtags')}
                >
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-apple-green" />
                        <Label className="text-sm">게시물 작성자 팔로우</Label>
                      </div>
                      <Switch
                        checked={workList.hashtagWork.followEnabled}
                        onCheckedChange={handleHashtagFollowChange}
                      />
                    </div>

                    {/* 유저 수집 옵션 */}
                    <div className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserSearch className="h-4 w-4 text-apple-orange" />
                          <Label className="text-sm font-medium">댓글 좋아요 기반 유저 수집</Label>
                        </div>
                        <Switch
                          checked={workList.hashtagWork.userCollection?.enabled ?? false}
                          onCheckedChange={(checked) => handleUserCollectionChange('enabled', checked)}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground pl-6 leading-relaxed">
                        해시태그 게시물의 <span className="font-semibold text-foreground">인기 댓글 작성자</span>
                        (좋아요 많은 순)를 자동 수집해 프로필을 방문·팔로우하고 해당 유저 피드에도 상호작용합니다.
                      </p>

                      <div className="ml-6 rounded-lg border border-apple-orange/30 bg-apple-orange/5">
                        <button
                          type="button"
                          onClick={() => setIsUserCollectionGuideOpen((v) => !v)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left"
                        >
                          <span className="flex items-center gap-2 text-xs font-medium">
                            <Info className="h-3.5 w-3.5 text-apple-orange" />
                            자세한 동작 방식과 설정 안내
                          </span>
                          {isUserCollectionGuideOpen ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                        {isUserCollectionGuideOpen && (
                          <div className="space-y-3 px-3 pb-3 text-xs text-muted-foreground">
                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-foreground">동작 순서</div>
                              <ol className="list-decimal space-y-1 pl-4">
                                <li>해시태그 페이지에서 게시물 열기 → 좋아요·댓글 작업</li>
                                <li>
                                  해당 게시물의 상위 댓글을{' '}
                                  <span className="font-semibold text-foreground">좋아요 많은 순</span>으로 정렬해
                                  설정한 인원만큼 <span className="font-semibold text-foreground">유저 수집</span>
                                </li>
                                <li>수집된 유저의 프로필로 이동 → <span className="font-semibold text-foreground">팔로우</span></li>
                                <li>해당 유저 피드의 최근 게시물에 좋아요·댓글</li>
                                <li>해시태그 페이지로 복귀 → 다음 게시물 반복</li>
                              </ol>
                            </div>

                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-foreground">설정 안내</div>
                              <ul className="list-disc space-y-1 pl-4">
                                <li>
                                  <span className="font-semibold text-foreground">수집 유저 수</span>: 해시태그 1개당
                                  수집할 인원. 많을수록 작업 시간이 길어져요.
                                </li>
                                <li>
                                  <span className="font-semibold text-foreground">수집 유저 즉시 활동 · 좋아요/댓글</span>:
                                  수집한 유저의 프로필에 들어가 각 항목을 실행할지 선택.
                                </li>
                                <li>
                                  <span className="font-semibold text-foreground">유저당 게시물</span>: 수집된 유저의
                                  최근 게시물 중 몇 개에 상호작용할지 (최대 5개).
                                </li>
                              </ul>
                            </div>

                            <div className="rounded-md bg-background/60 p-2 text-[11px] leading-relaxed">
                              <span className="font-semibold text-foreground">참고</span> · 한 번이라도 활동한 유저는
                              자동으로 제외돼 중복 작업이 일어나지 않습니다. 또한 해시태그 작업의
                              <span className="font-semibold text-foreground"> 댓글 개수</span>와
                              <span className="font-semibold text-foreground"> 수집 유저 수</span>는 독립적으로
                              카운트되므로, 원하는 만큼 따로 설정할 수 있습니다.
                            </div>
                          </div>
                        )}
                      </div>

                      {workList.hashtagWork.userCollection?.enabled && (
                        <div className="pl-6 space-y-3 border-l-2 border-apple-orange/30">
                          <div className="flex items-center gap-3">
                            <Label className="text-sm whitespace-nowrap text-muted-foreground">수집 유저 수</Label>
                            <Input
                              type="number"
                              min={1}
                              max={99}
                              value={workList.hashtagWork.userCollection?.usersPerHashtag ?? 5}
                              onChange={(e) =>
                                handleUserCollectionChange(
                                  'usersPerHashtag',
                                  Math.min(99, Math.max(1, parseInt(e.target.value) || 5))
                                )
                              }
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">명</span>
                          </div>

                          {/* 수집 유저 즉시 활동 설정 */}
                          <div className="pt-2 border-t space-y-2">
                            <Label className="text-sm text-muted-foreground">수집 유저 즉시 활동</Label>
                            <div className="pl-2 space-y-2">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={workList.hashtagWork.userCollection?.autoProcessLikeEnabled ?? true}
                                    onCheckedChange={(checked) => handleUserCollectionChange('autoProcessLikeEnabled', checked)}
                                  />
                                  <Heart className="h-3 w-3 text-apple-red" />
                                  <Label className="text-xs">좋아요</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={workList.hashtagWork.userCollection?.autoProcessCommentEnabled ?? true}
                                    onCheckedChange={(checked) => handleUserCollectionChange('autoProcessCommentEnabled', checked)}
                                  />
                                  <MessageCircle className="h-3 w-3 text-apple-blue" />
                                  <Label className="text-xs">댓글</Label>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <Label className="text-xs whitespace-nowrap text-muted-foreground">유저당 게시물</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={5}
                                  value={workList.hashtagWork.userCollection?.postsPerCollectedUser ?? 3}
                                  onChange={(e) =>
                                    handleUserCollectionChange(
                                      'postsPerCollectedUser',
                                      Math.min(5, Math.max(1, parseInt(e.target.value) || 3))
                                    )
                                  }
                                  className="w-14 h-7 text-xs"
                                />
                                <span className="text-xs text-muted-foreground">개</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </WorkSection>

                {/* <WorkSection
                  title="내 피드 댓글에 좋아요 및 대댓글 달기 작업"
                  type="myFeedInteractionWork"
                  icon={<MessageSquare className="h-5 w-5 text-apple-green" />}
                  description="내 게시물에 달린 댓글에 자동으로 좋아요와 답글을 작성합니다."
                  enabled={workList.myFeedInteractionWork.enabled}
                  onToggle={() => {
                    handleSwitchChange(
                      'myFeedInteractionWork',
                      workList.myFeedInteractionWork.enabled
                    )

                    removeError('myFeedInteractionWork')
                    removeError('myFeedInteractionWorkCount')
                  }}
                  error={hasError('myFeedInteractionWorkCount')}
                /> */}
              </div>
            </ScrollArea>
            <Footer />
          </div>
        </form>
      </Form>
    </TooltipProvider>
  )
}
