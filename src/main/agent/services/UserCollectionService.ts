import { Locator, Page } from 'playwright-core'
import { SupabaseClient } from '@supabase/supabase-js'
import { CollectedUser, UserCollectionSettings } from '../../..'
import { randomSleep } from '../common/timeUtils'

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
  private sessionId: string
  private excludeUsernames: Set<string>
  private onLog?: LogCallback

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
    this.sessionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    this.excludeUsernames = excludeUsernames
    this.onLog = onLog
  }

  private log(action: string, details?: string, success?: boolean): void {
    console.log(`[UserCollectionService] ${action}${details ? `: ${details}` : ''}`)
    this.onLog?.(action, details, success)
  }

  /**
   * 게시물 모달에서 상위 댓글을 파싱하여 좋아요가 가장 많은 유저를 수집
   */
  async collectFromPostModal(
    hashtag: string,
    postId: string
  ): Promise<CollectedUser | null> {
    try {
      this.log('댓글 파싱 시작', `#${hashtag}`)

      // 댓글 영역 대기
      await this.page.waitForTimeout(2000)

      // 게시물 작성자 추출
      const postAuthor = await this.getPostAuthor()
      if (postAuthor) {
        this.log('게시물 작성자', postAuthor)
      }

      // 댓글 목록 파싱 (게시물 작성자 댓글 제외)
      const comments = await this.parseComments(postAuthor)

      if (comments.length === 0) {
        this.log('댓글 없음', '수집할 댓글이 없습니다')
        return null
      }

      this.log('댓글 파싱 완료', `${comments.length}개 댓글 발견`)

      // 좋아요 순으로 정렬
      comments.sort((a, b) => b.likeCount - a.likeCount)

      // 상위 댓글 중 수집 가능한 유저 찾기
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

        // 이미 수집된 유저인지 확인
        const isAlreadyCollected = await this.checkAlreadyCollected(comment.username)
        if (isAlreadyCollected) {
          this.log('이미 수집된 유저', comment.username)
          continue
        }

        // 이미 팔로우 중인지 확인
        const isFollowing = await this.checkIsFollowing(comment.username)
        if (isFollowing) {
          this.log('이미 팔로우 중', comment.username)
          continue
        }

        // 팔로우 실행
        const followSuccess = await this.followUser(comment.username)
        if (!followSuccess) {
          this.log('팔로우 실패', comment.username, false)
          continue
        }

        // Supabase에 저장
        const collectedUser = await this.saveCollectedUser({
          instagram_username: this.instagramUsername,
          collected_username: comment.username,
          collected_from_hashtag: hashtag,
          collected_from_post_id: postId,
          like_count: comment.likeCount,
          status: 'pending',
          session_id: this.sessionId
        })

        this.log(
          '유저 수집 완료',
          `${comment.username} (좋아요: ${comment.likeCount})`,
          true
        )

        return collectedUser
      }

      this.log('수집 가능한 유저 없음', '모든 상위 댓글 유저가 이미 수집됨')
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
   * 이미 수집된 유저인지 Supabase에서 확인
   */
  private async checkAlreadyCollected(username: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('collected_users')
        .select('id')
        .eq('instagram_username', this.instagramUsername)
        .eq('collected_username', username)
        .maybeSingle()

      if (error) {
        console.error('수집 유저 확인 오류:', error)
        return false
      }

      return !!data
    } catch {
      return false
    }
  }

  /**
   * 이미 팔로우 중인지 확인 (프로필 방문 없이 모달에서 확인)
   */
  private async checkIsFollowing(username: string): Promise<boolean> {
    // 모달 내에서 확인이 어려우므로 false 반환
    // 실제 팔로우 시도 시 "팔로잉" 버튼 유무로 판단
    return false
  }

  /**
   * 유저 팔로우 (댓글 작성자 이름 클릭 → 프로필 방문 → 팔로우)
   */
  private async followUser(username: string): Promise<boolean> {
    try {
      this.log('팔로우 시도', username)

      // 모달 내에서 작성자 이름 클릭하여 프로필 방문
      const dialog = this.page.locator('[role="dialog"]').first()
      const authorLink = dialog.locator(`a[href="/${username}/"]`).first()

      if (await authorLink.isVisible().catch(() => false)) {
        await authorLink.click()
        await this.page.waitForTimeout(2500)
      } else {
        // 직접 프로필 URL로 이동
        await this.page.goto(`https://www.instagram.com/${username}/`, {
          waitUntil: 'networkidle',
          timeout: 15000
        })
        await this.page.waitForTimeout(2000)
      }

      // 팔로우 버튼 찾기
      const followButton = this.page
        .locator('header button, header div[role="button"]')
        .filter({ hasText: /^팔로우$/i })
        .first()

      // 이미 팔로잉인지 확인
      const followingButton = this.page
        .locator('header button, header div[role="button"]')
        .filter({ hasText: /^(팔로잉|Following|요청됨|Requested)$/i })
        .first()

      if (await followingButton.isVisible().catch(() => false)) {
        this.log('이미 팔로우 중', username)
        // 뒤로 가기
        await this.page.goBack()
        await this.page.waitForTimeout(1500)
        return false
      }

      if (!(await followButton.isVisible().catch(() => false))) {
        this.log('팔로우 버튼 없음', username, false)
        await this.page.goBack()
        await this.page.waitForTimeout(1500)
        return false
      }

      await followButton.click()
      await this.page.waitForTimeout(2000)

      // 팔로우 성공 확인
      const isNowFollowing = await this.page
        .locator('header button, header div[role="button"]')
        .filter({ hasText: /^(팔로잉|Following|요청됨|Requested)$/i })
        .first()
        .isVisible()
        .catch(() => false)

      // 뒤로 가기 (해시태그 페이지로)
      await this.page.goBack()
      await this.page.waitForTimeout(1500)

      if (isNowFollowing) {
        this.log('팔로우 성공', username, true)
        return true
      } else {
        this.log('팔로우 확인 실패', username, false)
        return false
      }
    } catch (error) {
      this.log(
        '팔로우 오류',
        `${username}: ${error instanceof Error ? error.message : String(error)}`,
        false
      )
      // 오류 시에도 뒤로 가기 시도
      await this.page.goBack().catch(() => {})
      await this.page.waitForTimeout(1500)
      return false
    }
  }

  /**
   * 수집된 유저 Supabase에 저장
   */
  private async saveCollectedUser(
    user: Omit<CollectedUser, 'id' | 'processed_at' | 'created_at'>
  ): Promise<CollectedUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('collected_users')
        .upsert(
          {
            instagram_username: user.instagram_username,
            collected_username: user.collected_username,
            collected_from_hashtag: user.collected_from_hashtag,
            collected_from_post_id: user.collected_from_post_id,
            like_count: user.like_count,
            status: user.status,
            session_id: user.session_id
          },
          {
            onConflict: 'instagram_username,collected_username',
            ignoreDuplicates: true
          }
        )
        .select()
        .single()

      if (error) {
        this.log('유저 저장 오류', error.message, false)
        return null
      }

      return data as CollectedUser
    } catch (error) {
      this.log(
        '유저 저장 오류',
        error instanceof Error ? error.message : String(error),
        false
      )
      return null
    }
  }

  /**
   * 현재 세션에서 수집된 유저 목록 가져오기
   */
  async getCollectedUsersForSession(): Promise<CollectedUser[]> {
    try {
      const { data, error } = await this.supabase
        .from('collected_users')
        .select('*')
        .eq('instagram_username', this.instagramUsername)
        .eq('session_id', this.sessionId)
        .eq('status', 'pending')
        .order('like_count', { ascending: false })

      if (error) {
        this.log('수집 유저 조회 오류', error.message, false)
        return []
      }

      return (data || []) as CollectedUser[]
    } catch {
      return []
    }
  }

  /**
   * 대기 중인 모든 수집 유저 가져오기
   */
  async getPendingCollectedUsers(): Promise<CollectedUser[]> {
    try {
      const { data, error } = await this.supabase
        .from('collected_users')
        .select('*')
        .eq('instagram_username', this.instagramUsername)
        .eq('status', 'pending')
        .order('like_count', { ascending: false })

      if (error) {
        this.log('수집 유저 조회 오류', error.message, false)
        return []
      }

      return (data || []) as CollectedUser[]
    } catch {
      return []
    }
  }

  /**
   * 수집 유저 상태 업데이트
   */
  async updateCollectedUserStatus(
    collectedUsername: string,
    status: CollectedUser['status']
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('collected_users')
        .update({
          status,
          processed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null
        })
        .eq('instagram_username', this.instagramUsername)
        .eq('collected_username', collectedUsername)

      if (error) {
        this.log('상태 업데이트 오류', error.message, false)
        return false
      }

      return true
    } catch {
      return false
    }
  }

  getSessionId(): string {
    return this.sessionId
  }
}
