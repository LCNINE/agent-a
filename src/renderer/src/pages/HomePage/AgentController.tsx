import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAccountStore } from '@/store/accountStore'
import { toast } from 'sonner'
import { useAgent } from '@renderer/hooks/useAgent'

export function AgentController() {
  const { t } = useTranslation()
  const selectedAccount = useAccountStore((state) => state.selectedAccount)
  const { status, startAgent, stopAgent } = useAgent()

  if (!status.isRunning)
    return (
      <div className="flex flex-col gap-2">
        <p>{t('AgentController.status.idle')}</p>
        <Button
          onClick={() => {
            if (selectedAccount) {
              startAgent({
                username: selectedAccount.username,
                password: selectedAccount.password
              })
            } else {
              // 계정이 선택되지 않았을 때 토스트메세지
              toast.error(t('AgentController.error.noAccountSelected'))
            }
          }}
          disabled={!selectedAccount}
        >
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
