import { Link, useLocation } from '@tanstack/react-router'
import { HomeIcon } from 'lucide-react'
import { useEffect } from 'react'
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

export default function NavigationMenu() {
  const { t } = useTranslation()

  const location = useLocation()

  useEffect(() => {
    console.log('현재 URL:', location.pathname)
  }, [location])

  return (
    <div className="flex w-full flex-row items-center justify-between px-2">
      <NavigationMenuBase className="font-spoqa text-muted-foreground">
        <NavigationMenuList>
          <NavigationMenuItem>
            <Link to="/">
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                <HomeIcon
                  className={`${location.pathname === '/' ? 'font-bold text-foreground' : ''} h-5 w-5`}
                />
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link to="/work">
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                <span
                  className={`${location.pathname === '/work' ? 'font-bold text-foreground' : ''}`}
                >
                  {t('nav.workPage')}
                </span>
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link to="/config">
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                <span
                  className={`${location.pathname === '/config' ? 'font-bold text-foreground' : ''}`}
                >
                  {t('nav.configPage')}
                </span>
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenuBase>

      <div className="space-x-2">
        <ToggleTheme />
        <LangMenu />
        <UserMenu />
      </div>
    </div>
  )
}
