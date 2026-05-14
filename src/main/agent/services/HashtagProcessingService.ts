import { Locator, Page } from 'playwright'
import { navigateToHome, smoothScrollToElement } from '../common/browserUtils'
import { chooseRandomSleep, scrollDelays, wait } from '../common/timeUtils'
import { AgentConfig } from '../../..'
import {
  HashtagCandidate,
  findBestMatchingHashtag,
  parsePostCount
} from '../common/stringUtils'

export type HashtagProcessResult = { processed: boolean; goalsReached?: boolean }
type HashtagProcessor = (hashtag: Locator) => Promise<boolean | HashtagProcessResult>
type LogCallback = (action: string, details?: string, success?: boolean) => void

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
  private workCount: number
  private config: AgentConfig
  private shouldStop: boolean = false
  private processed: boolean = false
  private successCount: number = 0
  private processedUrls: Set<string> = new Set() // 이미 처리한 게시물 URL 추적
  private lastProcessedUrl: string | null = null // page.goto 복귀 후 점프할 위치
  private onLog?: LogCallback

  constructor(
    page: Page,
    hashtagProcessor: HashtagProcessor,
    options: Partial<ScrollOptions>,
    workCount: number,
    config: AgentConfig,
    onLog?: LogCallback
  ) {
    this.page = page
    this.hashtagProcessor = hashtagProcessor
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
    this.workCount = workCount
    this.config = config
    this.onLog = onLog

    if (workCount && workCount > 0) {
      this.options.maxPosts = workCount
      this.log('HashtagService 초기화', `최대 ${workCount}개 게시물 처리`)
    }
  }

  private log(action: string, details?: string, success?: boolean): void {
    console.log(`[HashtagService] ${action}${details ? `: ${details}` : ''}`)
    this.onLog?.(action, details, success)
  }

  async processHashtag(tags: string[]): Promise<void> {
    const MAX_CONSECUTIVE_SKIPS = 10

    for (const tag of tags) {
      this.log('홈으로 이동 시작', `#${tag}`)
      await navigateToHome(this.page)
      this.log('홈으로 이동 완료', `#${tag}`)
      await this.page.waitForTimeout(2000)

      // 해시태그 검색 및 페이지 이동 (실패 시 다음 해시태그로)
      const found = await this.searchHashtag(tag)
      if (!found) {
        this.log('해시태그 검색 실패', `#${tag} - 다음 해시태그로 이동`, false)
        continue
      }

      this.shouldStop = false
      this.processed = false
      this.successCount = 0
      this.processedUrls.clear() // 새 해시태그마다 초기화
      this.lastProcessedUrl = null
      let consecutiveSkips = 0
      let noNewPostsCount = 0
      const MAX_NO_NEW_POSTS = 3 // 새 게시물 없이 스크롤 3회 시 종료

      // 게시물 그리드가 로드될 때까지 대기
      this.log('게시물 그리드 로딩 대기 중')
      await this.page.waitForSelector('a[href^="/p/"]', { timeout: 10000 }).catch(() => {
        this.log('게시물 그리드 없음', '게시물 그리드를 찾지 못했습니다', false)
      })
      await this.page.waitForTimeout(2000)

      while (true) {
        // 게시물 링크만 선택 (/p/로 시작하는 href)
        const postLocators = await this.page.locator('a[href^="/p/"]').all()
        this.log('게시물 검색', `찾은 게시물: ${postLocators.length}개, 처리됨: ${this.processedUrls.size}개`)

        if (postLocators.length === 0) {
          this.log('게시물 없음', '더 이상 처리할 게시물이 없습니다')
          break
        }

        // 처리되지 않은 게시물만 필터링
        let newPostsProcessed = 0
        let failedInThisRound = 0 // 이번 라운드에서 처리 실패한 게시물 수

        for (const postLoc of postLocators) {
          // 최대 처리 수에 도달했는지 확인
          if (this.successCount >= this.options.maxPosts) {
            this.log('작업 완료', `최대 게시물 수(${this.options.maxPosts})에 도달`, true)
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
            this.log('게시물 요소 없음', 'postElementHandle is null', false)
            consecutiveSkips++
            if (consecutiveSkips >= MAX_CONSECUTIVE_SKIPS) {
              this.log('연속 스킵 초과', `${MAX_CONSECUTIVE_SKIPS}개 스킵, 다음 해시태그로 이동`, false)
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

          let goalsReached = false
          try {
            const result = await this.hashtagProcessor(postLoc)
            const normalized: HashtagProcessResult =
              typeof result === 'boolean' ? { processed: result } : result
            this.processed = normalized.processed
            goalsReached = normalized.goalsReached === true
            if (this.processed) {
              this.lastProcessedUrl = postUrl
            }
          } catch (error) {
            this.log('게시물 처리 실패', error instanceof Error ? error.message : String(error), false)
            consecutiveSkips++
            if (consecutiveSkips >= MAX_CONSECUTIVE_SKIPS) {
              this.log('연속 스킵 초과', `${MAX_CONSECUTIVE_SKIPS}개 스킵, 다음 해시태그로 이동`, false)
              this.shouldStop = true
              break
            }
            continue
          } finally {
            if (goalsReached) {
              // 두 목표(댓글 + 수집) 모두 달성 - wait 없이 즉시 다음 해시태그로
              this.log('해시태그 목표 달성', '다음 해시태그로 즉시 이동', true)
              this.shouldStop = true
            } else if (this.processed) {
              this.successCount++
              consecutiveSkips = 0
              await wait(this.config.postIntervalSeconds * 1000) // 성공 시에만 긴 대기
            } else {
              failedInThisRound++ // 처리 실패 카운트
              this.log('게시물 스킵', '이미 처리했거나 처리 불가능한 게시물')
              await wait(1000) // 실패 시 짧은 대기
            }
          }

          if (this.shouldStop) {
            break
          }

          // 페이지 이동 감지 - 유저 수집 후 해시태그 복귀 시 locator 갱신 필요
          const currentUrl = this.page.url()
          if (!currentUrl.includes('/explore/tags/')) {
            this.log('페이지 이동 감지', '게시물 목록 재조회 필요')
            break // for 루프 탈출 → while 루프에서 postLocators 재조회
          }
        }

        if (this.shouldStop) {
          break
        }

        // 새로 처리한 게시물이 없으면 스크롤해서 더 로드
        if (newPostsProcessed === 0) {
          noNewPostsCount++
          this.log('새 게시물 없음', `${noNewPostsCount}/${MAX_NO_NEW_POSTS}`)

          if (noNewPostsCount >= MAX_NO_NEW_POSTS) {
            this.log('게시물 소진', '더 이상 새 게시물 없음, 다음 해시태그로 이동')
            break
          }
        } else if (newPostsProcessed > 0 && newPostsProcessed === failedInThisRound) {
          // 새 게시물은 있지만 모두 처리 실패 (이미 댓글 작성 등)
          noNewPostsCount++
          this.log(
            '새 게시물 스킵됨',
            `${newPostsProcessed}개 게시물 모두 처리 불가 (${noNewPostsCount}/${MAX_NO_NEW_POSTS}회)`
          )

          if (noNewPostsCount >= MAX_NO_NEW_POSTS) {
            this.log('다음 해시태그로 이동', '처리 가능한 게시물이 더 이상 없습니다', true)
            break
          }
        } else {
          noNewPostsCount = 0 // 실제로 처리 성공한 게시물이 있으면 카운트 리셋
        }

        // 스크롤해서 새 게시물 로드
        this.log('스크롤 중', '더 많은 게시물 로드 중...')
        await this.scrollToLoadMore()
        await this.page.waitForTimeout(2000)
      }

      this.log('해시태그 완료', `#${tag} - ${this.successCount}개 처리됨`, true)
    }
  }

  async searchHashtag(tag: string): Promise<boolean> {
    try {
      this.log('검색 메뉴 찾는 중')

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

      // 1. 정확한 일치 시도
      const exactMatch = this.page.getByText(`#${tag}`, { exact: true })
      if (await exactMatch.isVisible({ timeout: 1000 }).catch(() => false)) {
        this.log('정확한 해시태그 발견', `#${tag}`, true)
        await exactMatch.click()
        await this.page.waitForTimeout(3000)
        return true
      }

      // 2. 유사 매칭 시도
      this.log('유사 해시태그 검색 중', `정확한 #${tag} 없음`)
      const candidates = await this.extractHashtagCandidates()

      if (candidates.length === 0) {
        this.log('검색 결과 없음', `#${tag}`, false)
        await this.closeSearchPanel()
        return false
      }

      const bestMatch = findBestMatchingHashtag(tag, candidates)

      if (!bestMatch) {
        this.log('유사 해시태그 없음', `#${tag}와 일치하는 해시태그 없음`, false)
        await this.closeSearchPanel()
        return false
      }

      // 3. 유사 해시태그 클릭
      this.log(
        '유사 해시태그 선택',
        `#${bestMatch.tag} (점수: ${bestMatch.score}, 게시물: ${bestMatch.postCount ?? '알 수 없음'})`,
        true
      )
      const similarElement = this.page.getByText(`#${bestMatch.tag}`, { exact: true })
      await similarElement.click()
      await this.page.waitForTimeout(3000)
      return true
    } catch (error) {
      this.log('해시태그 검색 오류', error instanceof Error ? error.message : String(error), false)
      await this.closeSearchPanel()
      return false
    }
  }

  /**
   * 검색 결과에서 해시태그 후보 목록 추출
   * 인스타그램 검색 결과의 a[href^="/explore/tags/"] 링크에서 태그명과 게시글 수 파싱
   */
  private async extractHashtagCandidates(): Promise<HashtagCandidate[]> {
    const candidates: HashtagCandidate[] = []

    try {
      // 해시태그 검색 결과 링크 선택
      const hashtagLinks = await this.page.locator('a[href^="/explore/tags/"]').all()

      for (const link of hashtagLinks) {
        try {
          const href = await link.getAttribute('href')
          if (!href) continue

          // /explore/tags/태그명 에서 태그명 추출
          const tagMatch = href.match(/\/explore\/tags\/([^/]+)/)
          if (!tagMatch) continue

          const tag = decodeURIComponent(tagMatch[1])

          // 게시글 수 추출 (링크 내부의 텍스트에서 파싱)
          const linkText = await link.textContent()
          let postCount: number | undefined

          if (linkText) {
            // "게시물 1.2만" 또는 "1.2만 게시물" 패턴 찾기
            const postCountMatch = linkText.match(/([\d,.]+[만억천]?)\s*게시물|게시물\s*([\d,.]+[만억천]?)/)
            if (postCountMatch) {
              const countText = postCountMatch[1] || postCountMatch[2]
              postCount = parsePostCount(countText)
            }
          }

          candidates.push({ tag, postCount })
        } catch {
          // 개별 링크 파싱 실패는 무시
          continue
        }
      }
    } catch (error) {
      this.log('해시태그 후보 추출 오류', error instanceof Error ? error.message : String(error), false)
    }

    this.log('해시태그 후보 추출', `${candidates.length}개 - ${candidates.map((c) => `#${c.tag}`).join(', ')}`)
    return candidates
  }

  private async closeSearchPanel(): Promise<void> {
    try {
      await this.page.keyboard.press('Escape')
      await this.page.waitForTimeout(500)
    } catch {
      /* 무시 */
    }
  }

  /**
   * page.goto로 해시태그 페이지를 새로 로드한 직후 호출.
   * 마지막으로 처리한 게시물(lastProcessedUrl)이 화면에 보일 때까지 페이지 하단으로
   * 스크롤한 뒤 그 위치로 점프한다. 이를 통해 1번 게시물부터 다시 순회·스킵하는
   * 헛손질을 줄인다.
   */
  public async scrollToLastProcessedPost(maxAttempts: number = 8): Promise<boolean> {
    if (!this.lastProcessedUrl) return false

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const target = this.page.locator(`a[href="${this.lastProcessedUrl}"]`).first()
      try {
        if ((await target.count()) > 0) {
          const handle = await target.elementHandle()
          if (handle) {
            await smoothScrollToElement(this.page, handle)
            this.log('마지막 처리 위치 복귀', this.lastProcessedUrl, true)
            return true
          }
        }
      } catch {
        // 다음 시도
      }

      // 페이지 하단으로 스크롤하여 추가 게시물 로드
      await this.page.evaluate(() => {
        window.scrollBy({ top: window.innerHeight * 2, behavior: 'auto' })
      })
      await this.page.waitForTimeout(1200)
    }

    this.log('마지막 처리 위치 복귀 실패', this.lastProcessedUrl ?? '', false)
    return false
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
      this.log('스크롤 오류', error instanceof Error ? error.message : String(error), false)
    }
  }
}
