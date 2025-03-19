'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useWorkStore } from '@/store/workStore'
import Footer from '@renderer/components/template/Footer'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { useErrorStore } from '@renderer/store/errorStore'
import { ChevronDown, ChevronUp, Hash, Heart, MessageSquare, Rss, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function WorkPage() {
  const { workList, upsert } = useWorkStore()
  const { errorType, clearError } = useErrorStore()

  const [newHashtag, setNewHashtag] = useState('')
  const [newHashtagInteraction, setNewHashtagInteraction] = useState('')
  const [isHashtagListOpen, setIsHashtagListOpen] = useState(false)
  const [isHashtagInteractionListOpen, setIsHashtagInteractionListOpen] = useState(false)
  const hashtagInputRef = useRef<HTMLInputElement>(null)
  const hashtagInteractionInputRef = useRef<HTMLInputElement>(null)

  const handleAddHashtag = () => {
    const trimmedHashtag = newHashtag.replace(/\s+/g, '')
    if (trimmedHashtag) {
      upsert({ ...workList, hashtags: [...workList.hashtags, trimmedHashtag] })
      setNewHashtag('')
      clearError()
    }
    hashtagInputRef.current?.focus()
  }

  const handleAddHashtagInteraction = () => {
    const trimmedHashtag = newHashtagInteraction.replace(/\s+/g, '')

    if (trimmedHashtag) {
      upsert({
        ...workList,
        interactionHashtags: [...(workList.interactionHashtags || []), trimmedHashtag]
      })
      setNewHashtagInteraction('')
      clearError()
    }
    hashtagInteractionInputRef.current?.focus()
  }

  const handleSwitchChange = (key: string, value: boolean) => {
    upsert({ [key]: !value })
    clearError()
  }

  return (
    <div className="flex h-[calc(100vh-90px)] flex-col">
      <ScrollArea className="h-full">
        <div className="mx-auto max-w-2xl space-y-6 p-4">
          <div className="relative space-y-4 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Rss className="h-5 w-5 text-gray-700" />
                <Label htmlFor="feed-work" className="font-medium">
                  피드 작업
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">
                  {workList.feedWork ? '활성화됨' : '비활성화됨'}
                </span>

                <Switch
                  id="feed-work"
                  checked={workList.feedWork}
                  onCheckedChange={() => handleSwitchChange('feedWork', workList.feedWork)}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>
            <p className="ml-7 text-sm text-gray-600">
              피드에서 자동으로 좋아요 및 댓글을 작성합니다.
            </p>
          </div>

          <div
            className={`${errorType === 'hashtag' && 'border-2 border-blue-500'} relative space-y-4 rounded-md border p-4`}
          >
            {errorType === 'hashtag' && (
              <div className="absolute -right-2 -top-2 animate-pulse">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Hash className="h-5 w-5 text-gray-700" />
                <Label htmlFor="hashtag-search" className="font-medium">
                  해시태그 검색 작업
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">
                  {workList.hashtagWork ? '활성화됨' : '비활성화됨'}
                </span>
                <Switch
                  id="hashtag-search"
                  checked={workList.hashtagWork}
                  onCheckedChange={() => handleSwitchChange('hashtagWork', workList.hashtagWork)}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>
            <p className="ml-7 text-sm text-gray-600">
              특정 해시태그로 검색된 게시물에 자동으로 상호작용합니다.
            </p>
            <div className="mb-2 flex items-center space-x-2">
              <Input
                type="text"
                placeholder="해시태그 입력 (# 제외)"
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddHashtag()
                  }
                }}
                ref={hashtagInputRef}
                className={`${errorType === 'hashtag' && 'animate-pulse border-2 border-blue-500'} flex-grow`}
              />
              <Button onClick={handleAddHashtag} size="sm">
                추가
              </Button>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => setIsHashtagListOpen(!isHashtagListOpen)}
              >
                해시태그 목록 ({workList.hashtags?.length || 0})
                {isHashtagListOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {isHashtagListOpen && (
                <ScrollArea className="relative h-[120px] rounded-md bg-gray-50 p-2 dark:bg-gray-800">
                  <div className="space-y-2">
                    {workList.hashtags?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {workList.hashtags.map((tag, index) => (
                          <div
                            key={index}
                            className="relative flex items-center rounded-full border bg-white px-3 py-1 shadow-sm"
                          >
                            <span className="mr-2 text-sm dark:text-input">#{tag}</span>
                            <button
                              onClick={() =>
                                upsert({
                                  ...workList,
                                  hashtags: workList.hashtags.filter((t) => t !== tag)
                                })
                              }
                              className="text-gray-500 hover:text-gray-700"
                              aria-label={`${tag} 태그 삭제`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">추가된 해시태그가 없습니다.</p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-gray-700" />
                <Label htmlFor="comment-interaction" className="font-medium">
                  내 피드 댓글에 좋아요 및 대댓글 달기 작업
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">
                  {workList.myFeedInteraction ? '활성화됨' : '비활성화됨'}
                </span>
                <Switch
                  id="comment-interaction"
                  checked={workList.myFeedInteraction}
                  onCheckedChange={() =>
                    handleSwitchChange('myFeedInteraction', workList.myFeedInteraction)
                  }
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>
            <p className="ml-7 text-sm text-gray-600">
              내 게시물에 달린 댓글에 자동으로 좋아요와 답글을 작성합니다.
            </p>
          </div>

          {/* <div
              className={`${errorType === 'hashtagInteraction' && 'border-2 border-blue-500'} relative space-y-4 rounded-md border p-4`}
            >
              {errorType === 'hashtagInteraction' && (
                <div className="absolute -right-2 -top-2 animate-pulse">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Hash className="h-5 w-5 text-gray-700" />
                  <Label htmlFor="hashtag-search" className="font-medium">
                    해시태그 검색 후 댓글 작성자 피드 방문
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">
                    {workList.hashtagInteractionWork ? '활성화됨' : '비활성화됨'}
                  </span>
                  <Switch
                    id="hashtag-search"
                    checked={workList.hashtagInteractionWork}
                    onCheckedChange={() =>
                      handleSwitchChange('hashtagInteractionWork', workList.hashtagInteractionWork)
                    }
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
              </div>
              <p className="ml-7 text-sm text-gray-600">
                댓글 작성자의 피드에 자동으로 좋아요와 댓글을 남겨 인맥과 노출을 늘립니다.
              </p>
              <div className="mb-2 flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="해시태그 입력 (# 제외)"
                  value={newHashtagInteraction}
                  onChange={(e) => setNewHashtagInteraction(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddHashtagInteraction()
                    }
                  }}
                  ref={hashtagInteractionInputRef}
                  className={`${errorType === 'hashtagInteraction' && 'animate-pulse border-2 border-blue-500'} flex-grow`}
                />
                <Button onClick={handleAddHashtagInteraction} size="sm">
                  추가
                </Button>
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => setIsHashtagInteractionListOpen(!isHashtagInteractionListOpen)}
                >
                  해시태그 목록 ({workList.interactionHashtags?.length || 0})
                  {isHashtagInteractionListOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                {isHashtagInteractionListOpen && (
                  <ScrollArea className="relative h-[120px] rounded-md bg-gray-50 p-2 dark:bg-gray-800">
                    <div className="space-y-2">
                      {workList.interactionHashtags?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {workList.interactionHashtags.map((tag, index) => (
                            <div
                              key={index}
                              className="relative flex items-center rounded-full border bg-white px-3 py-1 shadow-sm"
                            >
                              <span className="mr-2 text-sm dark:text-input">#{tag}</span>
                              <button
                                onClick={() =>
                                  upsert({
                                    ...workList,
                                    interactionHashtags: workList.interactionHashtags.filter(
                                      (t) => t !== tag
                                    )
                                  })
                                }
                                className="text-gray-500 hover:text-gray-700"
                                aria-label={`${tag} 태그 삭제`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">추가된 해시태그가 없습니다.</p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div> */}
        </div>
      </ScrollArea>
      <Footer />
    </div>
  )
}
