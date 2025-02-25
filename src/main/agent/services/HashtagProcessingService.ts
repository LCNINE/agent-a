import { Locator, Page } from 'playwright'
import { chooseRandomSleep, majorActionDelays, scrollDelays, waitRandom } from '../common/timeUtils'
import { expect } from '@playwright/test'
import { smoothScrollToElement } from '../common/browserUtils'

type HashtagProcessor = (hashtag: Locator, articleId: string) => Promise<void>

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
  private processedPosts: Set<string> = new Set()

  constructor(page: Page, hashtagProcessor: HashtagProcessor, options: Partial<ScrollOptions>) {
    this.page = page
    this.hashtagProcessor = hashtagProcessor
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
  }

  async processHashtag(tag: string): Promise<void> {
    // 해시태그 검색 및 페이지 이동
    await this.searchHashtag(tag)

    while (true) {
      const postLocators = await this.page.locator('a[role="link"][tabindex="0"]').all()

      if (postLocators.length === 0 || this.processedPosts.size >= this.options.maxPosts) {
        console.log(`Processed: ${this.processedPosts.size} posts`)
        break
      }

      for (const postLoc of postLocators) {
        const postElementHandle = await postLoc.elementHandle()
        if (postElementHandle == null) {
          console.log('[processHashtag] postElementHandle is null')
          continue
        }

        const articleId = await this.ensureArticleId(
          postLoc,
          'data-articleId',
          this.processedPosts.size
        )
        if (this.processedPosts.has(articleId)) continue

        await smoothScrollToElement(this.page, postElementHandle)
        await chooseRandomSleep(scrollDelays)

        const delay =
          Math.random() * (this.options.processingDelay.max - this.options.processingDelay.min) +
          this.options.processingDelay.min
        await this.page.waitForTimeout(delay)

        try {
          await this.hashtagProcessor(postLoc, articleId)
        } catch (error) {
          console.error(
            `Hashtag processing failed: ${error instanceof Error ? error.message : String(error)}`
          )
          continue
        } finally {
          this.processedPosts.add(articleId)
          await chooseRandomSleep(majorActionDelays)
        }
      }
      await this.page.waitForTimeout(1000)
    }
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

      await searchInput.fill(`#${tag}`)
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
