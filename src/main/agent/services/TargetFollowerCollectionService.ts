import { Page } from 'playwright-core'
import { SupabaseClient } from '@supabase/supabase-js'
import { TargetFollowerCollectionTarget } from '../../..'
import { isTransientNetworkError, networkErrorCause } from '../common/resilientFetch'

type SupabaseClientAny = SupabaseClient<any>
type LogCallback = (action: string, details?: string, success?: boolean) => void

const FOLLOWER_COLLECTION_RETRY_DELAY_HOURS = 20

// Supabase 호출 재시도 설정
const SUPABASE_RETRY_ATTEMPTS = 3
const SUPABASE_RETRY_BASE_DELAY_MS = 1000 // 1s -> 2s -> 4s
// 루프 도중 크래시/중단 시 진행분 보존을 위한 증분 커서 저장 주기(페이지 단위)
const CURSOR_SAVE_EVERY_N_PAGES = 5
// 인스타 API가 null(브라우저 fetch throw=일시적 네트워크 실패) 반환 시 재시도 횟수
const IG_FETCH_MAX_RETRY = 2

// 일시적 네트워크 에러 판정(isTransientNetworkError)은 ../common/resilientFetch 로 통합됨.
// 메인 프로세스 supabase 클라이언트의 global.fetch 자체가 재시도하므로,
// 아래 withSupabaseRetry는 { error }로 변환되어 넘어온 케이스를 잡는 2차 안전망이다.

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface TargetFollowerCollectionOptions {
  appUserId: string
  appUserEmail: string
  dailyLimit: number
  onLog?: LogCallback
  onTargetStatusUpdate?: (username: string, patch: Partial<TargetFollowerCollectionTarget>) => void
  isRunning?: () => boolean
}

interface CollectionJob {
  id: number
  app_user_id: string
  app_user_email: string
  target_username: string
  target_group: string | null
  target_follower_count: number | null
  target_user_id: string | null
  collected_count: number
  next_cursor: string | null
  status: 'pending' | 'waiting' | 'completed' | 'failed'
  last_error: string | null
  last_run_at: string | null
  next_run_at: string | null
  completed_at: string | null
}

interface CollectionResult {
  insertedCount: number
  followerCount: number | null
  stoppedByEnd: boolean
  suspectedBlock: boolean
  nextCursor: string | null
  targetUserId: string | null
}

export class TargetFollowerCollectionService {
  private page: Page
  private supabase: SupabaseClientAny
  private options: TargetFollowerCollectionOptions

  constructor(page: Page, supabase: SupabaseClientAny, options: TargetFollowerCollectionOptions) {
    this.page = page
    this.supabase = supabase
    this.options = options
  }

  private get running(): boolean {
    return this.options.isRunning ? this.options.isRunning() : true
  }

  private log(action: string, details?: string, success?: boolean): void {
    console.log(`[TargetFollowerCollectionService] ${action}${details ? `: ${details}` : ''}`)
    this.options.onLog?.(action, details, success)
  }

  /**
   * supabase-js 쿼리를 일시적 네트워크 에러("fetch failed" 등)에 대해 지수 백오프로 재시도.
   * 빌더는 한 번 await하면 재실행 불가하므로, 매 시도마다 "새" 빌더를 만드는 팩토리를 받음.
   * - await 자체가 throw(undici) → 일시적이면 백오프 후 재시도, 마지막엔 rethrow
   * - { error } 반환 & error가 일시적 → 백오프 후 재시도, 마지막엔 그 결과 그대로 반환
   * - 성공/영구 에러 → 즉시 반환
   */
  private async withSupabaseRetry<T extends { error: unknown }>(
    queryFactory: () => PromiseLike<T>,
    label: string
  ): Promise<T> {
    let lastThrown: unknown = null
    for (let attempt = 1; attempt <= SUPABASE_RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await queryFactory()
        if (
          result.error &&
          isTransientNetworkError(result.error) &&
          attempt < SUPABASE_RETRY_ATTEMPTS
        ) {
          const delay = SUPABASE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
          this.log(
            'Supabase 일시 오류 재시도',
            `${label} (${attempt}/${SUPABASE_RETRY_ATTEMPTS}) ${delay}ms 후: ${(result.error as { message?: string })?.message ?? ''}`
          )
          await sleep(delay)
          continue
        }
        return result
      } catch (err) {
        lastThrown = err
        if (isTransientNetworkError(err) && attempt < SUPABASE_RETRY_ATTEMPTS) {
          const delay = SUPABASE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
          this.log(
            'Supabase 일시 오류 재시도',
            `${label} (${attempt}/${SUPABASE_RETRY_ATTEMPTS}) ${delay}ms 후: ${err instanceof Error ? err.message : String(err)}`
          )
          await sleep(delay)
          continue
        }
        throw err
      }
    }
    throw lastThrown ?? new Error(`${label}: 재시도 소진`)
  }

  async processTargets(targets: TargetFollowerCollectionTarget[]): Promise<void> {
    const normalizedTargets = targets
      .map((target) => ({
        username: this.normalizeUsername(target.username),
        groupName: target.groupName?.trim() || null
      }))
      .filter((target) => target.username)

    this.log('팔로워 수집 작업 시작', `${normalizedTargets.length}개 타겟`)

    for (const target of normalizedTargets) {
      if (!this.running) {
        this.log('팔로워 수집 중단')
        break
      }

      await this.processTarget(target.username, target.groupName)
    }

    this.log('팔로워 수집 작업 완료')
  }

  private async processTarget(targetUsername: string, targetGroup: string | null): Promise<void> {
    let job: CollectionJob | null = null

    try {
      job = await this.loadOrCreateJob(targetUsername, targetGroup)

      // 이미 완료된 경우 스킵
      if (job.status === 'completed') {
        this.options.onTargetStatusUpdate?.(targetUsername, {
          status: 'completed',
          followerCount: job.target_follower_count ?? undefined,
          collectedCount: job.collected_count,
          nextRunAt: undefined,
          error: undefined
        })
        this.log('이미 수집 완료', `@${targetUsername} ${job.collected_count}명`)
        return
      }

      // 한도 소진 후 다음 실행 시간이 아직 안 된 경우 스킵
      if (job.status === 'waiting' && job.next_run_at && new Date(job.next_run_at) > new Date()) {
        const nextRunAt = new Date(job.next_run_at)
        this.options.onTargetStatusUpdate?.(targetUsername, {
          status: 'waiting',
          followerCount: job.target_follower_count ?? undefined,
          collectedCount: job.collected_count,
          nextRunAt: nextRunAt.getTime(),
          error: undefined
        })
        this.log(
          '수집 한도 완료',
          `@${targetUsername} 다음 수집: ${nextRunAt.toLocaleDateString('ko-KR')} ${nextRunAt.toLocaleTimeString('ko-KR')}`
        )
        return
      }

      const alreadyCollected = await this.countCollectedFollowers(targetUsername)

      this.options.onTargetStatusUpdate?.(targetUsername, {
        status: 'processing',
        followerCount: job.target_follower_count ?? undefined,
        collectedCount: alreadyCollected,
        error: undefined
      })

      this.log(
        '타겟 팔로워 수집 시작',
        `@${targetUsername}${job.next_cursor ? ' (이어서 수집)' : ''}`
      )

      const result = await this.collectFollowers(
        targetUsername,
        targetGroup,
        job.next_cursor || null,
        job.target_user_id || null,
        job.id
      )

      const totalCollected = await this.countCollectedFollowers(targetUsername)
      const followerCount = result.followerCount ?? job.target_follower_count
      const isComplete =
        (result.stoppedByEnd && result.nextCursor === null) ||
        (followerCount !== null && followerCount > 0 && totalCollected >= followerCount)

      await this.updateJob(job.id, {
        target_follower_count: followerCount,
        target_group: targetGroup,
        target_user_id: result.targetUserId ?? job.target_user_id,
        collected_count: totalCollected,
        next_cursor: isComplete ? null : result.nextCursor,
        status: isComplete ? 'completed' : 'waiting',
        last_error: null,
        last_run_at: new Date().toISOString(),
        next_run_at: isComplete ? null : this.getNextRunAt().toISOString(),
        completed_at: isComplete ? new Date().toISOString() : null,
        app_user_email: this.options.appUserEmail
      })

      this.options.onTargetStatusUpdate?.(targetUsername, {
        status: isComplete ? 'completed' : 'waiting',
        followerCount: followerCount ?? undefined,
        collectedCount: totalCollected,
        nextRunAt: isComplete ? undefined : this.getNextRunAt().getTime(),
        processedAt: Date.now(),
        error: undefined
      })

      this.log(
        isComplete ? '타겟 팔로워 수집 완료' : '타겟 팔로워 수집 중단 (다음 실행 시 재개)',
        `@${targetUsername} 신규 ${result.insertedCount}명, 누적 ${totalCollected}${followerCount ? `/${followerCount}` : ''}`,
        true
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      // 일시적 네트워크 실패(Supabase "fetch failed" 등)는 20시간 정지시키지 않는다.
      // 커서/수집수는 절대 덮어쓰지 않고(resume 보존), status=pending으로 두어 다음 사이클에 즉시 재개.
      if (isTransientNetworkError(error)) {
        const cause = networkErrorCause(error)
        this.log(
          '타겟 팔로워 수집 일시 중단 (네트워크)',
          `@${targetUsername}: ${message}${cause ? ` [${cause}]` : ''} — 다음 사이클에 재시도`,
          false
        )

        if (job) {
          await this.updateJob(job.id, {
            status: 'pending',
            last_error: message,
            last_run_at: new Date().toISOString(),
            next_run_at: null
          })
        }

        this.options.onTargetStatusUpdate?.(targetUsername, {
          status: 'waiting',
          error: message,
          processedAt: Date.now()
        })
        return
      }

      // 진짜 에러(로그인 실패 등) → 기존 동작 유지: failed + 20시간 후 재시도
      this.log('타겟 팔로워 수집 실패', `@${targetUsername}: ${message}`, false)

      if (job) {
        await this.updateJob(job.id, {
          status: 'failed',
          last_error: message,
          last_run_at: new Date().toISOString(),
          next_run_at: this.getNextRunAt().toISOString()
        })
      }

      this.options.onTargetStatusUpdate?.(targetUsername, {
        status: 'failed',
        error: message,
        processedAt: Date.now()
      })
    }
  }

  private async collectFollowers(
    targetUsername: string,
    targetGroup: string | null,
    savedCursor: string | null,
    savedUserId: string | null,
    jobId: number
  ): Promise<CollectionResult> {
    const currentUrl = this.page.url()
    if (!currentUrl.includes('instagram.com')) {
      await this.page.goto('https://www.instagram.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      await this.page.waitForTimeout(2000)
    }

    let targetUserId = savedUserId
    let followerCount: number | null = null

    if (!targetUserId) {
      const profileInfo = await this.fetchProfileInfo(targetUsername)
      if (!profileInfo) {
        throw new Error('프로필 정보 조회 실패 (로그인 상태 확인 필요)')
      }
      targetUserId = profileInfo.userId
      followerCount = profileInfo.followerCount
      this.log(
        '유저 ID 취득',
        `@${targetUsername}: ${targetUserId}, 팔로워 ${followerCount?.toLocaleString() ?? '?'}명`
      )
    }

    let cursor: string | null = savedCursor
    let insertedCount = 0
    let stoppedByEnd = false
    let suspectedBlock = false
    let nextCursor: string | null = cursor
    let collectPageCounter = 0
    const recentlyCollected: string[] = []
    const dailyLimit = this.options.dailyLimit

    // 스텝 풀: collect=팔로워수집, feed=피드스크롤, feed_click=피드게시물클릭,
    //          hashtag=해시태그스크롤, hashtag_click=해시태그게시물클릭
    type Step = 'collect' | 'feed' | 'feed_click' | 'hashtag' | 'hashtag_click'
    const stepPool: Step[] = [
      'collect',
      'collect',
      'collect',
      'collect',
      'collect',
      'feed',
      'feed',
      'feed_click',
      'hashtag',
      'hashtag_click'
    ]
    let prevWasCollect = false

    while (this.running && insertedCount < dailyLimit) {
      let step = stepPool[Math.floor(Math.random() * stepPool.length)]

      // 연속 수집 방지: 직전이 collect면 반드시 브라우징
      if (step === 'collect' && prevWasCollect) {
        const browsingPool: Step[] = ['feed', 'feed_click', 'hashtag', 'hashtag_click']
        step = browsingPool[Math.floor(Math.random() * browsingPool.length)]
      }
      prevWasCollect = step === 'collect'

      if (step === 'collect') {
        if (!this.page.url().includes('instagram.com')) {
          await this.page.goto('https://www.instagram.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          })
          await this.page.waitForTimeout(2000)
        }

        const pageCounts = [12, 12, 12, 24, 12, 12, 24]
        const pageCount = pageCounts[Math.floor(Math.random() * pageCounts.length)]
        let pageResult = await this.fetchFollowersPage(
          targetUserId,
          targetUsername,
          cursor,
          pageCount
        )

        // null = 브라우저 fetch가 throw한 일시적 네트워크 실패 → 짧은 대기 후 재시도.
        // (HTTP 응답이 있는 pageResult.error=401/429 등은 진짜 차단이므로 재시도하지 않음)
        let igRetry = 0
        while (!pageResult && igRetry < IG_FETCH_MAX_RETRY && this.running) {
          igRetry++
          const backoff = 3000 + Math.floor(Math.random() * 3000) // 3~6s
          this.log(
            '팔로워 API 일시 실패 재시도',
            `@${targetUsername} (${igRetry}/${IG_FETCH_MAX_RETRY}) ${Math.round(backoff / 1000)}초 후`
          )
          await this.page.waitForTimeout(backoff)
          pageResult = await this.fetchFollowersPage(
            targetUserId,
            targetUsername,
            cursor,
            pageCount
          )
        }

        if (!pageResult) {
          suspectedBlock = true
          this.log('인스타 API 응답 없음', `@${targetUsername} 팔로워 API 재시도 실패`, false)
          break
        }
        if (pageResult.error) {
          suspectedBlock = true
          this.log('팔로워 API 실패', `@${targetUsername} ${pageResult.error}`, false)
          break
        }

        const { users, nextMaxId } = pageResult
        nextCursor = nextMaxId

        if (users.length > 0) {
          const remaining = dailyLimit - insertedCount
          const toSave = users.slice(0, remaining).map((u) => u.username)
          const saved = await this.saveFollowers(targetUsername, targetGroup, toSave)
          insertedCount += saved
          recentlyCollected.push(...toSave.slice(0, 5))
          if (recentlyCollected.length > 20)
            recentlyCollected.splice(0, recentlyCollected.length - 20)

          this.options.onTargetStatusUpdate?.(targetUsername, {
            status: 'processing',
            followerCount: followerCount ?? undefined,
            collectedCount: await this.countCollectedFollowers(targetUsername)
          })
          if (saved > 0) {
            this.log('팔로워 저장', `@${targetUsername} 신규 ${saved}명 (총 ${insertedCount}명)`)
          }
        }

        if (!nextMaxId) {
          stoppedByEnd = true
          this.log('팔로워 목록 끝 감지', `@${targetUsername}`)
          break
        }
        cursor = nextMaxId

        // 증분 커서 저장: 루프 도중 중단/크래시 시에도 진행분 보존 (best-effort).
        // updateJob 자체가 재시도+에러 삼킴이라 실패해도 루프는 계속.
        collectPageCounter++
        if (collectPageCounter % CURSOR_SAVE_EVERY_N_PAGES === 0) {
          await this.updateJob(jobId, {
            next_cursor: cursor,
            last_run_at: new Date().toISOString()
          })
        }
      } else {
        try {
          if (step === 'feed') {
            await this.browseFeed(false)
          } else if (step === 'feed_click') {
            await this.browseFeed(true)
          } else if (step === 'hashtag') {
            await this.browseHashtag(false)
          } else {
            await this.browseHashtag(true)
          }
        } catch {
          // 브라우징 실패해도 계속 진행
        }
      }
    }

    return {
      insertedCount,
      followerCount,
      stoppedByEnd,
      suspectedBlock,
      nextCursor: stoppedByEnd ? null : nextCursor,
      targetUserId
    }
  }

  private async browseFeed(withClick: boolean): Promise<void> {
    this.log('브라우징', withClick ? '피드 게시물 클릭' : '피드 스크롤')
    await this.page.goto('https://www.instagram.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })
    await this.page.waitForTimeout(2000 + Math.floor(Math.random() * 2000))

    // 3~6회 스크롤 (무한스크롤 피드 API 자동 호출)
    const scrollCount = 3 + Math.floor(Math.random() * 4)
    for (let i = 0; i < scrollCount; i++) {
      if (!this.running) break
      await this.page.evaluate((y) => window.scrollBy(0, y), 350 + Math.floor(Math.random() * 400))
      await this.page.waitForTimeout(1500 + Math.floor(Math.random() * 3000))
    }

    if (withClick) {
      try {
        const posts = await this.page.locator('main article a[href*="/p/"]').all()
        if (posts.length > 0) {
          const idx = Math.floor(Math.random() * Math.min(posts.length, 5))
          await posts[idx].click()
          await this.page.waitForTimeout(3000 + Math.floor(Math.random() * 4000))

          const scrollCount2 = 1 + Math.floor(Math.random() * 3)
          for (let i = 0; i < scrollCount2; i++) {
            await this.page.keyboard.press('ArrowDown')
            await this.page.waitForTimeout(800 + Math.floor(Math.random() * 1500))
          }
          await this.page.keyboard.press('Escape')
          await this.page.waitForTimeout(1500)
        }
      } catch {
        // 클릭 실패 시 무시
      }
    }

    const readTime = 10000 + Math.floor(Math.random() * 20000)
    this.log('브라우징 대기', `피드 ${Math.round(readTime / 1000)}초`)
    await this.page.waitForTimeout(readTime)
  }

  private async browseHashtag(withClick: boolean): Promise<void> {
    const hashtags = [
      '고양이',
      '강아지',
      '맛집',
      '카페',
      '여행',
      '일상',
      '패션',
      '뷰티',
      '운동',
      '음식',
      '인테리어',
      '자연',
      '사진',
      '셀스타그램',
      '감성'
    ]
    const tag = hashtags[Math.floor(Math.random() * hashtags.length)]
    this.log('브라우징', `해시태그 #${tag}${withClick ? ' 게시물 클릭' : ' 스크롤'}`)

    await this.page.goto(`https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })
    await this.page.waitForTimeout(2000 + Math.floor(Math.random() * 2000))

    // 스크롤 (무한스크롤 API 호출)
    const scrollCount = 2 + Math.floor(Math.random() * 4)
    for (let i = 0; i < scrollCount; i++) {
      if (!this.running) break
      await this.page.evaluate(() => window.scrollBy(0, 400 + Math.floor(Math.random() * 400)))
      await this.page.waitForTimeout(1500 + Math.floor(Math.random() * 2500))
    }

    if (withClick) {
      try {
        const posts = await this.page.locator('main a[href*="/p/"]').all()
        if (posts.length > 0) {
          const idx = Math.floor(Math.random() * Math.min(posts.length, 9))
          await posts[idx].click()
          await this.page.waitForTimeout(3000 + Math.floor(Math.random() * 4000))

          const scrollCount2 = 1 + Math.floor(Math.random() * 3)
          for (let i = 0; i < scrollCount2; i++) {
            await this.page.keyboard.press('ArrowDown')
            await this.page.waitForTimeout(800 + Math.floor(Math.random() * 1500))
          }
          await this.page.keyboard.press('Escape')
          await this.page.waitForTimeout(1500 + Math.floor(Math.random() * 1500))
        }
      } catch {
        // 클릭 실패 시 무시
      }
    }

    const readTime = 10000 + Math.floor(Math.random() * 20000)
    this.log('브라우징 대기', `해시태그 ${Math.round(readTime / 1000)}초`)
    await this.page.waitForTimeout(readTime)
  }

  private async fetchProfileInfo(
    username: string
  ): Promise<{ userId: string; followerCount: number | null } | null> {
    return await this.page.evaluate(async (username) => {
      try {
        const csrfToken =
          document.cookie
            .split('; ')
            .find((row) => row.startsWith('csrftoken='))
            ?.split('=')[1] ?? ''

        const res = await fetch(
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
          {
            headers: {
              'x-ig-app-id': '936619743392459',
              'x-requested-with': 'XMLHttpRequest',
              'x-csrftoken': csrfToken
            },
            credentials: 'include'
          }
        )
        if (!res.ok) return null
        const data = await res.json()
        const user = data?.data?.user
        if (!user?.id) return null
        return {
          userId: String(user.id),
          followerCount: user.edge_followed_by?.count ?? null
        }
      } catch {
        return null
      }
    }, username)
  }

  private async fetchFollowersPage(
    userId: string,
    targetUsername: string,
    cursor: string | null,
    count: number = 12
  ): Promise<{
    users: Array<{ username: string }>
    nextMaxId: string | null
    error?: string
  } | null> {
    return await this.page.evaluate(
      async ({ userId, targetUsername, cursor, count }) => {
        const csrfToken =
          document.cookie
            .split('; ')
            .find((row) => row.startsWith('csrftoken='))
            ?.split('=')[1] ?? ''
        const referer = `https://www.instagram.com/${targetUsername}/followers/`

        const commonHeaders = {
          'x-ig-app-id': '936619743392459',
          'x-requested-with': 'XMLHttpRequest',
          'x-csrftoken': csrfToken,
          Referer: referer,
          'x-ig-www-claim': sessionStorage.getItem('www-claim-v2') ?? ''
        }

        try {
          const url = new URL(`https://www.instagram.com/api/v1/friendships/${userId}/followers/`)
          url.searchParams.set('count', String(count))
          if (cursor) url.searchParams.set('max_id', cursor)

          const res = await fetch(url.toString(), {
            headers: commonHeaders,
            credentials: 'include'
          })

          if (!res.ok) {
            const body = await res.text().catch(() => '')
            return {
              users: [],
              nextMaxId: null,
              error: `HTTP ${res.status}${body ? ` - ${body.slice(0, 200)}` : ''}`
            }
          }

          const data = await res.json()
          const users: Array<{ username: string }> = (data.users ?? []).map((u: any) => ({
            username: String(u.username)
          }))
          const nextMaxId: string | null = data.next_max_id ?? null
          return { users, nextMaxId }
        } catch {
          return null
        }
      },
      { userId, targetUsername, cursor, count }
    )
  }

  private async saveFollowers(
    targetUsername: string,
    targetGroup: string | null,
    followerUsernames: string[]
  ): Promise<number> {
    const unique = Array.from(
      new Set(followerUsernames.map((u) => this.normalizeUsername(u)).filter(Boolean))
    )
    if (unique.length === 0) return 0

    const rows = unique.map((username) => ({
      app_user_id: this.options.appUserId,
      app_user_email: this.options.appUserEmail,
      target_username: targetUsername,
      target_group: targetGroup,
      follower_username: username,
      follower_profile_url: `https://www.instagram.com/${username}/`,
      source: 'target_followers_api',
      collected_at: new Date().toISOString()
    }))

    const beforeCount = await this.countCollectedFollowers(targetUsername)
    // cursor 기반 페이지네이션이라 중복 없음, 혹시 모를 재시도 대비 ignoreDuplicates
    const { error } = await this.withSupabaseRetry(
      () =>
        this.supabase.from('target_followers').upsert(rows, {
          onConflict: 'app_user_id,target_username,follower_username',
          ignoreDuplicates: true
        }),
      `saveFollowers @${targetUsername} (${rows.length}건)`
    )

    if (error) {
      this.log('팔로워 저장 실패', error.message, false)
      return 0
    }

    const afterCount = await this.countCollectedFollowers(targetUsername)
    return Math.max(0, afterCount - beforeCount)
  }

  private async loadOrCreateJob(
    targetUsername: string,
    targetGroup: string | null
  ): Promise<CollectionJob> {
    const { data: existing, error: fetchError } = await this.withSupabaseRetry(
      () =>
        this.supabase
          .from('target_follower_collection_jobs')
          .select('*')
          .eq('app_user_id', this.options.appUserId)
          .eq('target_username', targetUsername)
          .maybeSingle(),
      `loadOrCreateJob.select @${targetUsername}`
    )

    if (fetchError) {
      throw new Error(`수집 작업 조회 실패: ${fetchError.message}`)
    }

    if (existing) {
      if ((existing as CollectionJob).target_group !== targetGroup) {
        await this.updateJob((existing as CollectionJob).id, { target_group: targetGroup })
      }
      return {
        ...(existing as CollectionJob),
        target_group: targetGroup
      }
    }

    const { data, error } = await this.withSupabaseRetry(
      () =>
        this.supabase
          .from('target_follower_collection_jobs')
          .insert({
            app_user_id: this.options.appUserId,
            app_user_email: this.options.appUserEmail,
            target_username: targetUsername,
            target_group: targetGroup,
            status: 'pending'
          })
          .select('*')
          .single(),
      `loadOrCreateJob.insert @${targetUsername}`
    )

    if (error) {
      throw new Error(`수집 작업 생성 실패: ${error.message}`)
    }

    return data as CollectionJob
  }

  private async updateJob(jobId: number, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.withSupabaseRetry(
      () =>
        this.supabase
          .from('target_follower_collection_jobs')
          .update({
            ...patch,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId),
      `updateJob #${jobId}`
    )

    if (error) {
      this.log('수집 작업 상태 저장 실패', error.message, false)
    }
  }

  private async countCollectedFollowers(targetUsername: string): Promise<number> {
    const { count, error } = await this.withSupabaseRetry(
      () =>
        this.supabase
          .from('target_followers')
          .select('id', { count: 'exact', head: true })
          .eq('app_user_id', this.options.appUserId)
          .eq('target_username', targetUsername),
      `countCollectedFollowers @${targetUsername}`
    )

    if (error) {
      this.log('누적 수집 수 조회 실패', error.message, false)
      return 0
    }

    return count ?? 0
  }

  private getNextRunAt(): Date {
    return new Date(Date.now() + FOLLOWER_COLLECTION_RETRY_DELAY_HOURS * 60 * 60 * 1000)
  }

  private normalizeUsername(value: string): string {
    return value
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/^@/, '')
      .split(/[/?#]/)[0]
      .replace(/\s+/g, '')
      .toLowerCase()
  }
}
