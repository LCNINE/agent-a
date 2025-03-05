import React from 'react'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@renderer/components/ui/card'
import useMyFeedWorkStore from '@renderer/store/myFeedWorkStore'
import { toast } from 'sonner'
import FeedWorkModeTabs from './FeedWorkModeTabs'

const MyFeedWork = () => {
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
                <FeedWorkModeTabs />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

export default MyFeedWork
