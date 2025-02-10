import React, { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { useTranslation } from 'react-i18next'

export default function UpdateAlert() {
  const { t } = useTranslation()
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState(0)
  const [updateInfo, setUpdateInfo] = useState<{ version: string; releaseNotes: string } | null>(
    null
  )
  const [downloadComplete, setDownloadComplete] = useState(false)

  useEffect(() => {
    window.update.onUpdateAvailable((info) => {
      setUpdateInfo(info)
      setShowUpdateDialog(true)
    })

    window.update.onDownloadProgress((progressObj) => {
      setProgress(progressObj.percent)
    })

    window.update.onUpdateDownloaded(() => {
      setDownloadComplete(true)
    })
  }, [])

  const handleUpdate = () => {
    setShowProgress(true)
    window.update.startDownload()
  }

  const handleInstall = () => {
    window.update.installUpdate()
  }

  if (!showUpdateDialog || !updateInfo) return null

  return (
    <AlertDialog open={showUpdateDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('update.newVersion')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('update.newVersionAvailable', { version: updateInfo.version })}
            {updateInfo.releaseNotes && (
              <div className="mt-2">
                <h4>{t('update.releaseNotes')}:</h4>
                <p>{updateInfo.releaseNotes}</p>
              </div>
            )}
            {showProgress && <Progress value={progress} className="mt-4" />}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowUpdateDialog(false)}>
            {t('common.later')}
          </AlertDialogCancel>
          {downloadComplete ? (
            <AlertDialogAction onClick={handleInstall}>{t('update.install')}</AlertDialogAction>
          ) : (
            <AlertDialogAction onClick={handleUpdate}>{t('update.download')}</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
