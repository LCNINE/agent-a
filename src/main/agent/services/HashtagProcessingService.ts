import { Locator, Page } from 'playwright'
import { chooseRandomSleep, majorActionDelays, scrollDelays, waitRandom } from '../common/timeUtils'
import { expect } from '@playwright/test'
import { smoothScrollToElement } from '../common/browserUtils'

type HashtagProcessor = (hashtag: Locator) => Promise<void>

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
        if (!postElementHandle) {
          console.log('[processArticles] articleElementHandle is null')
          continue
        }

        const postId = await this.ensurePostId(postLoc, 'data-post-id', this.processedPosts.size)

        if (this.processedPosts.has(postId)) continue

        await smoothScrollToElement(this.page, postElementHandle)
        // await chooseRandomSleep(scrollDelays) // 테스트로 일단 아래 delay코드 해보고 주석 풀어보기

        const delay =
          Math.random() * (this.options.processingDelay.max - this.options.processingDelay.min) +
          this.options.processingDelay.min
        await this.page.waitForTimeout(delay)

        try {
          await this.hashtagProcessor(postLoc)
        } catch (error) {
          console.error(
            `Hashtag processing failed: ${error instanceof Error ? error.message : String(error)}`
          )
          continue
        } finally {
          this.processedPosts.add(postId)
          await chooseRandomSleep(majorActionDelays)
        }
      }
      await this.page.waitForTimeout(1000)
    }
  }

  async searchHashtag(tag: string): Promise<void> {
    // 검색 메뉴 클릭
    const searchMenu = this.page.locator('a', {
      has: this.page.locator('span', {
        hasText: /검색|search/i
      }),
      hasText: /검색|search/i
    })

    if (!searchMenu) throw Error("I can't find the search menu.")
    await searchMenu.click()
    await waitRandom(500, 0.2)

    // 검색어 입력
    const searchInput = this.page.getByPlaceholder(/검색|search/i)
    if (!searchInput) throw Error("I can't find the search input.")
    await searchInput.type(`#${tag}`, { delay: 50 })
    await waitRandom(3000, 0.2)

    // 검색 결과 클릭
    const hashtagElement = this.page.getByText(`#${tag}`, { exact: true })
    if (!hashtagElement) throw Error('Hashtag element not found')
    await hashtagElement.click()

    await chooseRandomSleep(majorActionDelays)
  }

  private async ensurePostId(
    postLoc: Locator,
    idAttribute: string,
    currentCount: number
  ): Promise<string> {
    const existingId = await postLoc.getAttribute(idAttribute)
    if (existingId) return existingId

    const newId = `post-${currentCount}`
    await postLoc.evaluate(
      (element, { idAttribute, newId }) => {
        element.setAttribute(idAttribute, newId)
      },
      { idAttribute, newId }
    )
    console.log(`${newId} ok`)
    return newId
  }
}
