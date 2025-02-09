import { contextBridge, ipcRenderer } from 'electron'

const WIN_MINIMIZE_CHANNEL = "window:minimize";
const WIN_MAXIMIZE_CHANNEL = "window:maximize";
const WIN_CLOSE_CHANNEL = "window:close";

function exposeWindowContext() {
  contextBridge.exposeInMainWorld("electronWindow", {
    minimize: () => ipcRenderer.invoke(WIN_MINIMIZE_CHANNEL),
    maximize: () => ipcRenderer.invoke(WIN_MAXIMIZE_CHANNEL),
    close: () => ipcRenderer.invoke(WIN_CLOSE_CHANNEL),
  });
}


const THEME_MODE_CURRENT_CHANNEL = "theme-mode:current";
const THEME_MODE_TOGGLE_CHANNEL = "theme-mode:toggle";
const THEME_MODE_DARK_CHANNEL = "theme-mode:dark";
const THEME_MODE_LIGHT_CHANNEL = "theme-mode:light";
const THEME_MODE_SYSTEM_CHANNEL = "theme-mode:system";

function exposeThemeContext() {
  contextBridge.exposeInMainWorld("themeMode", {
    current: () => ipcRenderer.invoke(THEME_MODE_CURRENT_CHANNEL),
    toggle: () => ipcRenderer.invoke(THEME_MODE_TOGGLE_CHANNEL),
    dark: () => ipcRenderer.invoke(THEME_MODE_DARK_CHANNEL),
    light: () => ipcRenderer.invoke(THEME_MODE_LIGHT_CHANNEL),
    system: () => ipcRenderer.invoke(THEME_MODE_SYSTEM_CHANNEL),
  });
}


const AGENT_START_CHANNEL = "agent:start";
const AGENT_STOP_CHANNEL = "agent:stop";
const AGENT_STATUS_CHANNEL = "agent:status";

function exposeAgentContext() {
  contextBridge.exposeInMainWorld("agent", {
    start: (params: any/*StartAgentParams*/) => 
      ipcRenderer.invoke(AGENT_START_CHANNEL, params),
    stop: () => 
      ipcRenderer.invoke(AGENT_STOP_CHANNEL),
    getStatus: () => 
      ipcRenderer.invoke(AGENT_STATUS_CHANNEL),
  });
}



export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeAgentContext();
}
