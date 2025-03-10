import { Locator, Page } from 'playwright'
import { AgentConfig } from '../../..'
import { smoothScrollToElement } from '../common/browserUtils'
import { chooseRandomSleep, majorActionDelays, scrollDelays, wait } from '../common/timeUtils'

type HashtagProcessor = (hashtag: Locator, articleId: string) => Promise<boolean>

interface ScrollOptions {
  maxPosts: number
  scrollDelay: number
  scrollDistance: number
  processingDelay: {
    min: number
    max: number
  }
}

const DEFAULT_OPTIONS: ScrollOptions = {
  maxPosts: Infinity,
  scrollDelay: 100,
  scrollDistance: 100,
  processingDelay: {
    min: 500,
    max: 1000
  }
}

export class HashtagService {
  private page: Page
  private hashtagProcessor: HashtagProcessor
  private options: ScrollOptions
  private config: AgentConfig
  private processedPosts: Set<string> = new Set()
  private shouldStop: boolean = false
  private processed: boolean = false
  private idCounter: number = 0

  constructor(
    page: Page,
    hashtagProcessor: HashtagProcessor,
    options: Partial<ScrollOptions>,
    config: AgentConfig
  ) {
    this.page = page
    this.hashtagProcessor = hashtagProcessor
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
    this.config = config

    if (config.workCount && config.workCount > 0) {
      this.options.maxPosts = config.workCount
      console.log(`HashtagService가 최대 ${config.workCount}개의 게시물을 처리합니다`)
    }
  }

  async processHashtag(tag: string): Promise<void> {
    // 해시태그 검색 및 페이지 이동
    await this.searchHashtag(tag)

    this.shouldStop = false
    this.processed = false
    this.processedPosts.clear()
    this.idCounter = 0

    while (true) {
      const postLocators = await this.page.locator('a[role="link"][tabindex="0"]').all()

      if (postLocators.length === 0) {
        console.log('더 이상 처리할 게시물이 없습니다.')
        break
      }

      for (const postLoc of postLocators) {
        // 최대 처리 수에 도달했는지 확인
        if (this.processedPosts.size >= this.options.maxPosts) {
          console.log(`최대 게시물 수(${this.options.maxPosts})에 도달했습니다. 작업을 종료합니다.`)
          this.shouldStop = true
          break
        }

        const postElementHandle = await postLoc.elementHandle()
        if (postElementHandle == null) {
          console.log('[processHashtag] postElementHandle is null')
          continue
        }

        const articleId = await this.ensureArticleId(postLoc, 'data-articleId', this.idCounter)
        if (this.processedPosts.has(articleId)) continue

        await smoothScrollToElement(this.page, postElementHandle)
        await chooseRandomSleep(scrollDelays)

        const delay =
          Math.random() * (this.options.processingDelay.max - this.options.processingDelay.min) +
          this.options.processingDelay.min
        await this.page.waitForTimeout(delay)

        try {
          this.processed = await this.hashtagProcessor(postLoc, articleId)
        } catch (error) {
          console.error(
            `Hashtag processing failed: ${error instanceof Error ? error.message : String(error)}`
          )
          continue
        } finally {
          // 실제로 댓글을 작성한 경우에만 카운트에 추가
          if (this.processed) {
            this.processedPosts.add(articleId)
          }
          // 처리 시도 후 카운터 증가 (성공 여부와 관계없이)
          this.idCounter++
          await wait(this.config.postIntervalSeconds * 1000)
        }
      }

      if (this.shouldStop) {
        break
      }

      await this.page.waitForTimeout(1000)
    }

    console.log('작업종료:', this.processedPosts.size, this.options.maxPosts)
    console.log(`처리된 게시물: ${this.processedPosts.size}개`)
  }

  async searchHashtag(tag: string): Promise<void> {
    try {
      console.log('검색 메뉴 찾는 중...')

      await this.page.waitForSelector('a:has(span:text-matches("검색|search", "i"))', {
        timeout: 5000
      })

      const searchMenu = this.page.locator('a', {
        has: this.page.locator('span', {
          hasText: /검색|search/i
        }),
        hasText: /검색|search/i
      })

      await searchMenu.click()
      await this.page.waitForTimeout(2000)

      await this.page.waitForSelector(
        'input[placeholder*="검색" i], input[placeholder*="search" i]',
        {
          timeout: 5000
        }
      )
      const searchInput = this.page.getByPlaceholder(/검색|search/i)
      await searchInput.pressSequentially(`#${tag}`, { delay: 100 })

      await this.page.waitForTimeout(2000)

      await this.page.waitForSelector(`text="#${tag}"`, {
        timeout: 5000
      })
      const hashtagElement = this.page.getByText(`#${tag}`, { exact: true })
      await hashtagElement.click()

      await this.page.waitForTimeout(3000)
    } catch (error) {
      console.error(
        '해시태그 검색 중 오류 발생:',
        error instanceof Error ? error.message : String(error)
      )
      throw error
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
