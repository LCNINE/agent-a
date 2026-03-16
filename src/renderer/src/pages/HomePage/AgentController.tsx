import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAccountStore } from '@/store/accountStore'
import { useAgent } from '@renderer/hooks/useAgent'
import { useRouter } from '@tanstack/react-router'
import { CustomToast } from '@renderer/components/CustomToast'
import { useWorkStore } from '@renderer/store/workStore'
import { useErrorStore } from '@renderer/store/errorStore'
import { LoginCredentials } from 'src'

interface AgentControllerProps {
  isSubscriptionActive: boolean
}

export function AgentController({ isSubscriptionActive }: AgentControllerProps) {
  const { t } = useTranslation()
  const accountList = useAccountStore((state) => state.accountList)
  const { getAgentStatus, isAnyRunning, startAgent, stopAgent, stopAllAgents } = useAgent()
  const workList = useWorkStore((state) => state.workList)
  const { addError } = useErrorStore()
  const router = useRouter()

  const validateWork = (): boolean => {
    if (!isSubscriptionActive) {
      CustomToast({
        status: 'error',
        message: '구독이 필요합니다',
        position: 'top-center',
        duration: 2000
      })
      return false
    }

    if (workList.feedWork.enabled && workList.feedWork.count === 0) {
      addError('feedWorkCount')
      CustomToast({
        status: 'error',
        message: '피드 작업의 개수가 설정되지 않았습니다.',
        position: 'top-center',
        duration: 2000,
        action: { label: '설정하기', onClick: () => router.navigate({ to: '/work' }) }
      })
      return false
    }

    if (workList.hashtagWork.enabled && workList.hashtagWork.count === 0) {
      addError('noHashtags')
      CustomToast({
        status: 'error',
        message: '해시태그 검색 작업 개수가 설정되지 않았습니다',
        position: 'top-center',
        duration: 2000,
        action: { label: '설정하기', onClick: () => router.navigate({ to: '/work' }) }
      })
      return false
    }

    if (workList.hashtagWork.enabled && workList.hashtagWork.hashtags.length === 0) {
      addError('noHashtags')
      CustomToast({
        status: 'error',
        message: '해시태그가 설정되지 않았습니다',
        position: 'top-center',
        duration: 2000,
        action: { label: '설정하기', onClick: () => router.navigate({ to: '/work' }) }
      })
      return false
    }

    if (workList.myFeedInteractionWork.enabled && workList.myFeedInteractionWork.count === 0) {
      addError('myFeedInteractionWorkCount')
      CustomToast({
        status: 'error',
        message: '내 피드에 댓글 작업 개수가 설정되지 않았습니다.',
        position: 'top-center',
        duration: 2000,
        action: { label: '설정하기', onClick: () => router.navigate({ to: '/work' }) }
      })
      return false
    }

    if (
      !workList.feedWork.enabled &&
      !workList.hashtagWork.enabled &&
      !workList.hashtagInteractionWork.enabled &&
      !workList.myFeedInteractionWork.enabled
    ) {
      addError('all')
      CustomToast({
        status: 'error',
        message: '작업 목록이 없어서 작업을 시작할 수 없습니다. 작업을 추가해주세요.',
        position: 'top-center',
        duration: 2000,
        action: { label: '설정하기', onClick: () => router.navigate({ to: '/work' }) }
      })
      return false
    }

    return true
  }

  const handleStart = (account: LoginCredentials) => {
    if (!validateWork()) return
    startAgent({ username: account.username, password: account.password })
  }

  const handleStartAll = () => {
    if (!validateWork()) return
    for (const account of accountList) {
      const status = getAgentStatus(account.username)
      if (!status.isRunning && account.password) {
        startAgent({ username: account.username, password: account.password })
      }
    }
  }

  if (accountList.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">등록된 계정이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-[500px]">
      {/* 계정별 시작/중지 */}
      {accountList.map((account) => {
        const status = getAgentStatus(account.username)
        return (
          <div
            key={account.username}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-2">
              {status.isRunning && (
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              )}
              {!status.isRunning && (
                <div className="h-2 w-2 rounded-full bg-gray-300" />
              )}
              <span className="text-sm font-medium">{account.username}</span>
            </div>
            {status.isRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => stopAgent(account.username)}
              >
                {t('AgentController.action.stop')}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleStart(account)}
                disabled={!isSubscriptionActive || !account.password}
              >
                {t('AgentController.action.start')}
              </Button>
            )}
          </div>
        )
      })}

      {/* 전체 시작/중지 (계정 2개 이상일 때만) */}
      {accountList.length >= 2 && (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleStartAll}
            disabled={!isSubscriptionActive}
          >
            전체 시작
          </Button>
          <Button
            className="flex-1"
            variant="destructive"
            onClick={stopAllAgents}
            disabled={!isAnyRunning}
          >
            전체 중지
          </Button>
        </div>
      )}
    </div>
  )
}
