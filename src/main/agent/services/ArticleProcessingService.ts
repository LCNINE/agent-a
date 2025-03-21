import { Locator, Page } from 'playwright'
import { smoothScrollToElement } from '../common/browserUtils'
import { chooseRandomSleep, scrollDelays } from '../common/timeUtils'

type ArticleProcessor = (article: Locator) => Promise<boolean>

interface ScrollOptions {
  maxArticles: number
  scrollDelay: number
  scrollDistance: number
  processingDelay: {
    min: number
    max: number
  }
}

const DEFAULT_OPTIONS: ScrollOptions = {
  maxArticles: Infinity,
  scrollDelay: 100,
  scrollDistance: 100,
  processingDelay: {
    min: 500,
    max: 1000
  }
}

export class ArticleProcessingService {
  private page: Page
  private articleProcessor: ArticleProcessor
  private options: ScrollOptions
  private workCount: number
  private shouldStop: boolean = false
  private processed: boolean = false
  private successCount: number = 0

  constructor(
    page: Page,
    articleProcessor: ArticleProcessor,
    options: Partial<ScrollOptions>,
    workCount: number
  ) {
    this.page = page
    this.articleProcessor = articleProcessor
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
    this.workCount = workCount

    if (this.workCount > 0) {
      this.options.maxArticles = this.workCount
      console.log(`ArticleProcessingService가 최대 ${this.workCount}개의 게시물을 처리합니다`)
    }
  }

  async processArticles(): Promise<void> {
    this.shouldStop = false
    this.processed = false
    this.successCount = 0

    while (true) {
      const articleLocators = await this.page.locator('article').all()

      if (articleLocators.length === 0) {
        console.log('더 이상 처리할 게시물이 없습니다.')
        break
      }

      for (const articleLoc of articleLocators) {
        // 최대 처리 수에 도달했는지 확인
        if (this.successCount >= this.options.maxArticles) {
          console.log(
            `최대 게시물 수(${this.options.maxArticles})에 도달했습니다. 작업을 종료합니다.`
          )
          this.shouldStop = true
          break
        }

        const articleElementHandle = await articleLoc.elementHandle()
        if (articleElementHandle == null) {
          console.log('[processArticles] articleElementHandle is null')
          continue
        }

        await smoothScrollToElement(this.page, articleElementHandle)
        await chooseRandomSleep(scrollDelays)

        const delay =
          Math.random() * (this.options.processingDelay.max - this.options.processingDelay.min) +
          this.options.processingDelay.min
        await this.page.waitForTimeout(delay)

        try {
          this.processed = await this.articleProcessor(articleLoc)
        } catch (error) {
          console.error(
            `Article processing failed: ${error instanceof Error ? error.message : String(error)}`
          )
          continue
        } finally {
          if (this.processed) {
            this.successCount++
          }
        }
      }

      if (this.shouldStop) {
        break
      }

      await this.page.waitForTimeout(1000)
    }

    console.log('작업종료:', this.successCount, this.options.maxArticles)
    console.log(`처리된 게시물: ${this.successCount}개`)
  }
}
