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
import { WorkLog } from 'src'
import { AgentController } from './AgentController'

export default function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuthContext()
  const { status } = useAgent()
  const [showLogs, setShowLogs] = useState(true)

  const { data: hasUsedFreeTrial, refetch } = useFreeTrialQuery(user?.id)
  const { data: subscription } = useCurrentSubscriptionQuery(user?.id ?? '')
  const startFreeTrial = useStartFreeTrialMutation()

  // useMemo를 사용하여 subscription 상태 메모이제이션
  const isSubscriptionActive = React.useMemo(() => subscription?.isActive ?? false, [subscription])

  const handleStartFreeTrial = React.useCallback(() => {
    if (!user?.id) return
    startFreeTrial.mutateAsync(user.id)
  }, [user?.id, startFreeTrial])

  // 현재 작업 타입 확인
  const getCurrentWorkType = () => {
    if (!status.currentWork) return null

    if (status.currentWork.feedWork.enabled) return '피드 작업'
    if (status.currentWork.hashtagWork.enabled) return '해시태그 검색 작업'
    if (status.currentWork.myFeedInteractionWork.enabled) return '내 피드 댓글 작업'
    return '작업 진행 중'
  }

  // 작업 진행률 계산 - 향후 구현을 위한 더미 함수
  const getWorkProgress = () => {
    return { current: 0, total: 0 }
  }

  // 로그 항목 렌더링
  const renderLogItem = (log: WorkLog, index: number) => {
    const time = new Date(log.timestamp).toLocaleTimeString()

    return (
      <div
        key={`${log.timestamp}-${index}`}
        className="py-1 border-b border-gray-100 last:border-0"
      >
        <div className="flex items-start gap-2">
          {log.success === true && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
          {log.success === false && <XCircle className="h-4 w-4 text-red-500 mt-0.5" />}
          {log.success === undefined && <Activity className="h-4 w-4 text-blue-500 mt-0.5" />}

          <div className="flex-1">
            <div className="flex justify-between">
              <span className="font-medium text-sm">{log.action}</span>
              <span className="text-xs text-gray-500">{time}</span>
            </div>
            {log.details && (
              <p className="text-xs text-gray-600 mt-0.5">{log.details}</p>
            )}
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

        {/* 구독 상태 표시 영역 */}
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

        {/* 작업 상태 표시 영역 - 항상 표시하도록 수정 */}
        <Card className="w-[500px] mt-4">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">작업 현황</h3>

              {status.currentAction && (
                <Badge variant="outline" className="bg-blue-50">
                  {status.currentAction === '중지됨' ? (
                    '중지됨'
                  ) : (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {status.currentAction}
                    </span>
                  )}
                </Badge>
              )}

              {!status.isRunning && !status.currentAction && (
                <Badge variant="outline" className="bg-gray-50">
                  대기 중
                </Badge>
              )}
            </div>
          </div>

          <div className="h-[250px] overflow-hidden ">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* 현재 작업 정보 - 실행 중일 때만 표시 */}
                {status.isRunning && status.currentWork && (
                  <div className="rounded-md bg-blue-50 p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                      <span className="font-medium">현재 작업:</span>
                      <span className="font-medium text-blue-600">{getCurrentWorkType()}</span>
                    </div>

                    {/* 작업 진행률 표시 - 향후 구현 가능 */}
                    {getWorkProgress().total > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {getWorkProgress().current} / {getWorkProgress().total} 완료
                      </div>
                    )}
                  </div>
                )}

                {/* 대기 상태 표시 - 실행 중일 때만 표시 */}
                {status.isRunning && status.waiting && (
                  <div className="rounded-md bg-yellow-50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">대기 중:</span>
                      <span className="text-yellow-700">{status.waiting.for}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      다음 작업 시작: {status.waiting.until}
                    </div>
                  </div>
                )}

                {/* 초기화 중 상태 - 실행 중일 때만 표시 */}
                {status.isRunning && !status.currentWork && !status.waiting && !status.currentAction && (
                  <div className="rounded-md bg-gray-50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-gray-500" />
                      <span>작업 초기화 중...</span>
                    </div>
                  </div>
                )}

                {/* 에이전트 실행 중이 아닐 때 표시할 내용 */}
                {!status.isRunning && (
                  <div className="rounded-md bg-gray-50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="break-normal">에이전트가 실행 중이 아닙니다. 시작 버튼을 눌러 작업을 시작하세요.</span>
                    </div>
                  </div>
                )}

                {/* 작업 로그 섹션 - 항상 표시하도록 수정 */}
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">작업 로그</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLogs(!showLogs)}
                  >
                    {showLogs ? '로그 숨기기' : '로그 보기'}
                  </Button>
                </div>

                {showLogs && (
                  <div className="rounded border p-2 overflow-hidden">
                    <div className="space-y-1">
                      {status.logs && status.logs.length > 0 ? (
                        status.logs.slice().reverse().map((log, index) =>
                          renderLogItem(log, index)
                        )
                      ) : (
                        <div className="py-1 text-sm text-gray-500 text-center">
                          로그가 없습니다. 에이전트를 시작하면 로그가 표시됩니다.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 작업 정보 안내 메시지 */}
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