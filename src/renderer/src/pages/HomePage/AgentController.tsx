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
import { LoginCredentials, WorkType } from 'src'
import { cn } from '@/utils/tailwind'
import { useAuthContext } from '@renderer/hooks/useAuth'

interface AgentControllerProps {
  isSubscriptionActive: boolean
  maxInstances: number
}

export function AgentController({ isSubscriptionActive, maxInstances }: AgentControllerProps) {
  const { t } = useTranslation()
  const { user } = useAuthContext()
  const accountList = useAccountStore((state) => state.accountList)
  const activeAccounts = useAccountStore((state) => state.activeAccounts)
  const toggleAccountActive = useAccountStore((state) => state.toggleAccountActive)
  const { getAgentStatus, isAnyRunning, startAgent, stopAgent, stopAllAgents, statuses } =
    useAgent()
  const getWorkForAccount = useWorkStore((state) => state.getWorkForAccount)
  const { addError } = useErrorStore()
  const router = useRouter()

  const runningCount = Object.values(statuses).filter((s) => s.isRunning).length

  // 계정별 work 검증
  const validateWorkForAccount = (username: string): boolean => {
    if (!isSubscriptionActive) {
      CustomToast({
        status: 'error',
        message: '구독이 필요합니다',
        position: 'top-center',
        duration: 2000
      })
      return false
    }

    const workList = getWorkForAccount(username)

    if (workList.feedWork.enabled && workList.feedWork.count === 0) {
      addError('feedWorkCount')
      CustomToast({
        status: 'error',
        message: `[${username}] 피드 작업의 개수가 설정되지 않았습니다.`,
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
        message: `[${username}] 해시태그 검색 작업 개수가 설정되지 않았습니다`,
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
        message: `[${username}] 해시태그가 설정되지 않았습니다`,
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
        message: `[${username}] 내 피드에 댓글 작업 개수가 설정되지 않았습니다.`,
        position: 'top-center',
        duration: 2000,
        action: { label: '설정하기', onClick: () => router.navigate({ to: '/work' }) }
      })
      return false
    }

    if (workList.targetUserWork?.enabled && workList.targetUserWork.targetUsers.length === 0) {
      addError('noTargetUsers')
      CustomToast({
        status: 'error',
        message: `[${username}] 타겟 유저가 설정되지 않았습니다.`,
        position: 'top-center',
        duration: 2000,
        action: { label: '설정하기', onClick: () => router.navigate({ to: '/work' }) }
      })
      return false
    }

    if (workList.targetFollowerCollectWork?.enabled && workList.targetFollowerCollectWork.targetUsers.length === 0) {
      addError('noTargetFollowerUsers')
      CustomToast({
        status: 'error',
        message: `[${username}] 팔로워 수집 타겟 유저가 설정되지 않았습니다.`,
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
      !workList.myFeedInteractionWork.enabled &&
      !workList.targetUserWork?.enabled &&
      !workList.targetFollowerCollectWork?.enabled
    ) {
      addError('all')
      CustomToast({
        status: 'error',
        message: `[${username}] 작업 목록이 없어서 작업을 시작할 수 없습니다. 작업을 추가해주세요.`,
        position: 'top-center',
        duration: 2000,
        action: { label: '설정하기', onClick: () => router.navigate({ to: '/work' }) }
      })
      return false
    }

    return true
  }

  const handleStart = (account: LoginCredentials) => {
    if (!validateWorkForAccount(account.username)) return
    if (runningCount >= maxInstances) {
      CustomToast({
        status: 'error',
        message: `현재 플랜은 최대 ${maxInstances}개까지 동시 실행 가능합니다.`,
        position: 'top-center',
        duration: 2000
      })
      return
    }
    startAgent({ username: account.username, password: account.password }, user?.id || '', user?.email)
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
    let started = runningCount
    for (const account of activeAccountList) {
      if (started >= maxInstances) break
      const status = getAgentStatus(account.username)
      if (!status.isRunning && account.password) {
        // 각 계정별로 work 검증
        if (!validateWorkForAccount(account.username)) continue
        startAgent({ username: account.username, password: account.password }, user?.id || '', user?.email)
        started++
      }
    }
  }

  if (accountList.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-muted-foreground">등록된 계정이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-[520px]">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
        <span className="font-medium">활성화 계정: {activeAccounts.length}/{maxInstances}개</span>
      </div>

      {accountList.map((account) => {
        const status = getAgentStatus(account.username)
        const isActive = activeAccounts.includes(account.username)
        return (
          <div
            key={account.username}
            className={cn(
              'flex items-center justify-between rounded-2xl border p-4 transition-all duration-200 ease-apple',
              isActive
                ? 'bg-card/80 backdrop-blur-sm shadow-apple-sm hover:shadow-apple-md'
                : 'bg-muted/30 opacity-60',
              status.isRunning && 'ring-2 ring-apple-green/30 border-apple-green/50'
            )}
          >
            <div className="flex items-center gap-4">
              <Switch
                checked={isActive}
                onCheckedChange={() => handleToggleActive(account.username)}
                disabled={status.isRunning}
              />
              <div className="flex items-center gap-2.5">
                {status.isRunning && (
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-apple-green shadow-[0_0_8px_rgba(52,199,89,0.5)]" />
                )}
                {!status.isRunning && isActive && (
                  <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
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
                    className="min-w-[72px]"
                  >
                    {t('AgentController.action.stop')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleStart(account)}
                    disabled={!isSubscriptionActive || !account.password || runningCount >= maxInstances}
                    className="min-w-[72px]"
                  >
                    {t('AgentController.action.start')}
                  </Button>
                )}
              </>
            )}
          </div>
        )
      })}

      {activeAccountList.length >= 2 && (
        <div className="flex gap-3 mt-2">
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
