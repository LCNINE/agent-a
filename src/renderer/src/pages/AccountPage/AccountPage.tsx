import Footer from '@/components/template/Footer'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { AccountTable } from './AccountTable'
import { useAccountStore } from '@/store/accountStore'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AddAccountDialog } from './AddAccountDialog'

export default function AccountPage() {
  const { t } = useTranslation()
  const accountList = useAccountStore((state) => state.accountList)

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
          <AccountTable accounts={accountList} />
        </div>
      </div>
      <Footer />
    </div>
  )
}
