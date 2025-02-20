// src/main/agent/common/browser.ts
import { chromium } from 'playwright-core'
import { execSync } from 'child_process'
import { app } from 'electron'
import log from 'electron-log'
import ProgressBar from 'electron-progressbar'
import fs, { createWriteStream } from 'fs'
import http from 'http'
import https from 'https'
import { join } from 'path'
import { pipeline } from 'stream'
import { LoginCredentials } from '../../..'


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

    const chromeExePath = join(chromePath, 'chrome-win64', 'chrome.exe')

    if (!fs.existsSync(chromeExePath)) {
      log.info('Installing Chrome...')

      const downloadUrl = `https://storage.googleapis.com/chrome-for-testing-public/133.0.6943.53/win64/chrome-win64.zip`

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
  try {
    const userDataDirPath = join(app.getPath('userData'), 'accountData', credentials.username);
    const context = await chromium.launchPersistentContext(userDataDirPath, {
      headless: false,
      channel: 'chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ],
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    return context
  } catch (error) {
    log.error('브라우저 시작 실패:', error);
    throw new Error(
      `브라우저 시작 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export { ensureChromium }

