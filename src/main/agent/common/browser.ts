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
import isOnline from 'is-online'
import log from 'electron-log'

async function ensureChromium(): Promise<string> {
  const appPath = app.getPath('userData')
  const chromePath = join(appPath, '.cache', 'puppeteer', 'chrome')
  const chromeExePath = join(chromePath, 'win64-117.0.5938.149', 'chrome-win', 'chrome.exe')

  const maxRetries = 3
  let currentRetry = 0

  while (currentRetry < maxRetries) {
    try {
      if (!fs.existsSync(chromeExePath)) {
        const online = await isOnline()
        if (!online) {
          throw new Error('인터넷 연결이 필요합니다.')
        }

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

        // Chrome 설치
        await install({
          browser: Browser.CHROMIUM,
          buildId: '117.0.5938.149',
          cacheDir: join(appPath, '.cache', 'puppeteer'),
          downloadProgressCallback: (downloadedBytes, totalBytes) => {
            const progress = Math.round((downloadedBytes / totalBytes) * 100)
            progressBar.value = progress
            progressBar.detail = `다운로드 중... ${progress}%`
          }
        })

        progressBar.close()
      }

      return chromeExePath
    } catch (error) {
      currentRetry++
      console.error(`Chrome installation attempt ${currentRetry} failed:`, error)

      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'

      if (currentRetry === maxRetries) {
        await dialog.showMessageBox({
          type: 'error',
          title: 'Chrome 설치 실패',
          message: 'Chrome 설치에 실패했습니다.',
          detail: `오류: ${errorMessage}\n다시 시도해주세요.`,
          buttons: ['확인']
        })
        throw error
      }

      const response = await dialog.showMessageBox({
        type: 'warning',
        title: 'Chrome 설치 재시도',
        message: '설치에 실패했습니다. 다시 시도하시겠습니까?',
        detail: `오류: ${errorMessage}`,
        buttons: ['재시도', '취소'],
        defaultId: 0
      })

      if (response.response === 1) {
        throw new Error('사용자가 설치를 취소했습니다.')
      }

      // 잠시 대기 후 재시도
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  throw new Error('Chrome 설치에 실패했습니다.')
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
