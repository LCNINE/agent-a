import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipcHandlers'
import { autoUpdater } from 'electron-updater'
import { setMainWindow } from './autoUpdater'
import ProgressBar from 'electron-progressbar'

let progressBar: any = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    },
    titleBarStyle: 'hidden'
  })

  registerIpcHandlers(mainWindow)
  setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    console.log('업데이트 확인 중...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('업데이트가 있습니다:', info)
    // 다이얼로그로 사용자 확인
    dialog
      .showMessageBox({
        type: 'info',
        title: '업데이트',
        message: '새로운 버전이 확인되었습니다. 설치 파일을 다운로드 하시겠습니까?',
        buttons: ['지금 설치', '나중에 설치']
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate()
        }
      })
  })

  autoUpdater.once('download-progress', () => {
    progressBar = new ProgressBar({
      text: '다운로드 중...'
    })

    progressBar
      .on('completed', () => {
        console.log('다운로드 완료')
      })
      .on('aborted', () => {
        console.log('다운로드 취소됨')
      })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('업데이트가 다운로드 되었습니다:', info)
    if (progressBar) {
      progressBar.setCompleted()
    }

    dialog
      .showMessageBox({
        type: 'info',
        title: '업데이트',
        message: '새로운 버전이 다운로드 되었습니다. 다시 시작하시겠습니까?',
        buttons: ['예', '아니오']
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true)
        }
      })
  })

  autoUpdater.on('error', (err) => {
    console.error('업데이트 중 오류 발생:', err)
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('update-error', err)
    })
  })

  // 초기 업데이트 확인
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('초기 업데이트 확인 중 오류 발생:', err)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  setupAutoUpdater()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
