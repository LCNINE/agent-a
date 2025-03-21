'use client'

import { useWorkStore } from '@/store/workStore'
import { zodResolver } from '@hookform/resolvers/zod'
import Footer from '@renderer/components/template/Footer'
import { Form } from '@renderer/components/ui/form'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { useErrorStore } from '@renderer/store/errorStore'
import { Hash, MessageSquare, Rss } from 'lucide-react'
import { useRef, useState } from 'react'
import { WorkType } from 'src'
import { workSchema, WorkSchema } from './schema'
import WorkSection from './WorkSection'
import { useForm } from 'react-hook-form'

export default function WorkPage() {
  const { workList, upsert } = useWorkStore()
  const { hasError, removeError } = useErrorStore()

  const [newHashtag, setNewHashtag] = useState('')
  const [newHashtagInteraction, setNewHashtagInteraction] = useState('')
  const [isHashtagListOpen, setIsHashtagListOpen] = useState(false)
  const [isHashtagInteractionListOpen, setIsHashtagInteractionListOpen] = useState(false)
  const hashtagInputRef = useRef<HTMLInputElement>(null)
  const hashtagInteractionInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<WorkSchema>({
    defaultValues: {
      ...workList
    },
    resolver: zodResolver(workSchema),
    mode: 'all'
  })

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

  return (
    <TooltipProvider delayDuration={100}>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <div className="flex h-[calc(100vh-90px)] flex-col">
            <ScrollArea className="h-full">
              <div className="max-w-2xl p-4 mx-auto space-y-6">
                <WorkSection
                  title="피드 작업"
                  type="feedWork"
                  icon={<Rss className="w-5 h-5 text-gray-700" />}
                  description="피드에서 자동으로 좋아요 및 댓글을 작성합니다."
                  enabled={workList.feedWork.enabled}
                  onToggle={() => {
                    handleSwitchChange('feedWork', workList.feedWork.enabled)
                    removeError('feedWork')
                    removeError('feedWorkCount')
                  }}
                  error={hasError('feedWorkCount')}
                />

                <WorkSection
                  title="해시태그 검색 작업"
                  type="hashtagWork"
                  icon={<Hash className="w-5 h-5 text-gray-700" />}
                  description="특정 해시태그로 검색된 게시물에 자동으로 상호작용합니다."
                  enabled={workList.hashtagWork.enabled}
                  onToggle={() => {
                    handleSwitchChange('hashtagWork', workList.hashtagWork.enabled)
                    removeError('hashtagWork')
                    removeError('noHashtags')
                  }}
                  hashtags={workList.hashtagWork.hashtags}
                  onAddHashtag={(tag) =>
                    upsert({
                      ...workList,
                      hashtagWork: {
                        ...workList.hashtagWork,
                        hashtags: [...workList.hashtagWork.hashtags, tag]
                      }
                    })
                  }
                  error={hasError('noHashtags')}
                />

                <WorkSection
                  title="내 피드 댓글에 좋아요 및 대댓글 달기 작업"
                  type="myFeedInteractionWork"
                  icon={<MessageSquare className="w-5 h-5 text-gray-700" />}
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
                />

                {/* <WorkSection
            title="해시태그 검색 후 댓글 작성자 피드 방문"
            icon={<Hash className="w-5 h-5 text-gray-700" />}
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
        </form>
      </Form>
    </TooltipProvider>
  )
}
