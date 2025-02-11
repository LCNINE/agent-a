import React, { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from './ui/alert-dialog'
import { useToast } from '@renderer/hooks/use-toast'

export default function UpdateNotification() {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<{ version: string; releaseNotes: string }>()
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    window.update.onUpdateAvailable((info) => {
      console.log('업데이트 가능:', info)
      setUpdateInfo(info)
      setShowUpdateDialog(true)
    })

    // 다운로드 진행률
    window.update.onDownloadProgress((progress) => {
      setDownloadProgress(progress.percent)
    })

    // 다운로드 완료
    window.update.onUpdateDownloaded(() => {
      setIsDownloaded(true)
      toast({
        title: '업데이트 준비 완료',
        description: '지금 재시작하여 업데이트를 설치하시겠습니까?',
        action: <Button onClick={() => window.update.installUpdate()}>재시작</Button>
      })
    })
  }, [])

  if (!showUpdateDialog) return null

  return (
    <AlertDialog open={showUpdateDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>새로운 업데이트가 있습니다</AlertDialogTitle>
          <AlertDialogDescription>
            버전 {updateInfo?.version}이 출시되었습니다.
            {updateInfo?.releaseNotes && (
              <>
                <br />
                <br />
                {updateInfo.releaseNotes}
              </>
            )}
            {downloadProgress > 0 && <Progress value={downloadProgress} className="mt-4" />}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowUpdateDialog(false)}>나중에</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => window.update.startDownload()}
            disabled={downloadProgress > 0 || isDownloaded}
          >
            지금 업데이트
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
