// src/main/autoUpdater.ts
import { BrowserWindow, ipcMain, app } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import path from 'path'

// 메인 창의 참조를 저장할 변수
let mainWindow: BrowserWindow | null = null

// 메인 창 설정 함수
export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
}

// 자동 업데이트 이벤트 초기화 함수
export function initAutoUpdater(): void {
  if (process.env.NODE_ENV === 'development') {
    autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml')
    log.info('개발 환경에서는 자동 업데이트가 비활성화됩니다.')
    return
  }

  log.info('GitHub 토큰 설정 중...')

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'LCNINE',
    repo: 'agent-a',
    private: true,
    token:
      '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'
  })

  // 로그 레벨 및 경로 설정
  autoUpdater.logger = log
  log.transports.file.level = 'debug'
  log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log')

  log.info('App version:', app.getVersion())

  autoUpdater.on('checking-for-update', () => {
    log.info('업데이트 확인 중...')
    log.info('현재 버전:', app.getVersion())
    log.info('업데이트 피드 URL:', autoUpdater.getFeedURL())
  })

  autoUpdater.on('update-available', (info) => {
    log.info('새 버전 발견:', info.version)
    log.info('현재 버전:', app.getVersion())
    mainWindow?.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    log.info('현재 최신 버전입니다:', info)
    mainWindow?.webContents.send('update:not-available')
  })

  autoUpdater.on('error', (error) => {
    log.error('업데이트 중 오류:', error)

    if (error instanceof Error) {
      log.error('에러 메시지:', error.message)
      log.error('에러 스택:', error.stack)
    }

    mainWindow?.webContents.send(
      'update:error',
      error instanceof Error ? error.message : String(error)
    )
  })

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('update:download-progress', {
      percent: progressObj.percent
    })
  })

  autoUpdater.on('update-downloaded', () => {
    log.info('업데이트 다운로드 완료')
    mainWindow?.webContents.send('update:downloaded')
  })

  // 15분마다 업데이트 확인
  const CHECK_INTERVAL = 15 * 60 * 1000
  setInterval(() => {
    checkForUpdates()
  }, CHECK_INTERVAL)

  // 초기 업데이트 확인
  checkForUpdates()

  ipcMain.handle('update:start-download', () => {
    log.info('업데이트 다운로드 시작')
    return autoUpdater.downloadUpdate()
  })

  ipcMain.handle('update:install', () => {
    log.info('업데이트 설치 및 재시작')
    autoUpdater.quitAndInstall()
  })

  log.info('autoUpdater 초기화 완료')
  log.info('현재 앱 버전:', app.getVersion())
  log.info('업데이트 피드 URL:', autoUpdater.getFeedURL())
}

// 업데이트 확인 함수
export async function checkForUpdates(): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    log.info('개발 환경에서는 업데이트 확인이 비활성화됩니다.')
    return
  }

  try {
    log.info('업데이트 확인 시작')
    await autoUpdater.checkForUpdates()
  } catch (error) {
    log.error('업데이트 확인 중 오류:', error)
  }
}

// 주기적으로 업데이트 확인 (운영 환경에서만)
if (process.env.NODE_ENV !== 'development') {
  setInterval(
    () => {
      autoUpdater.checkForUpdates().catch((err) => {
        log.error('업데이트 확인 중 오류 발생:', err)
      })
    },
    60 * 60 * 1000
  )
}
