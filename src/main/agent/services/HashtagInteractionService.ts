import { Locator, Page } from 'playwright-core'
import { AgentConfig } from '../../..'
import { chooseRandomSleep, wait } from '../common/timeUtils'
import { scrollDelays } from '../common/timeUtils'
import { smoothScrollToElement } from '../common/browserUtils'

type HashtagInteractionProcessor = (hashtag: Locator) => Promise<boolean>

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

export class HashtagInteractionService {
  private page: Page
  private hashtagInteractionProcessor: HashtagInteractionProcessor
  private shouldStop: boolean = false
  private processed: boolean = false
  private successCount: number = 0
  private config: AgentConfig
  private options: ScrollOptions

  constructor(
    page: Page,
    hashtagInteractionProcessor: HashtagInteractionProcessor,
    config: AgentConfig,
    options: Partial<ScrollOptions>
  ) {
    this.page = page
    this.hashtagInteractionProcessor = hashtagInteractionProcessor
    this.config = config
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }

    if (config.workCount && config.workCount > 0) {
      this.options.maxPosts = config.workCount
      console.log(`HashtagInteractionService가 최대 ${config.workCount}개의 게시물을 처리합니다`)
    }
  }

  async processHashtagInteraction(hashtags: string): Promise<void> {
    for (const hashtag of hashtags) {
      await this.searchHashtag(hashtag)

      this.shouldStop = false
      this.processed = false
      this.successCount = 0

      while (true) {
        const postLocators = await this.page.locator('a[role="link"][tabindex="0"]').all()

        if (postLocators.length === 0) {
          console.log('더 이상 처리할 게시물이 없습니다.')
          break
        }

        for (const postLoc of postLocators) {
          // 최대 처리 수에 도달했는지 확인
          if (this.successCount >= this.options.maxPosts) {
            console.log(
              `최대 작업물 수수(${this.options.maxPosts})에 도달했습니다. 작업을 종료합니다.`
            )
            this.shouldStop = true
            break
          }

          const postElementHandle = await postLoc.elementHandle()
          if (postElementHandle == null) {
            console.log('[processHashtag] postElementHandle is null')
            continue
          }

          await smoothScrollToElement(this.page, postElementHandle)
          await chooseRandomSleep(scrollDelays)

          const delay =
            Math.random() * (this.options.processingDelay.max - this.options.processingDelay.min) +
            this.options.processingDelay.min
          await this.page.waitForTimeout(delay)

          try {
            this.processed = await this.hashtagInteractionProcessor(postLoc)
          } catch (error) {
            console.error(
              `Hashtag processing failed: ${error instanceof Error ? error.message : String(error)}`
            )
            continue
          } finally {
            // 실제로 댓글을 작성한 경우에만 카운트에 추가
            if (this.processed) {
              this.successCount++
            }
            await wait(this.config.postIntervalSeconds * 1000)
          }
        }
      }
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
}
