// src/renderer/src/pages/HomePage/HomePage.tsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import Footer from '@/components/template/Footer'
import { AgentController } from './AgentController'
import { useAuthContext } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { useFreeTrialQuery, useStartFreeTrialMutation } from '@/service/free-trial/queries'
import { useCurrentSubscriptionQuery } from '@/service/subscription/queries'

export default function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuthContext()

  const { data: hasUsedFreeTrial, refetch } = useFreeTrialQuery(user?.id)
  const { data: subscription } = useCurrentSubscriptionQuery(user?.id ?? '')
  const startFreeTrial = useStartFreeTrialMutation()

  // useMemo를 사용하여 subscription 상태 메모이제이션
  const isSubscriptionActive = React.useMemo(() => subscription?.isActive ?? false, [subscription])

  const handleStartFreeTrial = React.useCallback(() => {
    if (!user?.id) return
    startFreeTrial.mutateAsync(user.id)
  }, [user?.id, startFreeTrial])

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

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">{t('appName')}</h1>
        <AgentController isSubscriptionActive={isSubscriptionActive} />
      </div>
      <Footer />
    </div>
  )
}
