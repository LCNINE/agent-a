import { Page } from 'playwright-core'
import { SupabaseClient } from '@supabase/supabase-js'
import { TargetFollowerCollectionTarget } from '../../..'

type SupabaseClientAny = SupabaseClient<any>
type LogCallback = (action: string, details?: string, success?: boolean) => void

interface TargetFollowerCollectionOptions {
  appUserId: string
  appUserEmail: string
  dailyLimit: number
  minDailyLimit: number
  onLog?: LogCallback
  onTargetStatusUpdate?: (
    username: string,
    patch: Partial<TargetFollowerCollectionTarget>
  ) => void
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
  configured_daily_limit: number
  adaptive_daily_limit: number
  scroll_delay_ms: number
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

  constructor(
    page: Page,
    supabase: SupabaseClientAny,
    options: TargetFollowerCollectionOptions
  ) {
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
      const now = Date.now()
      const nextRunAt = job.next_run_at ? new Date(job.next_run_at).getTime() : null

      if (nextRunAt && nextRunAt > now && job.status !== 'pending') {
        this.options.onTargetStatusUpdate?.(targetUsername, {
          status: 'waiting',
          followerCount: job.target_follower_count ?? undefined,
          collectedCount: job.collected_count,
          nextRunAt
        })
        this.log('다음날 대기 중', `@${targetUsername} - ${new Date(nextRunAt).toLocaleString()}`)
        return
      }

      if (
        job.target_follower_count !== null &&
        job.target_follower_count > 0 &&
        job.collected_count >= job.target_follower_count
      ) {
        await this.updateJob(job.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          next_run_at: null,
          last_error: null
        })
        this.options.onTargetStatusUpdate?.(targetUsername, {
          status: 'completed',
          followerCount: job.target_follower_count,
          collectedCount: job.collected_count,
          nextRunAt: undefined,
          error: undefined
        })
        this.log('이미 수집 완료', `@${targetUsername} ${job.collected_count}/${job.target_follower_count}`)
        return
      }

      const alreadyCollected = await this.countCollectedFollowers(targetUsername)
      const dailyLimit = this.resolveDailyLimit(job)

      // 직전에 차단 등으로 한도가 줄어든 경우 cursor도 초기화하여 처음부터 재수집
      const forceFresh =
        job.configured_daily_limit > 0 &&
        job.adaptive_daily_limit > 0 &&
        job.adaptive_daily_limit < job.configured_daily_limit

      const savedCursor = forceFresh ? null : (job.next_cursor || null)
      const savedUserId = forceFresh ? null : (job.target_user_id || null)

      this.options.onTargetStatusUpdate?.(targetUsername, {
        status: 'processing',
        followerCount: job.target_follower_count ?? undefined,
        collectedCount: alreadyCollected,
        error: undefined
      })

      this.log(
        '타겟 팔로워 수집 시작',
        `@${targetUsername} 하루 상한 ${dailyLimit}명${forceFresh ? ' (직전 차단/부진으로 cursor 초기화 후 재수집)' : savedCursor ? ' (이어서 수집)' : ''}`
      )

      const result = await this.collectFollowers(
        targetUsername,
        targetGroup,
        dailyLimit,
        alreadyCollected,
        job.scroll_delay_ms,
        savedCursor,
        savedUserId
      )

      const totalCollected = await this.countCollectedFollowers(targetUsername)
      const followerCount = result.followerCount ?? job.target_follower_count
      const isComplete = (result.stoppedByEnd && result.nextCursor === null) ||
        (followerCount !== null && followerCount > 0 && totalCollected >= followerCount)
      const nextRun = isComplete ? null : this.getNextRunAt()
      const adaptive = this.getNextAdaptiveSettings(job, result)

      if (adaptive.dailyLimit < dailyLimit) {
        this.log(
          '수집 한도 축소',
          `@${targetUsername} ${dailyLimit} → ${adaptive.dailyLimit}명 (${result.suspectedBlock ? '차단 의심' : '수집 부진'}, 다음 작업부터 적용)`,
          false
        )
      }

      await this.updateJob(job.id, {
        target_follower_count: followerCount,
        target_group: targetGroup,
        target_user_id: result.targetUserId ?? job.target_user_id,
        collected_count: totalCollected,
        configured_daily_limit: this.options.dailyLimit,
        adaptive_daily_limit: adaptive.dailyLimit,
        scroll_delay_ms: adaptive.scrollDelayMs,
        next_cursor: isComplete ? null : result.nextCursor,
        status: isComplete ? 'completed' : 'waiting',
        last_error: null,
        last_run_at: new Date().toISOString(),
        next_run_at: nextRun ? nextRun.toISOString() : null,
        completed_at: isComplete ? new Date().toISOString() : null,
        app_user_email: this.options.appUserEmail
      })

      this.options.onTargetStatusUpdate?.(targetUsername, {
        status: isComplete ? 'completed' : 'waiting',
        followerCount: followerCount ?? undefined,
        collectedCount: totalCollected,
        nextRunAt: nextRun?.getTime(),
        processedAt: Date.now(),
        error: undefined
      })

      this.log(
        isComplete ? '타겟 팔로워 수집 완료' : '타겟 팔로워 수집 일일 작업 완료',
        `@${targetUsername} 신규 ${result.insertedCount}명, 누적 ${totalCollected}${followerCount ? `/${followerCount}` : ''}`,
        true
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.log('타겟 팔로워 수집 실패', `@${targetUsername}: ${message}`, false)

      if (job) {
        const reducedLimit = this.reduceDailyLimit(job.adaptive_daily_limit || this.options.dailyLimit)
        const slowerDelay = Math.min(6000, (job.scroll_delay_ms || 1800) + 800)
        // 에러 시 cursor는 유지 (다음 실행 시 이어서 재시도)
        await this.updateJob(job.id, {
          status: 'failed',
          last_error: message,
          adaptive_daily_limit: reducedLimit,
          scroll_delay_ms: slowerDelay,
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
    dailyLimit: number,
    alreadyCollected: number,
    requestDelayMs: number,
    savedCursor: string | null,
    savedUserId: string | null
  ): Promise<CollectionResult> {
    // instagram.com 도메인에 있어야 fetch 시 쿠키가 포함됨
    const currentUrl = this.page.url()
    if (!currentUrl.includes('instagram.com')) {
      await this.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await this.page.waitForTimeout(2000)
    }

    // user_id 취득 (저장된 게 없으면 API로 조회)
    let targetUserId = savedUserId
    let followerCount: number | null = null

    if (!targetUserId) {
      const profileInfo = await this.fetchProfileInfo(targetUsername)
      if (!profileInfo) {
        throw new Error('프로필 정보 조회 실패 (로그인 상태 확인 필요)')
      }
      targetUserId = profileInfo.userId
      followerCount = profileInfo.followerCount
      this.log('유저 ID 취득', `@${targetUsername}: ${targetUserId}, 팔로워 ${followerCount?.toLocaleString() ?? '?'}명`)
    }

    let cursor: string | null = savedCursor
    let insertedCount = 0
    let stoppedByEnd = false
    let suspectedBlock = false
    let nextCursor: string | null = cursor

    while (this.running && insertedCount < dailyLimit) {
      const pageResult = await this.fetchFollowersPage(targetUserId, cursor)

      if (!pageResult) {
        // API 요청 실패 = 차단 또는 세션 만료 의심
        suspectedBlock = true
        this.log(
          '인스타 API 차단 의심',
          `@${targetUsername} 팔로워 API 요청 실패 — 한도 축소 예정`,
          false
        )
        break
      }

      const { users, nextMaxId } = pageResult
      nextCursor = nextMaxId

      if (users.length > 0) {
        const remaining = dailyLimit - insertedCount
        const toSave = users.slice(0, remaining).map((u) => u.username)
        const saved = await this.saveFollowers(targetUsername, targetGroup, toSave)
        insertedCount += saved

        this.options.onTargetStatusUpdate?.(targetUsername, {
          status: 'processing',
          followerCount: followerCount ?? undefined,
          collectedCount: alreadyCollected + insertedCount
        })

        if (saved > 0) {
          this.log('팔로워 저장', `@${targetUsername} 신규 ${saved}명 (${insertedCount}/${dailyLimit})`)
        }
      }

      if (insertedCount >= dailyLimit) break

      if (!nextMaxId) {
        stoppedByEnd = true
        this.log('팔로워 목록 끝 감지', `@${targetUsername} 누적 ${alreadyCollected + insertedCount}명`)
        break
      }

      cursor = nextMaxId

      // 요청 간 랜덤 딜레이 (봇 감지 회피)
      await this.page.waitForTimeout(this.randomDelay(requestDelayMs))
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

  // 브라우저 세션(쿠키) 그대로 사용해서 user_id + 팔로워 수 조회
  private async fetchProfileInfo(
    username: string
  ): Promise<{ userId: string; followerCount: number | null } | null> {
    return await this.page.evaluate(async (username) => {
      try {
        const csrfToken =
          document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1] ?? ''

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

  // 팔로워 목록 한 페이지 요청 (최대 200명, cursor 기반 이어서 수집)
  private async fetchFollowersPage(
    userId: string,
    cursor: string | null
  ): Promise<{ users: Array<{ username: string }>; nextMaxId: string | null } | null> {
    return await this.page.evaluate(
      async ({ userId, cursor }) => {
        try {
          const csrfToken =
            document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1] ?? ''

          const url = new URL(`https://www.instagram.com/api/v1/friendships/${userId}/followers/`)
          url.searchParams.set('count', '200')
          if (cursor) url.searchParams.set('max_id', cursor)

          const res = await fetch(url.toString(), {
            headers: {
              'x-ig-app-id': '936619743392459',
              'x-requested-with': 'XMLHttpRequest',
              'x-csrftoken': csrfToken
            },
            credentials: 'include'
          })

          if (!res.ok) return null

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
      { userId, cursor }
    )
  }

  // 랜덤 딜레이: base의 100%~350% 범위
  private randomDelay(baseMs: number): number {
    const base = Math.max(3000, baseMs)
    const min = Math.floor(base * 1.0)
    const max = Math.floor(base * 3.5)
    return min + Math.floor(Math.random() * (max - min))
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
    const { error } = await this.supabase
      .from('target_followers')
      .upsert(rows, {
        onConflict: 'app_user_id,target_username,follower_username'
      })

    if (error) {
      this.log('팔로워 저장 실패', error.message, false)
      return 0
    }

    const afterCount = await this.countCollectedFollowers(targetUsername)
    return Math.max(0, afterCount - beforeCount)
  }

  private async loadOrCreateJob(targetUsername: string, targetGroup: string | null): Promise<CollectionJob> {
    const { data: existing, error: fetchError } = await this.supabase
      .from('target_follower_collection_jobs')
      .select('*')
      .eq('app_user_id', this.options.appUserId)
      .eq('target_username', targetUsername)
      .maybeSingle()

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

    const { data, error } = await this.supabase
      .from('target_follower_collection_jobs')
      .insert({
        app_user_id: this.options.appUserId,
        app_user_email: this.options.appUserEmail,
        target_username: targetUsername,
        target_group: targetGroup,
        configured_daily_limit: this.options.dailyLimit,
        adaptive_daily_limit: this.options.dailyLimit,
        scroll_delay_ms: 3000,
        status: 'pending'
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(`수집 작업 생성 실패: ${error.message}`)
    }

    return data as CollectionJob
  }

  private async updateJob(jobId: number, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase
      .from('target_follower_collection_jobs')
      .update({
        ...patch,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      this.log('수집 작업 상태 저장 실패', error.message, false)
    }
  }

  private async countCollectedFollowers(targetUsername: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('target_followers')
      .select('id', { count: 'exact', head: true })
      .eq('app_user_id', this.options.appUserId)
      .eq('target_username', targetUsername)

    if (error) {
      this.log('누적 수집 수 조회 실패', error.message, false)
      return 0
    }

    return count ?? 0
  }

  private resolveDailyLimit(job: CollectionJob): number {
    const configured = Math.max(1, this.options.dailyLimit)
    const adaptive = Math.max(1, job.adaptive_daily_limit || configured)
    return Math.min(configured, Math.max(this.options.minDailyLimit, adaptive))
  }

  private getNextAdaptiveSettings(
    job: CollectionJob,
    result: CollectionResult
  ): { dailyLimit: number; scrollDelayMs: number } {
    const configured = Math.max(1, this.options.dailyLimit)
    const currentLimit = Math.min(
      configured,
      Math.max(this.options.minDailyLimit, job.adaptive_daily_limit || configured)
    )

    if (
      result.suspectedBlock ||
      result.insertedCount === 0 ||
      (result.stoppedByEnd && result.insertedCount < currentLimit)
    ) {
      return {
        dailyLimit: this.reduceDailyLimit(currentLimit),
        scrollDelayMs: Math.min(8000, (job.scroll_delay_ms || 3000) + 800)
      }
    }

    if (result.insertedCount >= currentLimit && currentLimit < configured) {
      return {
        dailyLimit: Math.min(configured, Math.ceil(currentLimit * 1.1)),
        scrollDelayMs: Math.max(1600, (job.scroll_delay_ms || 2000) - 200)
      }
    }

    return {
      dailyLimit: currentLimit,
      scrollDelayMs: job.scroll_delay_ms || 2000
    }
  }

  private reduceDailyLimit(currentLimit: number): number {
    return Math.max(this.options.minDailyLimit, Math.floor(currentLimit * 0.8))
  }

  private getNextRunAt(): Date {
    const next = new Date()
    next.setDate(next.getDate() + 1)
    next.setHours(9, 0, 0, 0)
    return next
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
