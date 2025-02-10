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
    mainWindow?.webContents.send('update-available', info)
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

  autoUpdater.on('update-downloaded', (info) => {
    log.info('업데이트 다운로드 완료:', info)
    mainWindow?.webContents.send('update-downloaded', info)
  })

  // 렌더러로부터 업데이트 설치 요청 받기
  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall()
  })
}

// 업데이트 확인 함수
export function checkForUpdates(): void {
  autoUpdater.checkForUpdatesAndNotify()
}
