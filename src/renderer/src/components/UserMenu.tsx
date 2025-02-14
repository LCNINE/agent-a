import React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthContext } from "@/hooks/useAuth"
import { UserRoundIcon } from "lucide-react"
import { createClient } from "@/supabase/client"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { Button } from "./ui/button"
import { Link } from "@tanstack/react-router"

export default function UserMenu() {
  const { t } = useTranslation()
  const { user } = useAuthContext()

  if (user == null) {
    return <div/>
  }

  async function logout() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('userMenu logout Error: ', error)
      toast.error(t("userMenu.logout.error"))
      throw error
    }
    toast.success(t("userMenu.logout.success"))
  }

  return (
    <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <UserRoundIcon/>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuLabel>{ user.email }</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {/* 계정 관리 메뉴 추가 */}
      <DropdownMenuItem asChild>
        <Link to="/account">
          {t("userMenu.manageAccount")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem className="text-destructive" onClick={logout}>
        {t("userMenu.logout")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  )
}
