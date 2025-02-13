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
import { execSync } from 'child_process'
import https from 'https'
import http from 'http'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream'

import log from 'electron-log'

async function checkUrlExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proto = !url.charAt(4).localeCompare('s') ? https : http

    const request = proto.get(url, (response) => {
      resolve(response.statusCode === 200)
    })

    request.on('error', () => {
      resolve(false)
    })
  })
}

async function ensureChromium(): Promise<string> {
  const appPath = app.getPath('userData')
  const chromePath = join(appPath, '.cache', 'puppeteer', 'chrome')

  try {
    if (!fs.existsSync(chromePath)) {
      console.log('Installing Chrome using Puppeteer...');

      // Puppeteer를 이용해 Chrome 설치
      execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
    }

    // Puppeteer에서 설치된 Chrome 경로 찾기
    const chromeExecutablePath = execSync('npx puppeteer browsers path chrome', { encoding: 'utf8' }).trim();

    if (!fs.existsSync(chromeExecutablePath)) {
      throw new Error(`Chrome executable not found at: ${chromeExecutablePath}`);
    }

    return chromeExecutablePath;
  } catch (error) {
    console.error('Chrome installation failed:', error);
    throw new Error(`Chrome installation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const proto = !url.charAt(4).localeCompare('s') ? https : http

  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)

    const request = proto.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`))
        return
      }

      pipeline(response, file, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })

    request.on('error', (err) => {
      file.close()
      fs.unlink(dest, () => reject(err))
    })
  })
}

export async function startBrowser(credentials: LoginCredentials) {
  const chromePath = await ensureChromium()
  console.log('chromePath', chromePath)

  if (!fs.existsSync(chromePath)) {
    throw new Error('Chrome executable not found at: ' + chromePath)
  }

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
