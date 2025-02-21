import { chromium, Page, ElementHandle } from 'playwright'
import { smoothScrollToElement } from '../common/browserUtils'

type ArticleProcessor = (article: ElementHandle) => Promise<void>

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
      ...options,
    }
  }

  async processArticles() {
    while (true) {
      const articles = await this.page.$$('article')
      
      if (articles.length === 0 || this.processedArticles.size >= this.options.maxArticles) {
        console.log(`Processed ${this.processedArticles.size} articles`)
        break
      }
      
      for (const article of articles) {
        const articleId = await this.ensureArticleId(this.page, article, "data-article-id", this.processedArticles.size)
        
        if (this.processedArticles.has(articleId)) continue
        
        await smoothScrollToElement(this.page, article)
        
        const delay = Math.random() * 
          (this.options.processingDelay.max - this.options.processingDelay.min) + 
          this.options.processingDelay.min
        await this.page.waitForTimeout(delay)
        
        try {
          await this.articleProcessor(article)
          
          this.processedArticles.add(articleId)
        } catch (error) {
          console.error(`articleProcessor 실행 실패: ${error instanceof Error ? error.message : String(error)}`)
          continue
        }
      }
      
      await this.page.waitForTimeout(1000)
    }
  }


  private async ensureArticleId(
    page: Page,
    article: ElementHandle,
    idAttribute: string,
    currentCount: number
  ): Promise<string> {
    const existingId = await article.getAttribute(idAttribute)
    if (existingId) return existingId
  
    const newId = `article-${currentCount}`
    await page.evaluate(
      ({ element, idAttribute, newId }) => {
        (element as HTMLElement).setAttribute(idAttribute, newId)
      },
      { element: article, idAttribute, newId }
    )
    console.log(`${newId}번 할당함`)
    return newId
  }
}
