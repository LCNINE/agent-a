import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@renderer/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert'
import { InfoIcon } from 'lucide-react'

const AdvancedModeSettings = () => {
  return (
    <div className="space-y-6 py-4">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>준비 중</AlertTitle>
        <AlertDescription>
          고급 모드 기능은 현재 개발 중입니다. 곧 추가될 예정입니다.
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default AdvancedModeSettings
