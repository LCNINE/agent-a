import { Browser, Page } from 'puppeteer'
import Anthropic from '@anthropic-ai/sdk'
import { AgentConfig } from '../../..'
import { startBrowser } from './browser'

export abstract class BaseAgent {
  protected browser: Browser | null = null
  protected page: Page | null = null
  protected isLoggedIn = false
  protected config: AgentConfig
  protected anthropic: Anthropic

  constructor(config: AgentConfig) {
    this.config = config
    this.anthropic = new Anthropic({
      apiKey: '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'
    })
  }

  async initialize() {
    try {
      this.browser = await startBrowser(this.config.credentials)
      this.page = await this.browser.newPage()
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    } catch (error) {
      throw new Error(`Failed to initialize browser: ${(error as Error).message}`)
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
    this.isLoggedIn = false
  }
} 