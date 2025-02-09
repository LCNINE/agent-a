import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import exposeContexts from './context-exposer'


if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    exposeContexts()
  } catch (error) {
    console.error(error)
  }
} 
