'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useWorkStore } from '@/store/workStore'
import Footer from '@renderer/components/template/Footer'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { useErrorStore } from '@renderer/store/errorStore'
import { ChevronDown, ChevronUp, Hash, MessageSquare, Rss, Star, X } from 'lucide-react'
import { useRef, useState } from 'react'
import WorkSection from './WorkSection'

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
          <WorkSection
            title="피드 작업"
            icon={<Rss className="h-5 w-5 text-gray-700" />}
            description="피드에서 자동으로 좋아요 및 댓글을 작성합니다."
            enabled={workList.feedWork}
            onToggle={() => handleSwitchChange('feedWork', workList.feedWork)}
          />

          <WorkSection
            title="해시태그 검색 작업"
            icon={<Hash className="h-5 w-5 text-gray-700" />}
            description="특정 해시태그로 검색된 게시물에 자동으로 상호작용합니다."
            enabled={workList.hashtagWork}
            onToggle={() => handleSwitchChange('hashtagWork', workList.hashtagWork)}
            hashtags={workList.hashtags}
            onAddHashtag={(tag) => upsert({ ...workList, hashtags: [...workList.hashtags, tag] })}
            error={errorType === 'hashtag'}
          />

          <WorkSection
            title="내 피드 댓글에 좋아요 및 대댓글 달기 작업"
            icon={<MessageSquare className="h-5 w-5 text-gray-700" />}
            description="내 게시물에 달린 댓글에 자동으로 좋아요와 답글을 작성합니다."
            enabled={workList.myFeedInteraction}
            onToggle={() => handleSwitchChange('myFeedInteraction', workList.myFeedInteraction)}
          />

          {/* <WorkSection
            title="해시태그 검색 후 댓글 작성자 피드 방문"
            icon={<Hash className="h-5 w-5 text-gray-700" />}
            description="댓글 작성자의 피드에 자동으로 좋아요와 댓글을 남겨 인맥과 노출을 늘립니다."
            enabled={workList.hashtagInteractionWork}
            onToggle={() =>
              handleSwitchChange('hashtagInteractionWork', workList.hashtagInteractionWork)
            }
            hashtags={workList.interactionHashtags}
            onAddHashtag={(tag) => {
              upsert({
                ...workList,
                interactionHashtags: [...(workList.interactionHashtags || []), tag]
              })
              clearError()
            }}
            onRemoveHashtag={(tag) =>
              upsert({
                ...workList,
                interactionHashtags: workList.interactionHashtags.filter((t) => t !== tag)
              })
            }
            error={errorType === 'hashtagInteraction'}
          /> */}
        </div>
      </ScrollArea>
      <Footer />
    </div>
  )
}
