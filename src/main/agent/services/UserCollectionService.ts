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

        // comment_history에 해당 유저 게시물에 댓글 기록이 있는지 확인
        const hasCommentHistory = await this.checkCommentHistoryForUser(comment.username)
        if (hasCommentHistory) {
          this.log('이미 활동한 유저 (comment_history)', comment.username)
          continue
        }

        // 팔로우 없이 바로 Supabase에 저장
        const collectedUser = await this.saveCollectedUser({
          instagram_username: this.instagramUsername,
          collected_username: comment.username,
          collected_from_hashtag: hashtag,
          collected_from_post_id: postId,
          like_count: comment.likeCount
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
   * comment_history에서 해당 유저 게시물에 댓글 기록이 있는지 확인
   */
  private async checkCommentHistoryForUser(username: string): Promise<boolean> {
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

  /**
   * 수집된 유저 Supabase에 저장
   */
  private async saveCollectedUser(user: {
    instagram_username: string
    collected_username: string
    collected_from_hashtag: string
    collected_from_post_id: string
    like_count: number
  }): Promise<CollectedUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('collected_users')
        .upsert(
          {
            instagram_username: user.instagram_username,
            collected_username: user.collected_username,
            collected_from_hashtag: user.collected_from_hashtag,
            collected_from_post_id: user.collected_from_post_id,
            like_count: user.like_count
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
   * 아직 활동하지 않은 수집 유저 목록 가져오기
   * comment_history에 해당 유저의 게시물 기록이 없는 유저만 반환
   */
  async getPendingCollectedUsers(): Promise<CollectedUser[]> {
    try {
      // 1. 모든 수집 유저 조회
      const { data: collectedUsers, error } = await this.supabase
        .from('collected_users')
        .select('*')
        .eq('instagram_username', this.instagramUsername)
        .order('like_count', { ascending: false })

      if (error) {
        this.log('수집 유저 조회 오류', error.message, false)
        return []
      }

      if (!collectedUsers || collectedUsers.length === 0) {
        return []
      }

      // 2. comment_history에서 이미 활동한 유저 목록 조회
      const { data: commentHistory, error: historyError } = await this.supabase
        .from('comment_history')
        .select('post_author')
        .eq('instagram_username', this.instagramUsername)

      if (historyError) {
        this.log('comment_history 조회 오류', historyError.message, false)
        // 오류 시에도 일단 모든 수집 유저 반환
        return collectedUsers as CollectedUser[]
      }

      // 3. 이미 활동한 유저 Set 생성
      const processedUsers = new Set(
        (commentHistory || []).map(h => h.post_author?.toLowerCase())
      )

      // 4. 아직 활동하지 않은 유저만 필터링
      const pendingUsers = collectedUsers.filter(
        user => !processedUsers.has(user.collected_username?.toLowerCase())
      )

      this.log('수집 유저 필터링', `전체 ${collectedUsers.length}명 중 ${pendingUsers.length}명 대기 중`)

      return pendingUsers as CollectedUser[]
    } catch {
      return []
    }
  }
}
