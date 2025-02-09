import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { USER_DATA_DIR } from "./auth";
import { LoginCredentials } from "../../..";

export async function startBrowser(credentials: LoginCredentials) {
  return await puppeteer.use(StealthPlugin()).launch({ 
    headless: false,
    userDataDir: USER_DATA_DIR(credentials.username),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ]
  })
}