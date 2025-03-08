import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAuthContext } from '@/hooks/useAuth'
import { LanguagesIcon, UserRoundIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import langs from '@/localization/langs'
import { Button } from './ui/button'
import { setAppLanguage } from '@/helpers/language'

export default function LangMenu() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <LanguagesIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {langs.map((lang) => (
          <DropdownMenuItem key={lang.key} onClick={() => setAppLanguage(lang.key, i18n)}>
            {`${lang.prefix} ${lang.nativeName}`}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
