import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function UpdateNotification() {
  useEffect(() => {
    // 업데이트 이벤트 리스너 등록
    window.electron.ipcRenderer.on('update-available', (info) => {
      toast.message('업데이트 발견', {
        description: '새로운 버전이 다운로드됩니다.'
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
