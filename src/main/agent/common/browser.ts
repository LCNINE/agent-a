import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { USER_DATA_DIR } from './auth'
import { LoginCredentials } from '../../..'
import { install, Browser } from '@puppeteer/browsers'
import { join } from 'path'
import { app } from 'electron'

async function ensureChromium() {
  const cachePath = join(app.getPath('userData'), '.cache', 'puppeteer')

  try {
    await install({
      browser: Browser.CHROMIUM,
      buildId: '131.0.6778.87',
      cacheDir: cachePath,
      downloadProgressCallback: (downloadedBytes, totalBytes) => {
        console.log(`Chrome 다운로드 중: ${Math.round((downloadedBytes / totalBytes) * 100)}%`)
      }
    })
    return cachePath
  } catch (error) {
    console.error('Chrome 다운로드 실패:', error)
    throw error
  }
}

export async function startBrowser(credentials: LoginCredentials) {
  const chromePath = await ensureChromium()

  return await puppeteer.use(StealthPlugin()).launch({
    headless: false,
    userDataDir: USER_DATA_DIR(credentials.username),
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
