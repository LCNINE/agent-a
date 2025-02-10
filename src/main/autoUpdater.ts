// src/main/autoUpdater.ts
import { BrowserWindow, ipcMain } from 'electron'
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
  autoUpdater.autoDownload = false // 자동 다운로드 비활성화
  autoUpdater.autoInstallOnAppQuit = true

  // 로깅 설정
  autoUpdater.logger = log
  log.transports.file.level = 'info'

  // 업데이트 이벤트 리스너 설정
  autoUpdater.on('checking-for-update', () => {
    log.info('업데이트 확인 중...')
    mainWindow?.webContents.send('update-checking')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('업데이트가 있습니다:', info)
    // 업데이트 확인 시 사용자에게 선택지 제공
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes
      })
    }
  })

  autoUpdater.on('update-not-available', (info) => {
    log.info('현재 최신 버전입니다:', info)
    mainWindow?.webContents.send('update-not-available', info)
  })

  autoUpdater.on('error', (err) => {
    log.error('업데이트 중 오류:', err)
    mainWindow?.webContents.send('update-error', err)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    const message = `다운로드 속도: ${progressObj.bytesPerSecond} - 진행률: ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`
    log.info(message)
    mainWindow?.webContents.send('download-progress', progressObj)
  })

  autoUpdater.on('update-downloaded', () => {
    log.info('업데이트 다운로드 완료')
    mainWindow?.webContents.send('update-downloaded')
  })

  // 사용자가 업데이트 다운로드를 승인했을 때
  ipcMain.on('start-update-download', () => {
    autoUpdater.downloadUpdate()
  })

  // 사용자가 업데이트 설치를 승인했을 때
  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

// 업데이트 확인 함수
export function checkForUpdates(): void {
  autoUpdater.checkForUpdatesAndNotify()
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
