import { chromium, Page, ElementHandle, Locator } from 'playwright'
import { smoothScrollToElement } from '../common/browserUtils'
import { chooseRandomSleep, majorActionDelays, postInteractionDelays } from '../common/timeUtils'

type ArticleProcessor = (article: Locator) => Promise<void>

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
  private processedArticles: Set<string> = new Set()

  constructor(page: Page, articleProcessor: ArticleProcessor, options: Partial<ScrollOptions>) {
    this.page = page
    this.articleProcessor = articleProcessor
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
  }

  async processArticles() {
    while (true) {
      const articleLocators = await this.page.locator('article').all()

      if (articleLocators.length === 0 || this.processedArticles.size >= this.options.maxArticles) {
        console.log(`Processed ${this.processedArticles.size} articles`)
        break
      }

      for (const articleLoc of articleLocators) {
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

        const delay =
          Math.random() * (this.options.processingDelay.max - this.options.processingDelay.min) +
          this.options.processingDelay.min
        await this.page.waitForTimeout(delay)

        try {
          await this.articleProcessor(articleLoc)
        } catch (error) {
          console.error(
            `articleProcessor 실행 실패: ${error instanceof Error ? error.message : String(error)}`
          )
          continue
        } finally {
          this.processedArticles.add(articleId)
          chooseRandomSleep(majorActionDelays)
        }
      }

      await this.page.waitForTimeout(1000)
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
