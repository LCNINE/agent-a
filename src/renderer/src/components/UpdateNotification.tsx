import React, { useEffect } from 'react'
import { toast } from 'sonner'

export function UpdateNotification() {
  useEffect(() => {
    window.electron.ipcRenderer.on('update-available', (info) => {
      toast.message('새로운 버전이 있습니다', {
        description: `버전 ${info.version}이 릴리즈되었습니다.`,
        action: {
          label: '업데이트',
          onClick: () => {
            // 업데이트 다운로드 요청ㄴㄴ
            window.electron.ipcRenderer.send('download-update')
          }
        }
      })
    })

    window.electron.ipcRenderer.on('update-downloaded', () => {
      toast.message('업데이트 준비 완료', {
        description: '업데이트를 설치하려면 앱을 재시작하세요.',
        action: {
          label: '지금 재시작',
          onClick: () => window.electron.ipcRenderer.send('install-update')
        }
      })
    })

    window.electron.ipcRenderer.on('update-error', (error) => {
      toast.error('업데이트 오류', {
        description: '업데이트 중 문제가 발생했습니다.'
      })
    })
  }, [])

  return null
}
