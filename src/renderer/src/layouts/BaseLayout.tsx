import React from 'react'
import DragWindowRegion from '@/components/DragWindowRegion'
import NavigationMenu from '@/components/template/NavigationMenu'
import { useTranslation } from 'react-i18next'

export default function BaseLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <DragWindowRegion title={t('appName')} />
      <NavigationMenu />
      <main className="font-spoqa h-screen p-6 scrollbar-apple">{children}</main>
    </div>
  )
}
