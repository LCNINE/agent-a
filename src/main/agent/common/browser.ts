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
    const version = '1108766'
    const platform =
      process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux'
    const arch = process.arch === 'x64' ? 'x64' : 'x86'

    const getFileName = (platform: string) => {
      switch (platform.toLowerCase()) {
        case 'win':
          return 'chrome-win32.zip'
        case 'mac':
          return 'chrome-mac.zip'
        case 'linux':
          return 'chrome-linux.zip'
        default:
          return 'chrome-win32.zip'
      }
    }
    ㄴㄴ
    const chromeExePath = join(chromePath, 'chrome-win', 'chrome.exe')

    if (!fs.existsSync(chromeExePath)) {
      log.info('Installing Chrome...')

      const downloadUrl = `https://storage.googleapis.com/chromium-browser-snapshots/${platform}64/${version}/${getFileName(platform)}`
      log.info('Download URL:', downloadUrl)

      const exists = await checkUrlExists(downloadUrl)
      if (!exists) {
        throw new Error(`Invalid Chromium version: ${version}`)
      }

      const progressBar = new ProgressBar({
        indeterminate: false,
        text: 'Chrome Downloading...',
        detail: 'Please wait...',
        browserWindow: {
          webPreferences: {
            nodeIntegration: true
          }
        }
      })

      fs.mkdirSync(chromePath, { recursive: true })

      const zipPath = join(chromePath, 'chrome.zip')

      try {
        await downloadFile(downloadUrl, zipPath)

        if (process.platform === 'win32') {
          execSync(
            `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${chromePath}'"`
          )
        } else {
          execSync(`unzip -o '${zipPath}' -d '${chromePath}'`, { encoding: 'utf8' })
        }

        fs.unlinkSync(zipPath)
        progressBar.close()
      } catch (error) {
        progressBar.close()
        log.error('Download or decompression failed:', error)
        throw new Error(
          `Chrome installation failed: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    return chromeExePath
  } catch (error) {
    log.error('Chrome Installation failed:', error)
    throw new Error(
      `Chrome installation failed: ${error instanceof Error ? error.message : String(error)}`
    )
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
