import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAccountStore } from '@/store/accountStore'
import { useAgent } from '@renderer/hooks/useAgent'
import { useRouter } from '@tanstack/react-router'
import { CustomToast } from '@renderer/components/CustomToast'
import { useWorkStore } from '@renderer/store/workStore'
import { useErrorStore } from '@renderer/store/errorStore'
import { LoginCredentials } from 'src'
import { cn } from '@/utils/tailwind'

interface AgentControllerProps {
  isSubscriptionActive: boolean
  maxInstances: number
}

export function AgentController({ isSubscriptionActive, maxInstances }: AgentControllerProps) {
  const { t } = useTranslation()
  const accountList = useAccountStore((state) => state.accountList)
  const activeAccounts = useAccountStore((state) => state.activeAccounts)
  const toggleAccountActive = useAccountStore((state) => state.toggleAccountActive)
  const { getAgentStatus, isAnyRunning, startAgent, stopAgent, stopAllAgents, statuses } =
    useAgent()
  const workList = useWorkStore((state) => state.workList)
  const { addError } = useErrorStore()
  const router = useRouter()

  const runningCount = Object.values(statuses).filter((s) => s.isRunning).length

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
    if (runningCount >= maxInstances) {
      CustomToast({
        status: 'error',
        message: `현재 플랜은 최대 ${maxInstances}개까지 동시 실행 가능합니다.`,
        position: 'top-center',
        duration: 2000
      })
      return
    }
    startAgent({ username: account.username, password: account.password })
  }

  const activeAccountList = accountList.filter((a) => activeAccounts.includes(a.username))

  const handleToggleActive = (username: string) => {
    const success = toggleAccountActive(username, maxInstances)
    if (!success) {
      CustomToast({
        status: 'error',
        message: `현재 플랜은 최대 ${maxInstances}개까지 활성화할 수 있습니다.`,
        position: 'top-center',
        duration: 2000
      })
    }
  }

  const handleStartAll = () => {
    if (!validateWork()) return
    let started = runningCount
    for (const account of activeAccountList) {
      if (started >= maxInstances) break
      const status = getAgentStatus(account.username)
      if (!status.isRunning && account.password) {
        startAgent({ username: account.username, password: account.password })
        started++
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
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>활성화 계정: {activeAccounts.length}/{maxInstances}개</span>
      </div>

      {/* 계정별 토글 + 시작/중지 */}
      {accountList.map((account) => {
        const status = getAgentStatus(account.username)
        const isActive = activeAccounts.includes(account.username)
        return (
          <div
            key={account.username}
            className={cn(
              'flex items-center justify-between rounded-lg border p-3',
              !isActive && 'opacity-50'
            )}
          >
            <div className="flex items-center gap-3">
              <Switch
                checked={isActive}
                onCheckedChange={() => handleToggleActive(account.username)}
                disabled={status.isRunning}
              />
              <div className="flex items-center gap-2">
                {status.isRunning && (
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                )}
                {!status.isRunning && isActive && (
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                )}
                <span className="text-sm font-medium">{account.username}</span>
              </div>
            </div>
            {isActive && (
              <>
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
                    disabled={!isSubscriptionActive || !account.password || runningCount >= maxInstances}
                  >
                    {t('AgentController.action.start')}
                  </Button>
                )}
              </>
            )}
          </div>
        )
      })}

      {/* 전체 시작/중지 (활성 계정 2개 이상일 때만) */}
      {activeAccountList.length >= 2 && (
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
