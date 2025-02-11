// src/main/autoUpdater.ts
import { BrowserWindow, ipcMain, app } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

// 메인 창의 참조를 저장할 변수
let mainWindow: BrowserWindow | null = null

// 메인 창 설정 함수
export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
}

// 자동 업데이트 이벤트 초기화 함수
export function initAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // 로깅 설정
  autoUpdater.logger = log
  log.transports.file.level = 'info'

  // 업데이트 이벤트 리스너 설정
  autoUpdater.on('checking-for-update', () => {
    log.info('업데이트 확인 중...')
    mainWindow?.webContents.send('update:checking')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('업데이트가 있습니다:', info)
    if (mainWindow) {
      mainWindow.webContents.send('update:available', {
        version: info.version,
        releaseNotes: info.releaseNotes
      })
    }
  })

  autoUpdater.on('update-not-available', (info) => {
    log.info('현재 최신 버전입니다:', info)
    mainWindow?.webContents.send('update:not-available')
  })

  autoUpdater.on('error', (err) => {
    log.error('업데이트 중 오류:', err)
    mainWindow?.webContents.send('update:error', err.message)
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

  // 디버깅을 위한 로그 추가
  log.info('autoUpdater 초기화 완료')
  log.info('현재 앱 버전:', app.getVersion())
  log.info('업데이트 피드 URL:', autoUpdater.getFeedURL())
}

// 업데이트 확인 함수
export async function checkForUpdates(): Promise<void> {
  try {
    log.info('업데이트 확인 시작')
    await autoUpdater.checkForUpdates()
  } catch (error) {
    log.error('업데이트 확인 중 오류:', error)
  }
}

// 개발 환경에서 테스트를 위한 코드
if (process.env.NODE_ENV === 'development') {
  autoUpdater.forceDevUpdateConfig = true
  autoUpdater.checkForUpdates().catch((err) => {
    log.error('업데이트 확인 중 오류 발생:', err)
  })
}

// 주기적으로 업데이트 확인 (예: 1시간마다)
setInterval(
  () => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('업데이트 확인 중 오류 발생:', err)
    })
  },
  60 * 60 * 1000
)
