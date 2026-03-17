import Footer from '@/components/template/Footer'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { AccountTable } from './AccountTable'
import { useAccountStore } from '@/store/accountStore'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AddAccountDialog } from './AddAccountDialog'
import { useAuthContext } from '@/hooks/useAuth'
import { useCurrentSubscriptionQuery } from '@/service/subscription/queries'

export default function AccountPage() {
  const { t } = useTranslation()
  const accountList = useAccountStore((state) => state.accountList)
  const { user } = useAuthContext()
  const { data: subscription } = useCurrentSubscriptionQuery(user?.id ?? '')
  const maxInstances = subscription?.maxInstances ?? 1

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold md:text-3xl">{t('accountTable.title')}</h1>
          <AddAccountDialog
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('accountTable.addAccount')}
              </Button>
            }
          />
        </div>
        <div className="rounded-lg border bg-card">
          <AccountTable accounts={accountList} maxInstances={maxInstances} />
        </div>
      </div>
      <Footer />
    </div>
  )
}
