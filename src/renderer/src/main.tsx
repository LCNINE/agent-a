import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import './localization/i18n'
import { router } from './routes/router'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { syncThemeWithLocal } from './helpers/theme'
import { updateAppLanguage } from './helpers/language'
import UpdateAlert from './components/UpdateAlert'

export default function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    syncThemeWithLocal()
    updateAppLanguage(i18n)
  }, [i18n])

  return (
    <>
      <RouterProvider router={router} />
      <UpdateAlert />
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
