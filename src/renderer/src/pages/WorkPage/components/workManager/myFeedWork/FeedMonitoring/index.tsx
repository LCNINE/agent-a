import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { CheckCircle2, Plus, XCircle } from 'lucide-react'
import FeedList from './FeedList'
import AddFeedDialog from './AddFeedDialog'
import { toast } from 'sonner'
import { Feed } from 'src'

const FeedMonitoring = () => {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const handleAddButtonClick = () => {
    setIsAddDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsAddDialogOpen(false)
  }

  const toggleFeedActive = (index: number) => {
    const updatedFeeds = [...feeds]
    console.log(updatedFeeds)
    updatedFeeds[index].active = !updatedFeeds[index].active
    setFeeds(updatedFeeds)

    toast.success(
      updatedFeeds[index].active
        ? `${updatedFeeds[index].name} 피드가 활성화되었습니다`
        : `${updatedFeeds[index].name} 피드가 비활성화되었습니다`,
      {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        className:
          'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600',
        duration: 3000
      }
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>피드 모니터링</CardTitle>
          <CardDescription>모니터링할 피드를 추가하고 관리하세요</CardDescription>
        </div>
        <Button size="sm" onClick={handleAddButtonClick} aria-label="피드 추가">
          <Plus className="mr-2 h-4 w-4" />
          피드 추가
        </Button>
      </CardHeader>
      <CardContent>
        <FeedList onToggleFeedActive={toggleFeedActive} />
      </CardContent>

      <AddFeedDialog isOpen={isAddDialogOpen} onClose={handleDialogClose} />
    </Card>
  )
}

export default FeedMonitoring
