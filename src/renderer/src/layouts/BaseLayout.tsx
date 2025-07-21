import React from 'react'
import DragWindowRegion from '@/components/DragWindowRegion'
import NavigationMenu from '@/components/template/NavigationMenu'
import { useTranslation } from 'react-i18next'

export default function BaseLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()

  return (
    <>
      <DragWindowRegion title={t('appName')} />
      <NavigationMenu />
      <main className="font-spoqa h-screen p-2">{children}</main>
    </>
  )
}
