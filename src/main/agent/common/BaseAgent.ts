// src/main/agent/common/BaseAgent.ts
import { Browser, Page, BrowserContext } from 'playwright'
import Anthropic from '@anthropic-ai/sdk'
import { AgentConfig } from '../../..'
import { startBrowser } from './browser'
import { log } from 'electron-log'

export abstract class BaseAgent {
  protected context: BrowserContext | null = null
  // protected browser: Browser | null = null
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
    // try {
    //   this.browser = await startBrowser(this.config.credentials)  
      
    //   if (!this.browser) throw new Error('브라우저 시작 실패 여기다')
    //   this.page = await this.browser.newPage()
    // } catch (error) {
    //   throw new Error(`Failed to initialize browser: ${(error as Error).message}`)
    // }
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