import puppeteer, { Browser, Page } from 'puppeteer'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { wait } from './timeUtils'
import { LoginCredentials } from '../../..'

export function USER_DATA_DIR(username: string): string {
  return path.join(app.getPath('userData'), username)
}

export async function login({ username, password }: LoginCredentials, page: Page): Promise<void> {
  await wait(500)

  await page.goto('https://www.instagram.com/accounts/login/')
  await wait(500)

  const loginForm = await page.$('form[id="loginForm"]')
  if (!loginForm) {
    return
  }

  await page.waitForSelector('input[name="username"]')
  await page.waitForSelector('input[name="password"]')

  await page.type('input[name="username"]', username, { delay: 50 })
  await wait(500)

  await page.type('input[name="password"]', password, { delay: 50 })
  await wait(500)

  await page.click('button[type="submit"]')

  await page.waitForNavigation()
  await wait(500)
}
