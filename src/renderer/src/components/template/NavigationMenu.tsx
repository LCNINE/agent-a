import { Link, useLocation } from '@tanstack/react-router'
import { HomeIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LangMenu from '../LangMenu'
import ToggleTheme from '../ToggleTheme'
import {
  NavigationMenu as NavigationMenuBase,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle
} from '../ui/navigation-menu'
import UserMenu from '../UserMenu'
import { cn } from '@/lib/utils'

export default function NavigationMenu() {
  const { t } = useTranslation()

  const location = useLocation()

  return (
    <div className="flex w-full flex-row items-center justify-between px-4 py-2">
      <div className="flex items-center rounded-xl bg-muted/60 backdrop-blur-sm p-1 shadow-apple-inner">
        <NavigationMenuBase className="font-spoqa text-muted-foreground">
          <NavigationMenuList className="gap-1">
            <NavigationMenuItem>
              <Link to="/">
                <NavigationMenuLink
                  className={cn(
                    'flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200 ease-apple',
                    location.pathname === '/'
                      ? 'bg-background text-foreground shadow-apple-sm'
                      : 'hover:bg-background/50'
                  )}
                >
                  <HomeIcon className="h-4 w-4" />
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/work">
                <NavigationMenuLink
                  className={cn(
                    'flex items-center justify-center h-9 px-4 rounded-lg text-sm font-medium transition-all duration-200 ease-apple',
                    location.pathname === '/work'
                      ? 'bg-background text-foreground shadow-apple-sm'
                      : 'hover:bg-background/50'
                  )}
                >
                  {t('nav.workPage')}
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/config">
                <NavigationMenuLink
                  className={cn(
                    'flex items-center justify-center h-9 px-4 rounded-lg text-sm font-medium transition-all duration-200 ease-apple',
                    location.pathname === '/config'
                      ? 'bg-background text-foreground shadow-apple-sm'
                      : 'hover:bg-background/50'
                  )}
                >
                  {t('nav.configPage')}
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenuBase>
      </div>

      <div className="flex items-center gap-2">
        <ToggleTheme />
        <LangMenu />
        <UserMenu />
      </div>
    </div>
  )
}
