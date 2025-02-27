import { Locator, Page } from 'playwright'
import { AgentConfig } from '../../..'
import { smoothScrollToElement } from '../common/browserUtils'
import { chooseRandomSleep, scrollDelays, wait } from '../common/timeUtils'

type ArticleProcessor = (article: Locator, articleId: string) => Promise<boolean>

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
  private config: AgentConfig
  private processedArticles: Set<string> = new Set()
  private shouldStop: boolean = false
  private processed: boolean = false

  constructor(
    page: Page,
    articleProcessor: ArticleProcessor,
    options: Partial<ScrollOptions>,
    config: AgentConfig
  ) {
    this.page = page
    this.articleProcessor = articleProcessor
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
    this.config = config

    if (config.workCount && config.workCount > 0) {
      this.options.maxArticles = config.workCount
      console.log(`ArticleProcessingService가 최대 ${config.workCount}개의 게시물을 처리합니다`)
    }
  }

  async processArticles(): Promise<void> {
    this.shouldStop = false
    this.processed = false
    this.processedArticles.clear()

    while (true) {
      const articleLocators = await this.page.locator('article').all()

      if (articleLocators.length === 0) {
        console.log('더 이상 처리할 게시물이 없습니다.')
        break
      }

      for (const articleLoc of articleLocators) {
        // 최대 처리 수에 도달했는지 확인
        if (this.processedArticles.size >= this.options.maxArticles) {
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

        const articleId = await this.ensureArticleId(
          articleLoc,
          'data-article-id',
          this.processedArticles.size
        )
        if (this.processedArticles.has(articleId)) continue

        await smoothScrollToElement(this.page, articleElementHandle)
        await chooseRandomSleep(scrollDelays)

        const delay =
          Math.random() * (this.options.processingDelay.max - this.options.processingDelay.min) +
          this.options.processingDelay.min
        await this.page.waitForTimeout(delay)

        try {
          this.processed = await this.articleProcessor(articleLoc, articleId)
        } catch (error) {
          console.error(
            `Article processing failed: ${error instanceof Error ? error.message : String(error)}`
          )
          continue
        } finally {
          // 실제로 처리에 성공한 경우에만 카운트에 추가
          if (this.processed) {
            this.processedArticles.add(articleId)
          }
          await wait(this.config.postIntervalSeconds * 1000)
        }
      }

      if (this.shouldStop) {
        break
      }

      await this.page.waitForTimeout(1000)
    }

    console.log('작업종료:', this.processedArticles.size, this.options.maxArticles)
    console.log(`처리된 게시물: ${this.processedArticles.size}개`)
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
