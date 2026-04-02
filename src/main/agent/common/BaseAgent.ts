// src/main/agent/common/BaseAgent.ts
import { Page, BrowserContext } from 'playwright'
import { AgentConfig } from '../../..'
import { startBrowser } from './browser'

export abstract class BaseAgent {
  protected context: BrowserContext | null = null
  protected page: Page | null = null
  protected isLoggedIn = false
  protected config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
  }

  async initialize() {
    try {
      this.context = await startBrowser(this.config.credentials)
      if (!this.context) throw new Error('브라우저 시작 실패')
      this.page = await this.context.newPage()
    } catch (error) {
      throw new Error(`Failed to initialize browser: ${(error as Error).message}`)
    }
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close()
      this.context = null
      this.page = null
    }
    this.isLoggedIn = false
  }
}
