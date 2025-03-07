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
import useMyFeedWorkStore from '@renderer/store/myFeedWorkStore'

const FeedMonitoring = () => {
  const { feedList } = useMyFeedWorkStore()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const handleAddButtonClick = () => {
    setIsAddDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsAddDialogOpen(false)
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
        <FeedList />
      </CardContent>

      <AddFeedDialog isOpen={isAddDialogOpen} onClose={handleDialogClose} />
    </Card>
  )
}

export default FeedMonitoring
