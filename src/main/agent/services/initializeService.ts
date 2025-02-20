// src/main/agent/services/initializeService.ts

import { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { LoginService } from './loginService'

export class InitializeService {
  private browser: Browser | null = null
  private page: Page | null = null
  private loginService: LoginService | null = null

  async initialize() {
    try {
      this.browser = await chromium.launch({
        headless: false
      })
      
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 }
      })
      
      this.page = await context.newPage()
      this.loginService = new LoginService(this.page)

      return {
        browser: this.browser,
        page: this.page,
        loginService: this.loginService
      }
    } catch (error) {
      throw new Error(`브라우저 초기화 실패: ${(error as Error).message}`)
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
    }
  }
}
