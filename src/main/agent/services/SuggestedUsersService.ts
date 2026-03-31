import { Page } from 'playwright'
import { chooseRandomSleep, postInteractionDelays } from '../common/timeUtils'

type LogCallback = (action: string, details?: string, success?: boolean) => void

export class SuggestedUsersService {
  private page: Page
  private excludeUsernames: Set<string>
  private maxFollowCount: number
  private onLog: LogCallback

  constructor(
    page: Page,
    excludeUsernames: Set<string>,
    maxFollowCount: number,
    onLog: LogCallback
  ) {
    this.page = page
    this.excludeUsernames = excludeUsernames
    this.maxFollowCount = maxFollowCount
    this.onLog = onLog
  }

  private log(action: string, details?: string, success?: boolean): void {
    console.log(`[SuggestedUsersService] ${action}${details ? `: ${details}` : ''}`)
    this.onLog(action, details, success)
  }

  /**
   * 피드에서 추천 유저 섹션 찾기
   * "회원님에게 추천드리는 회원" 또는 "Suggested for you" 텍스트를 포함하는 섹션
   */
  private async findSuggestedSections() {
    this.log('추천 유저 섹션 탐색 중')

    // 여러 선택자 시도
    const selectors = [
      // 섹션 헤더 텍스트로 찾기
      'div:has(> div > span:text-matches("회원님에게 추천|Suggested for you", "i"))',
      'div:has(span:text-matches("회원님을 위한 추천|추천드리는 회원|Suggested for you", "i"))',
      // 일반적인 추천 유저 컨테이너
      'div[role="presentation"]:has(button:text-matches("팔로우|Follow"))',
    ]

    for (const selector of selectors) {
      try {
        const sections = await this.page.locator(selector).all()
        if (sections.length > 0) {
          this.log('추천 섹션 발견', `${sections.length}개 섹션`)
          return sections
        }
      } catch {
        // 다음 선택자 시도
      }
    }

    return []
  }

  /**
   * 추천 유저 카드에서 사용자 정보 추출
   */
  private async extractUserFromCard(card: any): Promise<{
    username: string
    followButton: any
  } | null> {
    try {
      // 사용자명 추출 (프로필 링크에서)
      const profileLink = card.locator('a[href^="/"][role="link"]').first()
      const href = await profileLink.getAttribute('href').catch(() => null)

      if (!href) return null

      // /username/ 형식에서 username 추출
      const usernameMatch = href.match(/^\/([^/]+)\/?$/)
      if (!usernameMatch) return null

      const username = usernameMatch[1]

      // 이미 팔로우 중인지 확인
      const followingButton = card.locator('button, div[role="button"]').filter({
        hasText: /^(팔로잉|Following|요청됨|Requested)$/i
      }).first()

      if (await followingButton.isVisible().catch(() => false)) {
        this.log('이미 팔로우 중', username)
        return null
      }

      // 팔로우 버튼 찾기
      const followButton = card.locator('button, div[role="button"]').filter({
        hasText: /^(팔로우|Follow)$/i
      }).first()

      if (!(await followButton.isVisible().catch(() => false))) {
        return null
      }

      return { username, followButton }
    } catch {
      return null
    }
  }

  /**
   * 팔로우 수행
   */
  private async performFollow(followButton: any, username: string): Promise<boolean> {
    try {
      await followButton.click()
      await this.page.waitForTimeout(1500)

      // 팔로우 성공 확인 (버튼 텍스트가 변경되었는지)
      const buttonText = await followButton.textContent().catch(() => '')
      if (buttonText && /팔로잉|Following|요청됨|Requested/i.test(buttonText)) {
        return true
      }

      // 버튼이 사라졌거나 다른 버튼으로 대체된 경우도 성공으로 간주
      const isVisible = await followButton.isVisible().catch(() => false)
      if (!isVisible) {
        return true
      }

      return true
    } catch (error) {
      this.log('팔로우 클릭 실패', `${username}: ${error instanceof Error ? error.message : String(error)}`, false)
      return false
    }
  }

  /**
   * 추천 유저 팔로우 처리
   */
  async processSuggestedUsers(): Promise<number> {
    let followedCount = 0

    try {
      // 스크롤하면서 추천 유저 섹션 찾기
      const maxScrollAttempts = 5
      let scrollAttempts = 0

      while (followedCount < this.maxFollowCount && scrollAttempts < maxScrollAttempts) {
        // 피드에서 팔로우 버튼이 있는 모든 요소 찾기
        const followButtons = await this.page.locator('button, div[role="button"]').filter({
          hasText: /^(팔로우|Follow)$/i
        }).all()

        this.log('팔로우 버튼 검색', `${followButtons.length}개 발견`)

        for (const followButton of followButtons) {
          if (followedCount >= this.maxFollowCount) {
            break
          }

          try {
            // 버튼의 부모 요소에서 사용자명 찾기
            const container = followButton.locator('xpath=ancestor::div[.//a[starts-with(@href, "/")]]').first()
            const profileLinks = await container.locator('a[href^="/"]').all()

            let username: string | null = null
            for (const link of profileLinks) {
              const href = await link.getAttribute('href').catch(() => null)
              if (href) {
                const match = href.match(/^\/([a-zA-Z0-9._]+)\/?$/)
                if (match && match[1] !== 'explore' && match[1] !== 'p') {
                  username = match[1]
                  break
                }
              }
            }

            if (!username) {
              continue
            }

            // 제외 사용자 확인
            if (this.excludeUsernames.has(username)) {
              this.log('제외된 사용자', `${username} - 건너뜀`)
              continue
            }

            // 이미 팔로우 중인지 다시 확인
            const buttonText = await followButton.textContent().catch(() => '')
            if (buttonText && /팔로잉|Following|요청됨|Requested/i.test(buttonText)) {
              continue
            }

            // 팔로우 수행
            this.log('팔로우 시도 중', username)
            const success = await this.performFollow(followButton, username)

            if (success) {
              followedCount++
              this.log('팔로우 성공', `${username} (${followedCount}/${this.maxFollowCount})`, true)
              await chooseRandomSleep(postInteractionDelays)
            }
          } catch {
            // 개별 버튼 처리 실패는 무시하고 다음으로
            continue
          }
        }

        if (followedCount < this.maxFollowCount) {
          // 스크롤해서 더 많은 추천 유저 로드
          this.log('스크롤 중', '더 많은 추천 유저 찾기')
          await this.page.evaluate(() => {
            window.scrollBy({
              top: window.innerHeight,
              behavior: 'smooth'
            })
          })
          await this.page.waitForTimeout(2000)
          scrollAttempts++
        } else {
          break
        }
      }

      this.log('추천 유저 팔로우 완료', `총 ${followedCount}명 팔로우`, true)
    } catch (error) {
      this.log('추천 유저 처리 오류', error instanceof Error ? error.message : String(error), false)
    }

    return followedCount
  }
}
