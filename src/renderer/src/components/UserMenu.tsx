import React, { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAuthContext } from '@/hooks/useAuth'
import { UserRoundIcon } from 'lucide-react'
import useCreateClient from '@/supabase/client'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { Link } from '@tanstack/react-router'
import { useConfigStore } from '@renderer/store/configStore'
import ProtectedLink from './ProtectedLink'

export default function UserMenu() {
  const { t } = useTranslation()
  const { user } = useAuthContext()
  const { config } = useConfigStore()
  const [open, setOpen] = useState(false)

  if (user == null) {
    return <div />
  }

  async function logout() {
    const supabase = useCreateClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('userMenu logout Error: ', error)
      toast.error(t('userMenu.logout.error'))
      throw error
    }
    toast.success(t('userMenu.logout.success'))
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <UserRoundIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* 계정 관리 메뉴 추가 */}
        <DropdownMenuItem asChild onClick={() => setOpen(false)}>
          <ProtectedLink
            to="/account"
            isDirty={config.isDirty}
            btnClassName="px-2 py-1.5 text-sm hover:bg-accent"
          >
            {t('userMenu.manageAccount')}
          </ProtectedLink>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={logout}>
          {t('userMenu.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
