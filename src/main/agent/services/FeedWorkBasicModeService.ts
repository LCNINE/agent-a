import { Locator, Page } from 'playwright'
import { AgentConfig } from '../../..'
import { smoothScrollToElement } from '../common/browserUtils'
import { chooseRandomSleep, scrollDelays, wait } from '../common/timeUtils'

type BasicModeProcessor = (article: Locator, articleId: string) => Promise<boolean>

interface ScrollOptions {
  maxFeeds: number
  scrollDelay: number
  scrollDistance: number
  processingDelay: {
    min: number
    max: number
  }
}

const DEFAULT_OPTIONS: ScrollOptions = {
  maxFeeds: Infinity,
  scrollDelay: 100,
  scrollDistance: 100,
  processingDelay: {
    min: 500,
    max: 1000
  }
}

export class FeedWorkBasicModeService {
  private page: Page
  private basicModeProcessor: BasicModeProcessor
  private options: ScrollOptions
  private config: AgentConfig
  private processedArticles: Set<string> = new Set()
  private shouldStop: boolean = false
  private processed: boolean = false

  constructor(
    page: Page,
    basicModeProcessor: BasicModeProcessor,
    options: Partial<ScrollOptions>,
    config: AgentConfig
  ) {
    this.page = page
    this.basicModeProcessor = basicModeProcessor
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
    this.config = config

    if (config.workCount && config.workCount > 0) {
      this.options.maxFeeds = config.workCount
      console.log(`FeedWorkBasicModeService 최대 ${config.workCount}개의 작업을 처리합니다`)
    }
  }

  async processFeeds(): Promise<void> {
    await this.moveToMyFeed()

    this.shouldStop = false
    this.processed = false
    this.processedArticles.clear()

    while (true) {
      const feedLocators = await this.page.locator('a[role="link"][tabindex="0"]`').all()

      if (feedLocators.length === 0) {
        console.log('더 이상 처리할 게시물이 없습니다.')
        break
      }

      for (const feedLoc of feedLocators) {
        // 최대 처리 수에 도달했는지 확인
        if (this.processedArticles.size >= this.options.maxFeeds) {
          console.log(`최대 작업업 수(${this.options.maxFeeds})에 도달했습니다. 작업을 종료합니다.`)
          this.shouldStop = true
          break
        }

        const feedElementHandle = await feedLoc.elementHandle()
        if (feedElementHandle == null) {
          console.log('[processArticles] articleElementHandle is null')
          continue
        }

        const feedId = await this.ensureArticleId(
          feedLoc,
          'data-article-id',
          this.processedArticles.size
        )
        if (this.processedArticles.has(feedId)) continue

        await smoothScrollToElement(this.page, feedElementHandle)
        await chooseRandomSleep(scrollDelays)

        const delay =
          Math.random() * (this.options.processingDelay.max - this.options.processingDelay.min) +
          this.options.processingDelay.min
        await this.page.waitForTimeout(delay)

        try {
          this.processed = await this.basicModeProcessor(feedLoc, feedId)
        } catch (error) {
          console.error(
            `Feed processing failed: ${error instanceof Error ? error.message : String(error)}`
          )
          continue
        } finally {
          // 실제로 처리에 성공한 경우에만 카운트에 추가
          if (this.processed) {
            this.processedArticles.add(feedId)
          }
          await wait(this.config.postIntervalSeconds * 1000)
        }
      }

      if (this.shouldStop) {
        break
      }

      await this.page.waitForTimeout(1000)
    }

    console.log('작업종료:', this.processedArticles.size, this.options.maxFeeds)
    console.log(`처리된 게시물: ${this.processedArticles.size}개`)
  }

  async moveToMyFeed() {
    try {
      await this.page.goto(`https://www.instagram.com/${this.config.credentials.username}`)
      await this.page.waitForTimeout(3000)
    } catch (error) {
      console.error(
        `프로필 페이지 이동 실패: ${error instanceof Error ? error.message : String(error)}`
      )
      throw new Error('인스타그램 프로필 페이지로 이동할 수 없습니다.')
    }
  }

  private async ensureArticleId(
    articleLoc: Locator,
    idAttribute: string,
    currentCount: number
  ): Promise<string> {
    const existingId = await articleLoc.getAttribute(idAttribute)
    if (existingId) return existingId

    const newId = `article-${currentCount}`

    await articleLoc.evaluate(
      async (element, { idAttribute, newId }) => {
        element.setAttribute(idAttribute, newId)
      },
      { idAttribute, newId }
    )
    console.log(`${newId}번 할당함`)
    return newId
  }
}
