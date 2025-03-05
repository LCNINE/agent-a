import { Locator, Page } from 'playwright'
import { AgentConfig, Feed } from '../../..'
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
  private processedFeeds: Set<string> = new Set()
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

  async processFeeds(feeds: Feed[]): Promise<void> {
    if (feeds.length === 0) {
      console.log('활성화된 피드가 없습니다.')
      return
    }

    this.shouldStop = false
    this.processed = false
    this.processedFeeds.clear()

    while (true) {
      // const feedLocators = await this.page.getByRole('main', { name: 'main' }).all()
      // class="x78zum5 xdt5ytf x1iyjqo2"
      const feedLocators = await this.page
        .locator('div.x9f619.xjbqb8w.x78zum5.x168nmei')
        .filter({ has: this.page.locator('span[dir="auto"][class*="aco"][class*="aad7"]') })
        .all()

      if (feedLocators.length === 0) {
        console.log('더 이상 처리할 게시물이 없습니다.')
        break
      }

      for (const feedLoc of feedLocators) {
        console.log(await feedLoc.textContent())
        return
        // 최대 처리 수에 도달했는지 확인
        if (this.processedFeeds.size >= this.options.maxFeeds) {
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
          this.processedFeeds.size
        )
        if (this.processedFeeds.has(feedId)) continue

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
            this.processedFeeds.add(feedId)
          }
          await wait(this.config.postIntervalSeconds * 1000)
        }
      }

      if (this.shouldStop) {
        break
      }

      await this.page.waitForTimeout(1000)
    }

    console.log('작업종료:', this.processedFeeds.size, this.options.maxFeeds)
    console.log(`처리된 게시물: ${this.processedFeeds.size}개`)
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
