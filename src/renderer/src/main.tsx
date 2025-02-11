import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import { updateAppLanguage } from './helpers/language'
import { syncThemeWithLocal } from './helpers/theme'
import './index.css'
import './localization/i18n'
import { router } from './routes/router'
import UpdateNotification from './components/UpdateNotification'

export default function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    syncThemeWithLocal()
    updateAppLanguage(i18n)
  }, [i18n])

  return (
    <>
      <RouterProvider router={router} />
      <UpdateNotification />
    </>
  )
}

const queryClient = new QueryClient()

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>
)
