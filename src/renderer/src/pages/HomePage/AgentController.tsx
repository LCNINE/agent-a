import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAccountStore } from '@/store/accountStore'
import { useAgent } from '@renderer/hooks/useAgent'
import { useRouter } from '@tanstack/react-router'
import { CustomToast } from '@renderer/components/CustomToast'
import { useWorkStore } from '@renderer/store/workStore'
import { useErrorStore } from '@renderer/store/errorStore'

interface AgentControllerProps {
  isSubscriptionActive: boolean
}

export function AgentController({ isSubscriptionActive }: AgentControllerProps) {
  const { t } = useTranslation()
  const selectedAccount = useAccountStore((state) => state.selectedAccount)
  const { status, startAgent, stopAgent } = useAgent()
  const workList = useWorkStore((state) => state.workList)
  const { setError } = useErrorStore()
  const router = useRouter()

  const validateAndStart = () => {
    if (!selectedAccount) {
      CustomToast({
        status: 'error',
        message: t('AgentController.error.noAccountSelected'),
        position: 'top-center',
        duration: 2000
      })
      return
    }

    if (!isSubscriptionActive) {
      CustomToast({
        status: 'error',
        message: '구독이 필요합니다',
        position: 'top-center',
        duration: 2000
      })
      return
    }

    if (workList.hashtagWork && workList.hashtags.length === 0) {
      setError('hashtag')
      CustomToast({
        status: 'error',
        message: '해시태그가 설정되지 않았습니다',
        position: 'top-center',
        duration: 2000,
        action: {
          label: '설정하기',
          onClick: () => router.navigate({ to: '/work' })
        }
      })
      return
    }

    if (workList.hashtagInteractionWork && workList.interactionHashtags.length === 0) {
      setError('hashtagInteraction')
      CustomToast({
        status: 'error',
        message: '관심 해시태그가 설정되지 않았습니다',
        position: 'top-center',
        duration: 2000,
        action: {
          label: '설정하기',
          onClick: () => router.navigate({ to: '/work' })
        }
      })
      return
    }

    if (!workList.feedWork && !workList.hashtagWork && !workList.hashtagInteractionWork) {
      setError('all')
      CustomToast({
        status: 'error',
        message: '작업 목록이 없어서 작업을 시작할 수 없습니다. 작업을 추가해주세요.',
        position: 'top-center',
        duration: 2000,
        action: {
          label: '설정하기',
          onClick: () => router.navigate({ to: '/work' })
        }
      })
      return
    }

    // 모든 검증 통과, 에이전트 시작
    startAgent({
      username: selectedAccount.username,
      password: selectedAccount.password
    })
  }

  if (!status.isRunning)
    return (
      <div className="flex flex-col gap-2">
        <p>{t('AgentController.status.idle')}</p>
        <Button onClick={validateAndStart} disabled={!selectedAccount || !isSubscriptionActive}>
          {t('AgentController.action.start')}
        </Button>
      </div>
    )
  else
    return (
      <div className="flex flex-col gap-2">
        <p>{t('AgentController.status.working')}</p>
        <Button variant="destructive" onClick={() => stopAgent()}>
          {t('AgentController.action.stop')}
        </Button>
      </div>
    )
}
