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
      {!hasUsedFreeTrial && !isSubscriptionActive && (
        <div className="absolute right-6 top-20">
          <Button
            onClick={handleStartFreeTrial}
            disabled={startFreeTrial.isPending}
            variant="outline"
            size="sm"
          >
            {startFreeTrial.isPending ? '처리중...' : '3일 무료체험 시작하기'}
          </Button>
        </div>
      )}
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">{t('appName')}</h1>
        {!isSubscriptionActive && <p className="mb-2 text-red-500">{t('subscription.inactive')}</p>}
        <AgentController isSubscriptionActive={isSubscriptionActive} />
      </div>
      <Footer />
    </div>
  )
}
