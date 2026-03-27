import { Locator, Page } from 'playwright'
import { navigateToHome, smoothScrollToElement } from '../common/browserUtils'
import { chooseRandomSleep, scrollDelays, wait } from '../common/timeUtils'
import { AgentConfig } from '../../..'

type HashtagProcessor = (hashtag: Locator) => Promise<boolean>

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
  private hashtagProcessor: HashtagProcessor
  private options: ScrollOptions
  private workCount: number
  private config: AgentConfig
  private shouldStop: boolean = false
  private processed: boolean = false
  private successCount: number = 0
  private processedUrls: Set<string> = new Set() // 이미 처리한 게시물 URL 추적

  constructor(
    page: Page,
    hashtagProcessor: HashtagProcessor,
    options: Partial<ScrollOptions>,
    workCount: number,
    config: AgentConfig
  ) {
    this.page = page
    this.hashtagProcessor = hashtagProcessor
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
    this.workCount = workCount
    this.config = config

    if (workCount && workCount > 0) {
      this.options.maxPosts = workCount
      console.log(`HashtagInteractionService가 최대 ${workCount}개의 게시물을 처리합니다`)
    }
  }

  async processHashtag(tags: string[]): Promise<void> {
    const MAX_CONSECUTIVE_SKIPS = 10

    for (const tag of tags) {
      await navigateToHome(this.page)
      await this.page.waitForTimeout(2000)

      // 해시태그 검색 및 페이지 이동 (실패 시 다음 해시태그로)
      const found = await this.searchHashtag(tag)
      if (!found) {
        console.log(`해시태그 #${tag} 검색 실패, 다음 해시태그로 이동`)
        continue
      }

      this.shouldStop = false
      this.processed = false
      this.successCount = 0
      this.processedUrls.clear() // 새 해시태그마다 초기화
      let consecutiveSkips = 0
      let noNewPostsCount = 0
      const MAX_NO_NEW_POSTS = 3 // 새 게시물 없이 스크롤 3회 시 종료

      // 게시물 그리드가 로드될 때까지 대기
      console.log('게시물 그리드 로딩 대기 중...')
      await this.page.waitForSelector('a[href^="/p/"]', { timeout: 10000 }).catch(() => {
        console.log('게시물 그리드를 찾지 못했습니다.')
      })
      await this.page.waitForTimeout(2000)

      while (true) {
        // 게시물 링크만 선택 (/p/로 시작하는 href)
        const postLocators = await this.page.locator('a[href^="/p/"]').all()
        console.log(`찾은 게시물 수: ${postLocators.length}, 이미 처리됨: ${this.processedUrls.size}`)

        if (postLocators.length === 0) {
          console.log('더 이상 처리할 게시물이 없습니다.')
          break
        }

        // 처리되지 않은 게시물만 필터링
        let newPostsProcessed = 0

        for (const postLoc of postLocators) {
          // 최대 처리 수에 도달했는지 확인
          if (this.successCount >= this.options.maxPosts) {
            console.log(
              `최대 게시물 수(${this.options.maxPosts})에 도달했습니다. 작업을 종료합니다.`
            )
            this.shouldStop = true
            break
          }

          // 게시물 URL 추출
          const postUrl = await postLoc.getAttribute('href')
          if (!postUrl) {
            continue
          }

          // 이미 처리한 게시물은 스킵
          if (this.processedUrls.has(postUrl)) {
            continue
          }

          // 처리 대상으로 마킹
          this.processedUrls.add(postUrl)
          newPostsProcessed++

          const postElementHandle = await postLoc.elementHandle()
          if (postElementHandle == null) {
            console.log('[processHashtag] postElementHandle is null')
            consecutiveSkips++
            if (consecutiveSkips >= MAX_CONSECUTIVE_SKIPS) {
              console.log(`연속 ${MAX_CONSECUTIVE_SKIPS}개 스킵, 다음 해시태그로 이동`)
              this.shouldStop = true
              break
            }
            continue
          }

          await smoothScrollToElement(this.page, postElementHandle)
          await chooseRandomSleep(scrollDelays)

          const delay =
            Math.random() * (this.options.processingDelay.max - this.options.processingDelay.min) +
            this.options.processingDelay.min
          await this.page.waitForTimeout(delay)

          try {
            this.processed = await this.hashtagProcessor(postLoc)
          } catch (error) {
            console.error(
              `Hashtag processing failed: ${error instanceof Error ? error.message : String(error)}`
            )
            consecutiveSkips++
            if (consecutiveSkips >= MAX_CONSECUTIVE_SKIPS) {
              console.log(`연속 ${MAX_CONSECUTIVE_SKIPS}개 스킵, 다음 해시태그로 이동`)
              this.shouldStop = true
              break
            }
            continue
          } finally {
            // 실제로 댓글을 작성한 경우에만 카운트에 추가
            if (this.processed) {
              this.successCount++
              consecutiveSkips = 0
            }
            await wait(this.config.postIntervalSeconds * 1000)
          }
        }

        if (this.shouldStop) {
          break
        }

        // 새로 처리한 게시물이 없으면 스크롤해서 더 로드
        if (newPostsProcessed === 0) {
          noNewPostsCount++
          console.log(`새 게시물 없음 (${noNewPostsCount}/${MAX_NO_NEW_POSTS})`)

          if (noNewPostsCount >= MAX_NO_NEW_POSTS) {
            console.log('더 이상 새 게시물이 없습니다. 다음 해시태그로 이동합니다.')
            break
          }
        } else {
          noNewPostsCount = 0 // 새 게시물이 있으면 카운트 리셋
        }

        // 스크롤해서 새 게시물 로드
        console.log('스크롤하여 더 많은 게시물 로드 중...')
        await this.scrollToLoadMore()
        await this.page.waitForTimeout(2000)
      }

      console.log(`해시태그 #${tag} 완료: ${this.successCount}개 처리됨`)
    }
  }

  async searchHashtag(tag: string): Promise<boolean> {
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

      // 해시태그 요소 대기 (에러 대신 false 반환)
      try {
        await this.page.waitForSelector(`text="#${tag}"`, {
          timeout: 5000
        })
      } catch {
        console.log(`해시태그 #${tag}이(가) 검색 결과에 없습니다.`)
        await this.closeSearchPanel()
        return false
      }

      const hashtagElement = this.page.getByText(`#${tag}`, { exact: true })
      await hashtagElement.click()

      await this.page.waitForTimeout(3000)
      return true
    } catch (error) {
      console.error(
        '해시태그 검색 중 오류 발생:',
        error instanceof Error ? error.message : String(error)
      )
      await this.closeSearchPanel()
      return false
    }
  }

  private async closeSearchPanel(): Promise<void> {
    try {
      await this.page.keyboard.press('Escape')
      await this.page.waitForTimeout(500)
    } catch {
      /* 무시 */
    }
  }

  private async scrollToLoadMore(): Promise<void> {
    try {
      // 페이지 하단으로 스크롤
      await this.page.evaluate(() => {
        window.scrollBy({
          top: window.innerHeight * 2,
          behavior: 'smooth'
        })
      })
      await this.page.waitForTimeout(1000)

      // 추가로 마지막 게시물 근처까지 스크롤
      const lastPost = this.page.locator('a[href^="/p/"]').last()
      const lastPostHandle = await lastPost.elementHandle()
      if (lastPostHandle) {
        await smoothScrollToElement(this.page, lastPostHandle)
      }
    } catch (error) {
      console.error('스크롤 중 오류:', error instanceof Error ? error.message : String(error))
    }
  }
}
