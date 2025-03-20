import AccountPage from '@/pages/AccountPage/AccountPage'
import ConfigPage from '@/pages/ConfigPage/ConfigPage'
import HomePage from '@/pages/HomePage/HomePage'
import WorkPage from '@renderer/pages/WorkPage'
import { createRoute } from '@tanstack/react-router'
import { RootRoute } from './__root'

export const HomeRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/',
  component: HomePage
})

export const ConfigPageRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/config',
  component: ConfigPage
})

export const WorkPageRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/work',
  component: WorkPage
})
export const AccountPageRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/account',
  component: AccountPage
})

export const rootTree = RootRoute.addChildren([
  HomeRoute,
  ConfigPageRoute,
  WorkPageRoute,
  AccountPageRoute
])
