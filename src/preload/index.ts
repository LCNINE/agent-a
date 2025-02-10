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
  } catch (error) {
    console.error(error)
  }
}
