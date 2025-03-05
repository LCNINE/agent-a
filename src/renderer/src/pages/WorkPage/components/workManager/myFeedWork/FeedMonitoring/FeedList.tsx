import React from 'react'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import FeedItem from './FeedItem'
import useMyFeedWorkStore from '@renderer/store/myFeedWorkStore'

const FeedList = ({ onToggleFeedActive }: { onToggleFeedActive: (index: number) => void }) => {
  const { feeds } = useMyFeedWorkStore()

  if (feeds.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        추가된 피드가 없습니다. 새 피드를 추가하세요.
      </div>
    )
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-4">
        {feeds.map((feed) => (
          <FeedItem key={feed.id} feed={feed} />
        ))}
      </div>
    </ScrollArea>
  )
}

export default FeedList
