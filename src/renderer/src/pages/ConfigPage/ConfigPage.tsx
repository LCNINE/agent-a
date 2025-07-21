import React from 'react'
import Footer from '@/components/template/Footer'
import { useTranslation } from 'react-i18next'
import { ConfigForm } from './ConfigForm'

export default function ConfigPage() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-col justify-center">
        <ConfigForm />
      </div>
      <Footer />
    </div>
  )
}
