import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import InteractionSettings from './InteractionSettings'
import FeedMonitoring from '../FeedMonitoring'

interface BasicModeSettingsProps {
  likeCommentsEnabled: boolean
  replyCommentsEnabled: boolean
  toggleLikeComments: (checked: boolean) => void
  toggleReplyComments: (checked: boolean) => void
}

const BasicModeSettings = () => {
  return (
    <div className="space-y-6 py-4">
      <Card>
        <CardHeader>
          <CardTitle>상호작용 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <InteractionSettings />
        </CardContent>
      </Card>

      <FeedMonitoring />
    </div>
  )
}

export default BasicModeSettings
