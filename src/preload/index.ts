import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import exposeContexts from './context-exposer'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    exposeContexts()
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        on: (channel: string, func: (...args: any[]) => void) => {
          ipcRenderer.on(channel, (event, ...args) => func(...args))
        },
        send: (channel: string, ...args: any[]) => {
          ipcRenderer.send(channel, ...args)
        }
      }
    })
    contextBridge.exposeInMainWorld('update', {
      onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => {
        ipcRenderer.on('update:available', (_event, info) => callback(info))
      },
      onUpdateNotAvailable: (callback: () => void) => {
        ipcRenderer.on('update:not-available', () => callback())
      },
      onDownloadProgress: (callback: (progress: { percent: number }) => void) => {
        ipcRenderer.on('update:download-progress', (_event, progress) => callback(progress))
      },
      onUpdateDownloaded: (callback: () => void) => {
        ipcRenderer.on('update:downloaded', () => callback())
      },
      startDownload: () => ipcRenderer.invoke('update:start-download'),
      installUpdate: () => ipcRenderer.invoke('update:install')
    })
  } catch (error) {
    console.error('preload index error: ', error)
  }
}
