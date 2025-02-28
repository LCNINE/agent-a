import React from 'react'
import Footer from '@/components/template/Footer'
import { useTranslation } from 'react-i18next'
import { WorkTable } from './WorkTable'
import { Button } from '@/components/ui/button'
import { WorkFormDialog } from './WorkFormDialog'

export default function WorkPage() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-3xl font-bold">{t('workPage.title')}</h1>
          <WorkFormDialog work={null} />
        </div>
        <WorkTable />
        <Footer />
      </div>
    </div>
  )
}
