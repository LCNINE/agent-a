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
  autoUpdater.logger = log
  // autoUpdater.logger.transports.file.level = 'info'

  autoUpdater.on('checking-for-update', () => {
    log.info('업데이트 확인 중...')
    mainWindow?.webContents.send('update-checking')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('업데이트가 감지되었습니다.', info)
    // 렌더러 프로세스에 업데이트 가능 이벤트 전송
    mainWindow?.webContents.send('update_available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    log.info('현재 최신 버전입니다.', info)
    mainWindow?.webContents.send('update_not_available', info)
  })

  autoUpdater.on('error', (err) => {
    log.error('업데이트 중 오류 발생:', err)
    mainWindow?.webContents.send('update_error', err)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `다운로드 속도: ${progressObj.bytesPerSecond} B/s - ` +
                       `진행률: ${progressObj.percent.toFixed(2)}% (${progressObj.transferred}/${progressObj.total})`
    log.info(logMessage)
    mainWindow?.webContents.send('download_progress', progressObj)
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('업데이트 다운로드 완료:', info)
    // 렌더러에 다운로드 완료 이벤트 전송 (예: 업데이트 버튼을 "재시작 후 설치"로 변경)
    mainWindow?.webContents.send('update_downloaded', info)
  })

  // 렌더러 프로세스에서 'start_update' 메시지를 받으면 업데이트 실행
  ipcMain.on('start_update', () => {
    // 필요에 따라 업데이트 진행 상황을 별도의 창이나 모달로 표시할 수 있습니다.
    autoUpdater.quitAndInstall()
  })
}

// 업데이트 확인 함수
export function checkForUpdates(): void {
  autoUpdater.checkForUpdatesAndNotify()
}
