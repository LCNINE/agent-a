import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, shell } from 'electron'
import ProgressBar from 'electron-progressbar'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { setMainWindow } from './autoUpdater'
import { registerIpcHandlers } from './ipcHandlers'

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

  let updateInProgress = false

  const checkInternetConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('https://api.github.com', {
        method: 'HEAD',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      console.error('인터넷 연결 확인 중 오류:', error)
      return false
    }
  }

  autoUpdater.on('checking-for-update', () => {
    console.log('업데이트 확인 중...')
  })

  autoUpdater.on('update-available', (info) => {
    dialog
      .showMessageBox({
        type: 'info',
        title: '업데이트 확인',
        message: '새로운 버전이 있습니다. 지금 다운로드 하시겠습니까?',
        buttons: ['지금 설치', '나중에']
      })
      .then((result) => {
        if (result.response === 0) {
          // 즉시 다운로드 시작
          autoUpdater.downloadUpdate()

          // 프로그레스바 표시
          if (!progressBar) {
            progressBar = new ProgressBar({
              title: '업데이트 다운로드 중...'
            })
          }
        }
      })
  })

  autoUpdater.once('download-progress', () => {
    if (progressBar) return

    progressBar = new ProgressBar({
      text: '다운로드 중...',
      detail: '업데이트를 다운로드하고 있습니다...'
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('업데이트가 다운로드 되었습니다:', info)
    if (progressBar) {
      progressBar.setCompleted()
      progressBar = null
    }

    dialog
      .showMessageBox({
        type: 'info',
        title: '업데이트 준비 완료',
        message: '새로운 버전이 설치 준비되었습니다. 지금 재시작하시겠습니까?',
        detail: '재시작 후 자동으로 업데이트가 적용됩니다.',
        buttons: ['재시작', '나중에']
      })
      .then((result) => {
        if (result.response === 0) {
          setImmediate(() => {
            app.removeAllListeners('window-all-closed')
            autoUpdater.quitAndInstall(false, true)
          })
        }
      })
  })

  autoUpdater.on('error', (err) => {
    updateInProgress = false
    if (progressBar) {
      progressBar.close()
      progressBar = null
    }

    console.error('업데이트 중 오류 발생:', err)

    // 인터넷 연결 관련 오류인지 확인
    const errorMessage = err.message.toLowerCase()
    const isNetworkError =
      errorMessage.includes('network') ||
      errorMessage.includes('internet') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('unable to find') ||
      errorMessage.includes('disconnected') ||
      errorMessage.includes('enotfound')

    if (isNetworkError) {
      dialog.showMessageBox({
        type: 'info',
        title: '업데이트 확인 실패',
        message: '인터넷 연결을 확인해 주세요',
        detail:
          '인터넷 연결 문제로 업데이트를 확인할 수 없습니다. 네트워크 연결을 확인한 후 다시 시도해 주세요.',
        buttons: ['확인']
      })
    } else {
      // 다른 종류의 오류는 기존 방식대로 표시
      dialog.showErrorBox('업데이트 오류', '업데이트 중 오류가 발생했습니다.\n' + err.message)
    }
  })

  // 초기 업데이트 확인은 앱 시작 3초 후에 실행하되, 인터넷 연결 확인 후 실행
  setTimeout(async () => {
    const isConnected = await checkInternetConnection()
    if (isConnected) {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('초기 업데이트 확인 중 오류 발생:', err)
      })
    } else {
      console.log('인터넷 연결이 없어 업데이트 확인을 건너뜁니다.')
    }
  }, 3000)
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
