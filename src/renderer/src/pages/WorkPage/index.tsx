'use client'

import { useWorkStore } from '@/store/workStore'
import { zodResolver } from '@hookform/resolvers/zod'
import Footer from '@renderer/components/template/Footer'
import { Form } from '@renderer/components/ui/form'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { useErrorStore } from '@renderer/store/errorStore'
import { Hash, MessageSquare, Rss, Users, FileUp, Heart, MessageCircle, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { WorkType, TargetUser } from 'src'
import { workSchema, WorkSchema } from './schema'
import WorkSection from './WorkSection'
import { useForm } from 'react-hook-form'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import TargetUserImportDialog from '@renderer/components/TargetUserImportDialog'
import TargetUserList from '@renderer/components/TargetUserList'
import { cn } from '@renderer/lib/utils'
import { CustomToast } from '@renderer/components/CustomToast'

export default function WorkPage() {
  const { workList, upsert } = useWorkStore()
  const { hasError, removeError, addError } = useErrorStore()

  const [newHashtag, setNewHashtag] = useState('')
  const [newHashtagInteraction, setNewHashtagInteraction] = useState('')
  const [isHashtagListOpen, setIsHashtagListOpen] = useState(false)
  const [isHashtagInteractionListOpen, setIsHashtagInteractionListOpen] = useState(false)
  const hashtagInputRef = useRef<HTMLInputElement>(null)
  const hashtagInteractionInputRef = useRef<HTMLInputElement>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

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
    key: 'likeEnabled' | 'commentEnabled' | 'postsPerUser',
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
                        max={10}
                        value={workList.targetUserWork.postsPerUser}
                        onChange={(e) =>
                          handleTargetUserSettingChange(
                            'postsPerUser',
                            Math.min(10, Math.max(1, parseInt(e.target.value) || 1))
                          )
                        }
                        className="w-20"
                      />
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
                  error={hasError('noHashtags')}
                >
                  <div className="mt-4">
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
