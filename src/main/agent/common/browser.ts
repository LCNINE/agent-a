import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { USER_DATA_DIR } from './auth'
import { LoginCredentials } from '../../..'
import { install, Browser } from '@puppeteer/browsers'
import { join } from 'path'
import { app } from 'electron'
import ProgressBar from 'electron-progressbar'
import fs from 'fs'

async function ensureChromium() {
  const cachePath = join(app.getPath('userData'), '.cache', 'puppeteer')

  try {
    // 크롬 실행 파일 경로 확인
    const chromePath = join(cachePath, 'chrome', 'win64-117.0.5938.149', 'chrome-win', 'chrome.exe')

    // 파일이 존재하지 않으면 설치 진행
    if (!fs.existsSync(chromePath)) {
      console.log('Chrome not found, installing...')
      await install({
        browser: Browser.CHROMIUM,
        buildId: '117.0.5938.149',
        cacheDir: cachePath,
        downloadProgressCallback: (downloadedBytes, totalBytes) => {
          const progressBar = new ProgressBar({
            indeterminate: false,
            text: 'Chrome 다운로드 중...',
            detail: '잠시만 기다려주세요',
            browserWindow: {
              parent: undefined,
              modal: true,
              closable: false
            }
          })

          const percentage = Math.round((downloadedBytes / totalBytes) * 100)
          progressBar.value = percentage

          if (percentage >= 100) {
            progressBar.close()
          }
        }
      })
    }

    return join(cachePath, 'chrome', 'win64-117.0.5938.149', 'chrome-win')
  } catch (error) {
    console.error('Chrome installation failed:', error)
    throw error
  }
}

export async function startBrowser(credentials: LoginCredentials) {
  const chromePath = await ensureChromium()

  return await puppeteer.use(StealthPlugin()).launch({
    headless: false,
    userDataDir: join(app.getPath('userData'), 'accountData', credentials.username),
    executablePath: join(chromePath, 'chrome'),
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
