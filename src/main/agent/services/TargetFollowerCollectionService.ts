import { Page } from 'playwright-core'
import { SupabaseClient } from '@supabase/supabase-js'
import { TargetFollowerCollectionTarget } from '../../..'

type SupabaseClientAny = SupabaseClient<any>
type LogCallback = (action: string, details?: string, success?: boolean) => void

interface TargetFollowerCollectionOptions {
  appUserId: string
  appUserEmail: string
  dailyLimit: number
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

      const alreadyCollected = await this.countCollectedFollowers(targetUsername)

      this.options.onTargetStatusUpdate?.(targetUsername, {
        status: 'processing',
        followerCount: job.target_follower_count ?? undefined,
        collectedCount: alreadyCollected,
        error: undefined
      })

      this.log('타겟 팔로워 수집 시작', `@${targetUsername}${job.next_cursor ? ' (이어서 수집)' : ''}`)

      const result = await this.collectFollowers(
        targetUsername,
        targetGroup,
        job.next_cursor || null,
        job.target_user_id || null
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
    savedUserId: string | null
  ): Promise<CollectionResult> {
    const currentUrl = this.page.url()
    if (!currentUrl.includes('instagram.com')) {
      await this.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
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
      this.log('유저 ID 취득', `@${targetUsername}: ${targetUserId}, 팔로워 ${followerCount?.toLocaleString() ?? '?'}명`)
    }

    let cursor: string | null = savedCursor
    let insertedCount = 0
    let stoppedByEnd = false
    let suspectedBlock = false
    let nextCursor: string | null = cursor
    const recentlyCollected: string[] = []
    const dailyLimit = this.options.dailyLimit

    while (this.running && insertedCount < dailyLimit) {
      // 한 번에 30~50명 랜덤 요청
      const pageCount = 30 + Math.floor(Math.random() * 21)
      const pageResult = await this.fetchFollowersPage(targetUserId, cursor, pageCount)

      if (!pageResult) {
        suspectedBlock = true
        this.log('인스타 API 차단 의심', `@${targetUsername} 팔로워 API 요청 실패`, false)
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
        if (recentlyCollected.length > 20) recentlyCollected.splice(0, recentlyCollected.length - 20)

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

      if (this.running) {
        await this.browseRandomly(recentlyCollected)
        // 브라우징 후 instagram.com 도메인 확인
        if (!this.page.url().includes('instagram.com')) {
          await this.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
          await this.page.waitForTimeout(2000)
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

  private async browseRandomly(collectedUsernames: string[]): Promise<void> {
    // 피드 40%, 탐색 30%, 수집한 프로필 30%
    const weights = [4, 3, 3]
    const total = weights.reduce((a, b) => a + b, 0)
    let rand = Math.random() * total
    let choice: 'feed' | 'explore' | 'profile' = 'feed'

    if (rand < weights[0]) {
      choice = 'feed'
    } else if (rand < weights[0] + weights[1]) {
      choice = 'explore'
    } else {
      choice = collectedUsernames.length > 0 ? 'profile' : 'feed'
    }

    try {
      if (choice === 'profile' && collectedUsernames.length > 0) {
        const randomUser = collectedUsernames[Math.floor(Math.random() * collectedUsernames.length)]
        this.log('랜덤 브라우징', `프로필 방문: @${randomUser}`)
        await this.page.goto(`https://www.instagram.com/${randomUser}/`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        })
      } else if (choice === 'explore') {
        this.log('랜덤 브라우징', '탐색 페이지 방문')
        await this.page.goto('https://www.instagram.com/explore/', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        })
      } else {
        this.log('랜덤 브라우징', '피드 방문')
        await this.page.goto('https://www.instagram.com/', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        })
      }

      await this.page.waitForTimeout(2000 + Math.floor(Math.random() * 2000))

      // 1~4회 랜덤 스크롤
      const scrollCount = 1 + Math.floor(Math.random() * 4)
      for (let i = 0; i < scrollCount; i++) {
        await this.page.evaluate(() => {
          window.scrollBy(0, 300 + Math.floor(Math.random() * 400))
        })
        await this.page.waitForTimeout(1500 + Math.floor(Math.random() * 2500))
      }

      // 30~120초 랜덤 대기
      const browseTime = 30000 + Math.floor(Math.random() * 90000)
      this.log('브라우징 대기', `${Math.round(browseTime / 1000)}초`)
      await this.page.waitForTimeout(browseTime)
    } catch {
      // 브라우징 실패해도 수집 계속 진행
    }
  }

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

  private async fetchFollowersPage(
    userId: string,
    cursor: string | null,
    count: number = 50
  ): Promise<{ users: Array<{ username: string }>; nextMaxId: string | null } | null> {
    return await this.page.evaluate(
      async ({ userId, cursor, count }) => {
        try {
          const csrfToken =
            document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1] ?? ''

          const url = new URL(`https://www.instagram.com/api/v1/friendships/${userId}/followers/`)
          url.searchParams.set('count', String(count))
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
      { userId, cursor, count }
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
