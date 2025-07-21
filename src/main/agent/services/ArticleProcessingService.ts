import { Locator, Page } from 'playwright'
import { smoothScrollToElement, navigateToHome } from '../common/browserUtils'
import { chooseRandomSleep, scrollDelays, wait } from '../common/timeUtils'
import { AgentConfig } from '../../..'

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
  private config: AgentConfig

  constructor(
    page: Page,
    articleProcessor: ArticleProcessor,
    options: Partial<ScrollOptions>,
    workCount: number,
    config: AgentConfig
  ) {
    this.page = page
    this.articleProcessor = articleProcessor
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
    this.workCount = workCount
    this.config = config

    if (this.workCount > 0) {
      this.options.maxArticles = this.workCount
      console.log(`ArticleProcessingService가 최대 ${this.workCount}개의 게시물을 처리합니다`)
    }
  }

  async processArticles(): Promise<void> {
    this.shouldStop = false
    this.processed = false
    this.successCount = 0

    // 시작할 때 이전에 숨겨진 요소들 초기화
    await this.page.evaluate(() => {
      document.querySelectorAll('article[style*="display: none"]').forEach((el) => {
        ;(el as HTMLElement).style.display = ''
      })
    })

    let noArticlesRetryCount = 0
    const maxRetries = 3

    while (!this.shouldStop && this.successCount < this.options.maxArticles) {
      const articleLoc = await this.page.locator('article:not([style*="display: none"])').first()

      // 요소가 존재하는지 확인
      const isVisible = await articleLoc.isVisible().catch(() => false)
      if (!isVisible) {
        console.log('현재 화면에 표시할 게시물이 없습니다.')
        
        // 최대 재시도 횟수에 도달하지 않았다면 홈으로 이동 후 다시 시도
        if (noArticlesRetryCount < maxRetries) {
          noArticlesRetryCount++
          console.log(`홈으로 이동 후 피드를 새로고침합니다. (시도: ${noArticlesRetryCount}/${maxRetries})`)
          await navigateToHome(this.page)
          await this.page.waitForTimeout(3000) // 피드 로딩 대기
          continue
        } else {
          console.log(`최대 재시도 횟수(${maxRetries})에 도달했습니다. 피드 처리를 종료합니다.`)
          break
        }
      }

      // 피드를 찾았으면 재시도 카운터 초기화
      noArticlesRetryCount = 0

      const articleElementHandle = await articleLoc.elementHandle()
      if (articleElementHandle == null) {
        console.log('[processArticles] articleElementHandle is null')

        await this.page.waitForTimeout(1000)
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
      } finally {
        if (this.processed) {
          this.successCount++

          // 댓글 작성 성공 후 대기
          console.log(`댓글 작성 완료. ${this.config.postIntervalSeconds * 1000}초 대기 중...`)
          await wait(this.config.postIntervalSeconds * 1000)
        }
      }

      await this.page.waitForTimeout(1000)

      // 요소를 화면에서 숨기기
      await this.page.evaluate((articleEl) => {
        if (articleEl) {
          articleEl.style.display = 'none'
        }
      }, articleElementHandle)

      await this.page.waitForTimeout(500)
    }

    console.log('작업종료:', this.successCount, this.options.maxArticles)
    console.log(`처리된 게시물: ${this.successCount}개`)
  }
}
