import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { USER_DATA_DIR } from './auth'
import { LoginCredentials } from '../../..'
import { install, Browser } from '@puppeteer/browsers'
import { join } from 'path'
import { app, dialog } from 'electron'
import ProgressBar from 'electron-progressbar'
import fs from 'fs'
import puppeteerCore from 'puppeteer-core'

import log from 'electron-log'

async function ensureChromium(): Promise<string> {
  const appPath = app.getPath('userData')
  const chromePath = join(appPath, '.cache', 'puppeteer', 'chrome')
  const chromeExePath = join(chromePath, 'win64-133.0.6943.53', 'chrome-win', 'chrome.exe')

  try {
    if (!fs.existsSync(chromeExePath)) {
      log.info('Chrome not found, installing...')

      const progressBar = new ProgressBar({
        indeterminate: false,
        text: 'Chrome 다운로드 중...',
        detail: '잠시만 기다려주세요...',
        browserWindow: {
          webPreferences: {
            nodeIntegration: true
          }
        }
      })

      fs.mkdirSync(join(appPath, '.cache', 'puppeteer'), { recursive: true })

      try {
        await install({
          browser: Browser.CHROMIUM,
          buildId: '133.0.6943.53',
          cacheDir: join(appPath, '.cache', 'puppeteer'),
          downloadProgressCallback: (downloadedBytes, totalBytes) => {
            const progress = Math.round((downloadedBytes / totalBytes) * 100)
            progressBar.value = progress
            progressBar.detail = `다운로드 중... ${progress}%`
          }
        })
      } finally {
        progressBar.close()
      }
    }

    return chromeExePath
  } catch (error) {
    log.error('Chrome installation failed:', error)
    throw new Error(
      'Chrome 설치 중 오류가 발생했습니다: ' +
        (error instanceof Error ? error.message : String(error))
    )
  }
}
export async function startBrowser(credentials: LoginCredentials) {
  const chromePath = await ensureChromium()
  console.log('chromePath', chromePath)

  return await puppeteer.use(StealthPlugin()).launch({
    headless: false,
    userDataDir: join(app.getPath('userData'), 'accountData', credentials.username),
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ]
  })
}

export { ensureChromium }
