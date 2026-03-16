// src/renderer/src/pages/HomePage/HomePage.tsx
import Footer from '@/components/template/Footer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAgent } from '@/hooks/useAgent'
import { useAuthContext } from '@/hooks/useAuth'
import { useFreeTrialQuery, useStartFreeTrialMutation } from '@/service/free-trial/queries'
import { useCurrentSubscriptionQuery } from '@/service/subscription/queries'
import { Activity, CheckCircle, Clock, Loader2, XCircle } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BotStatus, WorkLog } from 'src'
import { AgentController } from './AgentController'

export default function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuthContext()
  const { statuses } = useAgent()
  const [showLogs, setShowLogs] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const { data: hasUsedFreeTrial, refetch } = useFreeTrialQuery(user?.id)
  const { data: subscription } = useCurrentSubscriptionQuery(user?.id ?? '')
  const startFreeTrial = useStartFreeTrialMutation()

  const isSubscriptionActive = React.useMemo(() => subscription?.isActive ?? false, [subscription])

  const handleStartFreeTrial = React.useCallback(() => {
    if (!user?.id) return
    startFreeTrial.mutateAsync(user.id)
  }, [user?.id, startFreeTrial])

  // 표시할 에이전트 상태 결정
  const agentIds = Object.keys(statuses)
  const displayAgentId = selectedAgent && statuses[selectedAgent] ? selectedAgent : agentIds[0] || null
  const displayStatus: BotStatus | null = displayAgentId ? statuses[displayAgentId] : null

  const getCurrentWorkType = (status: BotStatus) => {
    if (!status.currentWork) return null
    if (status.currentWork.feedWork.enabled) return '피드 작업'
    if (status.currentWork.hashtagWork.enabled) return '해시태그 검색 작업'
    if (status.currentWork.myFeedInteractionWork.enabled) return '내 피드 댓글 작업'
    return '작업 진행 중'
  }

  const renderLogItem = (log: WorkLog, index: number) => {
    const time = new Date(log.timestamp).toLocaleTimeString()
    return (
      <div key={`${log.timestamp}-${index}`} className="py-1 border-b border-gray-100 last:border-0">
        <div className="flex items-start gap-2">
          {log.success === true && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
          {log.success === false && <XCircle className="h-4 w-4 text-red-500 mt-0.5" />}
          {log.success === undefined && <Activity className="h-4 w-4 text-blue-500 mt-0.5" />}
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="font-medium text-sm">{log.action}</span>
              <span className="text-xs text-gray-500">{time}</span>
            </div>
            {log.details && <p className="text-xs text-gray-600 mt-0.5">{log.details}</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="absolute right-6 top-20 flex flex-col items-end gap-2">
        {!hasUsedFreeTrial && !isSubscriptionActive && (
          <Button
            onClick={handleStartFreeTrial}
            disabled={startFreeTrial.isPending}
            variant="outline"
            size="sm"
            className="w-[160px]"
          >
            {startFreeTrial.isPending ? '처리중...' : '3일 무료체험 시작하기'}
          </Button>
        )}

        {!isSubscriptionActive && (
          <div className="rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-600">
            {t('subscription.inactive')}
          </div>
        )}
        {isSubscriptionActive && subscription?.remainingDays !== undefined && (
          <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-600">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            {subscription.formattedEndDate}까지
            <span className="text-gray-500">
              ({subscription.remainingDays}일 {subscription.remainingHours}시간)
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 mt-16 lg:mt-0">
        <h1 className="text-4xl font-bold">{t('appName')}</h1>
        <AgentController isSubscriptionActive={isSubscriptionActive} />

        {/* 작업 상태 표시 영역 */}
        <Card className="w-[500px] mt-4">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">작업 현황</h3>

              {/* 에이전트 탭 (여러 개일 때만 표시) */}
              {agentIds.length > 1 && (
                <div className="flex gap-1">
                  {agentIds.map((id) => (
                    <Button
                      key={id}
                      variant={displayAgentId === id ? 'default' : 'ghost'}
                      size="sm"
                      className="text-xs px-2 py-1 h-7"
                      onClick={() => setSelectedAgent(id)}
                    >
                      {statuses[id]?.isRunning && (
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400 mr-1" />
                      )}
                      {id}
                    </Button>
                  ))}
                </div>
              )}

              {agentIds.length <= 1 && displayStatus?.currentAction && (
                <Badge variant="outline" className="bg-blue-50">
                  {displayStatus.currentAction === '중지됨' ? (
                    '중지됨'
                  ) : (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {displayStatus.currentAction}
                    </span>
                  )}
                </Badge>
              )}

              {agentIds.length === 0 && (
                <Badge variant="outline" className="bg-gray-50">
                  대기 중
                </Badge>
              )}
            </div>
          </div>

          <div className="h-[250px] overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {displayStatus && displayStatus.isRunning && displayStatus.currentWork && (
                  <div className="rounded-md bg-blue-50 p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                      <span className="font-medium">현재 작업:</span>
                      <span className="font-medium text-blue-600">
                        {getCurrentWorkType(displayStatus)}
                      </span>
                      {agentIds.length > 1 && displayAgentId && (
                        <Badge variant="outline" className="text-xs">
                          {displayAgentId}
                        </Badge>
                      )}
                    </div>
                    {displayStatus.currentAction && displayStatus.currentAction !== '중지됨' && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {displayStatus.currentAction}
                      </div>
                    )}
                  </div>
                )}

                {displayStatus && displayStatus.isRunning && displayStatus.waiting && (
                  <div className="rounded-md bg-yellow-50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">대기 중:</span>
                      <span className="text-yellow-700">{displayStatus.waiting.for}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      다음 작업 시작: {displayStatus.waiting.until}
                    </div>
                  </div>
                )}

                {displayStatus && displayStatus.isRunning && !displayStatus.currentWork && !displayStatus.waiting && !displayStatus.currentAction && (
                  <div className="rounded-md bg-gray-50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-gray-500" />
                      <span>작업 초기화 중...</span>
                    </div>
                  </div>
                )}

                {!displayStatus && (
                  <div className="rounded-md bg-gray-50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="break-normal">
                        에이전트가 실행 중이 아닙니다. 시작 버튼을 눌러 작업을 시작하세요.
                      </span>
                    </div>
                  </div>
                )}

                {displayStatus && !displayStatus.isRunning && (
                  <div className="rounded-md bg-gray-50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="break-normal">
                        에이전트가 실행 중이 아닙니다. 시작 버튼을 눌러 작업을 시작하세요.
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">작업 로그</h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowLogs(!showLogs)}>
                    {showLogs ? '로그 숨기기' : '로그 보기'}
                  </Button>
                </div>

                {showLogs && (
                  <div className="rounded border p-2 overflow-hidden">
                    <div className="space-y-1">
                      {displayStatus?.logs && displayStatus.logs.length > 0 ? (
                        displayStatus.logs
                          .slice()
                          .reverse()
                          .map((log, index) => renderLogItem(log, index))
                      ) : (
                        <div className="py-1 text-sm text-gray-500 text-center">
                          로그가 없습니다. 에이전트를 시작하면 로그가 표시됩니다.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                  작업 정보는 자동으로 업데이트됩니다
                </div>
              </div>
            </ScrollArea>
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
