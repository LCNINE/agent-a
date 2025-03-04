import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { Label } from '@renderer/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Slider } from '@renderer/components/ui/slider'
import { Switch } from '@renderer/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { Heart, ListChecks, MessageCircle, ThumbsUp, CheckCircle2, XCircle } from 'lucide-react'
import React, { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { toast } from 'sonner'
import useMyFeedWorkStore from '@renderer/store/myFeedWorkStore'

export default function MyFeedWork() {
  const {
    feedWorkModeType,
    likeCommentsEnabled,
    replyCommentsEnabled,
    changeFeedWorkMode,
    toggleLikeComments,
    toggleReplyComments
  } = useMyFeedWorkStore()

  const handleLikeCommentsToggle = (checked: boolean) => {
    toggleLikeComments(checked)

    if (checked) {
      toast.success('댓글 좋아요 기능이 활성화되었습니다', {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        className:
          'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600',
        duration: 3000
      })
    } else {
      toast.error('댓글 좋아요 기능이 비활성화되었습니다', {
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        className: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-600',
        duration: 3000
      })
    }
  }

  const handleReplyCommentsToggle = (checked: boolean) => {
    toggleReplyComments(checked)

    if (checked) {
      toast.success('대댓글 남기기 기능이 활성화되었습니다', {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        className:
          'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600',
        duration: 3000
      })
    } else {
      toast.error('대댓글 남기기 기능이 비활성화되었습니다', {
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        className: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-600',
        duration: 3000
      })
    }
  }

  return (
    <ScrollArea className="h-[calc(100vh-10rem)]">
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>작업 모드 선택</CardTitle>
                <CardDescription>원하는 작업 모드를 선택하세요</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  defaultValue="basic"
                  className="w-full"
                  onValueChange={(value) => {
                    if (value === 'advanced') {
                      toast.error('준비중입니다.')
                      return
                    }
                    changeFeedWorkMode(value as 'basic' | 'advanced')
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">기본 모드</TabsTrigger>
                    <TabsTrigger value="advanced">고급 모드</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic">
                    <Card>
                      <CardHeader>
                        <CardTitle>기본 모드 설정</CardTitle>
                        <CardDescription>내 피드에 댓글 단 사람들과 상호작용합니다</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Heart className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor="like-comments">댓글 좋아요</Label>
                          </div>
                          <Switch
                            id="like-comments"
                            checked={likeCommentsEnabled}
                            onCheckedChange={handleLikeCommentsToggle}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor="reply-comments">대댓글 남기기</Label>
                          </div>
                          <Switch
                            id="reply-comments"
                            checked={replyCommentsEnabled}
                            onCheckedChange={handleReplyCommentsToggle}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="advanced">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <span className="relative mr-2 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75"></span>
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-500"></span>
                          </span>
                          고급 모드 (구현 예정)
                        </CardTitle>
                        <CardDescription>
                          이 기능은 현재 개발 중이며 곧 제공될 예정입니다.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                            />
                          </svg>
                          <h3 className="mb-2 text-lg font-semibold">고급 기능 개발 중</h3>
                          <p className="text-muted-foreground">
                            더욱 강력한 인스타그램 자동화 기능을 준비 중입니다.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
