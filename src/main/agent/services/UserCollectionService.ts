import { Page } from 'playwright-core'
import { SupabaseClient } from '@supabase/supabase-js'
import { CollectedUser, UserCollectionSettings } from '../../..'

type LogCallback = (action: string, details?: string, success?: boolean) => void
// Supabase 클라이언트 타입 (Database 타입 정의에 collected_users가 없으므로 any 사용)
type SupabaseClientAny = SupabaseClient<any>

interface CommentInfo {
  username: string
  likeCount: number
  commentText: string
}

export class UserCollectionService {
  private page: Page
  private supabase: SupabaseClientAny
  private instagramUsername: string
  private settings: UserCollectionSettings
  private excludeUsernames: Set<string>
  private onLog?: LogCallback
  // 세션 내 처리된 유저 Set (실시간 처리용)
  private processedUsersThisSession: Set<string> = new Set()

  constructor(
    page: Page,
    supabase: SupabaseClientAny,
    instagramUsername: string,
    settings: UserCollectionSettings,
    excludeUsernames: Set<string>,
    onLog?: LogCallback
  ) {
    this.page = page
    this.supabase = supabase
    this.instagramUsername = instagramUsername
    this.settings = settings
    this.excludeUsernames = excludeUsernames
    this.onLog = onLog
  }

  private log(action: string, details?: string, success?: boolean): void {
    console.log(`[UserCollectionService] ${action}${details ? `: ${details}` : ''}`)
    this.onLog?.(action, details, success)
  }

  /**
   * 세션 내에서 이미 처리된 유저인지 확인
   */
  isUserProcessedThisSession(username: string): boolean {
    return this.processedUsersThisSession.has(username.toLowerCase())
  }

  /**
   * 세션 처리 유저 목록에 추가
   */
  markUserAsProcessed(username: string): void {
    this.processedUsersThisSession.add(username.toLowerCase())
  }

  /**
   * 세션 처리 유저 목록 초기화
   */
  clearProcessedUsers(): void {
    this.processedUsersThisSession.clear()
  }

  /**
   * 게시물 모달에서 상위 댓글을 파싱하여 좋아요가 가장 많은 유저를 수집
   * DB 저장 없이 메모리에서만 관리하고 즉시 처리할 유저 정보 반환
   */
  async collectFromPostModal(
    hashtag: string,
    postId: string
  ): Promise<CollectedUser | null> {
    try {
      this.log('댓글 파싱 시작', `#${hashtag}`)

      // 댓글 영역 대기
      await this.page.waitForTimeout(2000)

      // "숨겨진 댓글 보기" 버튼이 있으면 클릭
      await this.clickHiddenCommentsButton()

      // 게시물 작성자 추출
      const postAuthor = await this.getPostAuthor()
      if (postAuthor) {
        this.log('게시물 작성자', postAuthor)
      }

      // 댓글 목록 파싱 (게시물 작성자 댓글 제외)
      let comments = await this.parseComments(postAuthor)

      if (comments.length === 0) {
        this.log('댓글 없음', '수집할 댓글이 없습니다')
        return null
      }

      this.log('댓글 파싱 완료', `${comments.length}개 댓글 발견`)

      // 좋아요 순으로 정렬
      comments.sort((a, b) => b.likeCount - a.likeCount)

      // 상위 댓글 중 수집 가능한 유저 찾기 (댓글 더 로드 포함)
      const maxLoadAttempts = 3 // 최대 댓글 로드 시도 횟수
      let loadAttempt = 0

      while (loadAttempt <= maxLoadAttempts) {
        for (const comment of comments) {
          // 제외 유저 체크
          if (this.excludeUsernames.has(comment.username)) {
            this.log('제외 유저 스킵', comment.username)
            continue
          }

          // 본인 계정 체크
          if (comment.username.toLowerCase() === this.instagramUsername.toLowerCase()) {
            continue
          }

          // 세션 내 이미 처리된 유저 체크
          if (this.isUserProcessedThisSession(comment.username)) {
            this.log('세션 내 이미 처리된 유저', comment.username)
            continue
          }

          // comment_history에 해당 유저 게시물에 댓글 기록이 있는지 확인
          const hasCommentHistory = await this.checkCommentHistoryForUser(comment.username)
          if (hasCommentHistory) {
            this.log('이미 활동한 유저 (comment_history)', comment.username)
            continue
          }

          // DB 저장 없이 수집된 유저 정보 생성
          const collectedUser: CollectedUser = {
            instagram_username: this.instagramUsername,
            collected_username: comment.username,
            collected_from_hashtag: hashtag,
            collected_from_post_id: postId,
            like_count: comment.likeCount
          }

          this.log(
            '유저 수집 완료',
            `${comment.username} (좋아요: ${comment.likeCount})`,
            true
          )

          return collectedUser
        }

        // 수집 가능한 유저를 못 찾음 → 댓글 더 로드 시도
        if (loadAttempt < maxLoadAttempts) {
          const loaded = await this.loadMoreComments()
          if (!loaded) {
            this.log('더 이상 로드할 댓글 없음')
            break
          }

          loadAttempt++
          this.log('댓글 추가 로드', `${loadAttempt}/${maxLoadAttempts}회`)

          // 새 댓글 파싱 후 좋아요 순 정렬
          comments = await this.parseComments(postAuthor)
          comments.sort((a, b) => b.likeCount - a.likeCount)
        } else {
          break
        }
      }

      this.log('수집 가능한 유저 없음', '모든 댓글 확인 완료')
      return null
    } catch (error) {
      this.log(
        '유저 수집 오류',
        error instanceof Error ? error.message : String(error),
        false
      )
      return null
    }
  }

  /**
   * "숨겨진 댓글 보기" 버튼 클릭
   */
  private async clickHiddenCommentsButton(): Promise<void> {
    try {
      const dialog = this.page.locator('[role="dialog"]').first()

      // 여러 선택자 시도
      const hiddenCommentsSelectors = [
        'div[role="button"]:has-text("숨겨진 댓글 보기")',
        'span:has-text("숨겨진 댓글 보기")',
        '[aria-label="숨겨진 댓글 보기"]',
        'div[role="button"]:has-text("View hidden comments")',
        'span:has-text("View hidden comments")',
      ]

      for (const selector of hiddenCommentsSelectors) {
        const button = dialog.locator(selector).first()
        if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
          this.log('숨겨진 댓글 보기 클릭')
          await button.click()
          await this.page.waitForTimeout(1500) // 댓글 로드 대기
          return
        }
      }
    } catch {
      // 버튼이 없으면 무시
    }
  }

  /**
   * "댓글 더 읽어들이기" 버튼 클릭하여 더 많은 댓글 로드
   */
  private async loadMoreComments(): Promise<boolean> {
    try {
      const dialog = this.page.locator('[role="dialog"]').first()

      // "댓글 더 읽어들이기" 버튼 찾기 (한국어/영어 지원)
      const loadMoreBtn = dialog
        .locator('[aria-label="댓글 더 읽어들이기"], [aria-label="Load more comments"]')
        .first()

      const isVisible = await loadMoreBtn.isVisible({ timeout: 1000 }).catch(() => false)

      if (isVisible) {
        await loadMoreBtn.click()
        await this.page.waitForTimeout(1500) // 댓글 로드 대기
        return true
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * 게시물 작성자 추출 (모달 header에서)
   */
  private async getPostAuthor(): Promise<string | null> {
    try {
      const dialog = this.page.locator('[role="dialog"]').first()

      // 모달 header의 첫 번째 username 링크가 게시물 작성자
      const authorLink = dialog.locator('header a[href^="/"]').first()
      const href = await authorLink.getAttribute('href', { timeout: 2000 }).catch(() => null)

      if (!href) return null

      const match = href.match(/^\/([^/]+)\/$/)
      return match ? match[1] : null
    } catch {
      return null
    }
  }

  /**
   * 댓글 파싱 - 상위 10개 댓글의 작성자와 좋아요 수 추출
   */
  private async parseComments(postAuthor?: string | null): Promise<CommentInfo[]> {
    const comments: CommentInfo[] = []

    try {
      const dialog = this.page.locator('[role="dialog"]').first()

      // 댓글 아이템 찾기 (li._a9zj 또는 li._a9zl 클래스)
      const commentItems = await dialog.locator('li._a9zj, li._a9zl').all()

      this.log('댓글 아이템 수', `${commentItems.length}개 발견`)

      for (let i = 0; i < Math.min(commentItems.length, 15); i++) {
        const commentItem = commentItems[i]

        try {
          // 작성자 이름 추출 - h3 내부의 a 태그에서 href로 username 추출
          const authorLink = commentItem.locator('h3 a[href^="/"]').first()
          const href = await authorLink.getAttribute('href', { timeout: 1000 }).catch(() => null)

          if (!href) continue

          // href에서 username 추출 (/username/ -> username)
          const usernameMatch = href.match(/^\/([^/]+)\/$/)
          if (!usernameMatch) continue

          const username = usernameMatch[1]

          // 본인 계정 댓글 무시
          if (username.toLowerCase() === this.instagramUsername.toLowerCase()) {
            continue
          }

          // 게시물 작성자 댓글 무시
          if (postAuthor && username.toLowerCase() === postAuthor.toLowerCase()) {
            continue
          }

          // 좋아요 수 추출 - "좋아요 N개" 버튼 찾기
          let likeCount = 0

          // 버튼들 중 "좋아요 N개" 패턴 찾기
          const buttons = await commentItem.locator('button._a9ze span').all()
          for (const button of buttons) {
            const buttonText = await button.textContent({ timeout: 300 }).catch(() => null)
            if (buttonText) {
              const match = buttonText.match(/좋아요\s*(\d+)\s*개|(\d+)\s*likes?/i)
              if (match) {
                likeCount = parseInt(match[1] || match[2], 10)
                break
              }
            }
          }

          // 좋아요 버튼이 없으면 0개

          // 댓글 내용 추출
          const commentText = await commentItem
            .locator('span._ap3a, span[dir="auto"]')
            .first()
            .textContent({ timeout: 500 })
            .catch(() => '')

          comments.push({
            username: username.trim(),
            likeCount,
            commentText: commentText || ''
          })

          this.log('댓글 파싱', `${username}: 좋아요 ${likeCount}개`)
        } catch {
          // 개별 댓글 파싱 실패는 무시
          continue
        }
      }
    } catch (error) {
      this.log('댓글 파싱 오류', error instanceof Error ? error.message : String(error), false)
    }

    return comments
  }

  /**
   * comment_history에서 해당 유저 게시물에 댓글 기록이 있는지 확인
   */
  async checkCommentHistoryForUser(username: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('comment_history')
        .select('id')
        .eq('instagram_username', this.instagramUsername)
        .eq('post_author', username)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('comment_history 확인 오류:', error)
        return false
      }

      return !!data
    } catch {
      return false
    }
  }

}
