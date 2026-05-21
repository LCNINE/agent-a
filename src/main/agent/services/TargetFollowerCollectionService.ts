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
  collected_count: number
  configured_daily_limit: number
  adaptive_daily_limit: number
  scroll_delay_ms: number
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
      this.options.onTargetStatusUpdate?.(targetUsername, {
        status: 'processing',
        followerCount: job.target_follower_count ?? undefined,
        collectedCount: alreadyCollected,
        error: undefined
      })

      this.log('타겟 팔로워 수집 시작', `@${targetUsername} 하루 상한 ${dailyLimit}명`)

      const result = await this.collectFollowers(targetUsername, targetGroup, dailyLimit, alreadyCollected, job.scroll_delay_ms)
      const totalCollected = await this.countCollectedFollowers(targetUsername)
      const followerCount = result.followerCount ?? job.target_follower_count
      const isComplete = followerCount !== null && followerCount > 0 && totalCollected >= followerCount
      const nextRun = isComplete ? null : this.getNextRunAt()
      const adaptive = this.getNextAdaptiveSettings(job, result)

      await this.updateJob(job.id, {
        target_follower_count: followerCount,
        target_group: targetGroup,
        collected_count: totalCollected,
        configured_daily_limit: this.options.dailyLimit,
        adaptive_daily_limit: adaptive.dailyLimit,
        scroll_delay_ms: adaptive.scrollDelayMs,
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
    scrollDelayMs: number
  ): Promise<CollectionResult> {
    const reusableDialog = await this.getReusableFollowersDialog(targetUsername)
    const reusedOpenDialog = Boolean(reusableDialog)
    let followerCount: number | null = null
    let dialog = reusableDialog

    if (dialog) {
      this.log('열린 팔로워 창 재사용', `@${targetUsername}`)
      followerCount = await this.getFollowerCount(targetUsername)
    } else {
      const profileUrl = `https://www.instagram.com/${targetUsername}/`
      await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

      if (!(await this.waitForProfileLoad())) {
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
        if (!(await this.waitForProfileLoad())) {
          throw new Error('프로필 페이지 로드 실패')
        }
      }

      const accountStatus = await this.checkAccountStatus()
      if (accountStatus !== 'accessible') {
        throw new Error(accountStatus === 'private' ? '비공개 계정입니다' : '존재하지 않는 계정입니다')
      }

      followerCount = await this.getFollowerCount(targetUsername)
      this.log('팔로워 수 확인', followerCount === null ? '@' + targetUsername : `@${targetUsername}: ${followerCount.toLocaleString()}명`)

      await this.openFollowersDialog(targetUsername)
      dialog = this.page.locator('[role="dialog"]').last()
      this.log('팔로워 창 새로 열기', `@${targetUsername} 처음부터 오늘 작업량 기준으로 수집`)
    }

    await dialog.waitFor({ state: 'visible', timeout: 10000 })
    await this.page.waitForTimeout(2000)

    let insertedCount = 0
    let rounds = 0
    let stagnantRounds = 0
    let lastScrollTop = -1
    let stoppedByEnd = false
    const attemptedThisRun = new Set<string>()
    const maxScrollRounds = this.resolveMaxScrollRounds(dailyLimit)

    while (this.running && insertedCount < dailyLimit && rounds < maxScrollRounds) {
      rounds++

      const usernames = await this.extractFollowerUsernames(dialog)
      const candidates = usernames.filter((username) => {
        if (attemptedThisRun.has(username)) return false
        attemptedThisRun.add(username)
        return true
      })

      if (candidates.length > 0) {
        const remaining = dailyLimit - insertedCount
        const saved = await this.saveFollowers(targetUsername, targetGroup, candidates.slice(0, remaining))
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

      const scrollState = await this.scrollFollowersDialog(dialog)
      await this.page.waitForTimeout(this.withJitter(scrollDelayMs))

      const scrollMoved = Math.abs(scrollState.after - lastScrollTop) > 4
      if (!scrollMoved || scrollState.atBottom) {
        stagnantRounds++
      } else {
        stagnantRounds = 0
      }

      lastScrollTop = scrollState.after

      if (stagnantRounds >= 6) {
        stoppedByEnd = true
        this.log('팔로워 목록 끝 감지', `@${targetUsername} 스크롤 ${rounds}회`)
        break
      }
    }

    this.log(
      '팔로워 창 유지',
      reusedOpenDialog
        ? `@${targetUsername} 열린 위치에서 수집 후 유지`
        : `@${targetUsername} 새로 연 창을 다음 수집 때 재사용할 수 있게 유지`
    )

    if (rounds >= maxScrollRounds && insertedCount < dailyLimit) {
      this.log('스크롤 안전 한도 도달', `@${targetUsername} ${rounds}/${maxScrollRounds}회`)
    }

    return {
      insertedCount,
      followerCount,
      stoppedByEnd
    }
  }

  private async openFollowersDialog(targetUsername: string): Promise<void> {
    const selectors = [
      `header a[href*="/${targetUsername}/followers/"]`,
      'header a[href*="/followers/"]',
      'a[href*="/followers/"]'
    ]

    for (const selector of selectors) {
      const link = this.page.locator(selector).first()
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click()
        return
      }
    }

    const followerText = this.page
      .locator('header a, header button, header div[role="button"]')
      .filter({ hasText: /팔로워|followers/i })
      .first()

    if (await followerText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await followerText.click()
      return
    }

    throw new Error('팔로워 버튼을 찾을 수 없습니다')
  }

  private async getReusableFollowersDialog(targetUsername: string): Promise<ReturnType<Page['locator']> | null> {
    const currentUrl = this.page.url()
    if (!currentUrl.includes(`/${targetUsername}/followers`)) {
      return null
    }

    const dialog = this.page.locator('[role="dialog"]').last()
    if (!(await dialog.isVisible({ timeout: 1000 }).catch(() => false))) {
      return null
    }

    const usernames = await this.extractFollowerUsernames(dialog)
    return usernames.length > 0 ? dialog : null
  }

  private async extractFollowerUsernames(dialog: ReturnType<Page['locator']>): Promise<string[]> {
    const rawLinks = await dialog.locator('a[href^="/"]').evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute('href') || '',
        text: (link.textContent || '').trim()
      }))
    ).catch(() => [])

    const reserved = new Set([
      'about',
      'accounts',
      'direct',
      'explore',
      'p',
      'reel',
      'reels',
      'stories'
    ])

    const usernames = new Set<string>()

    for (const item of rawLinks) {
      const match = item.href.match(/^\/([A-Za-z0-9._]+)\/?$/)
      if (!match) continue

      const username = this.normalizeUsername(match[1])
      if (!username || reserved.has(username)) continue

      usernames.add(username)
    }

    return Array.from(usernames)
  }

  private async scrollFollowersDialog(dialog: ReturnType<Page['locator']>): Promise<{
    before: number
    after: number
    scrollHeight: number
    clientHeight: number
    atBottom: boolean
  }> {
    return await dialog.evaluate((element) => {
      const nodes = Array.from(element.querySelectorAll('div')) as HTMLElement[]
      const scrollable = nodes
        .filter((node) => node.scrollHeight > node.clientHeight + 80)
        .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || element as HTMLElement

      const before = scrollable.scrollTop
      const step = Math.max(320, Math.floor(scrollable.clientHeight * 0.85))
      scrollable.scrollTop = Math.min(scrollable.scrollTop + step, scrollable.scrollHeight)
      scrollable.dispatchEvent(new Event('scroll', { bubbles: true }))

      const after = scrollable.scrollTop
      const atBottom = after + scrollable.clientHeight >= scrollable.scrollHeight - 12

      return {
        before,
        after,
        scrollHeight: scrollable.scrollHeight,
        clientHeight: scrollable.clientHeight,
        atBottom
      }
    })
  }

  private async saveFollowers(
    targetUsername: string,
    targetGroup: string | null,
    followerUsernames: string[]
  ): Promise<number> {
    const unique = Array.from(new Set(followerUsernames.map((username) => this.normalizeUsername(username)).filter(Boolean)))
    if (unique.length === 0) return 0

    const rows = unique.map((username) => ({
      app_user_id: this.options.appUserId,
      app_user_email: this.options.appUserEmail,
      target_username: targetUsername,
      target_group: targetGroup,
      follower_username: username,
      follower_profile_url: `https://www.instagram.com/${username}/`,
      source: 'target_followers_modal',
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

  private async getFollowerCount(targetUsername: string): Promise<number | null> {
    const selectors = [
      `header a[href*="/${targetUsername}/followers/"]`,
      'header a[href*="/followers/"]',
      'a[href*="/followers/"]'
    ]

    for (const selector of selectors) {
      const text = await this.page.locator(selector).first().textContent({ timeout: 2000 }).catch(() => null)
      const parsed = this.parseFollowerCount(text)
      if (parsed !== null) return parsed
    }

    const headerText = await this.page.locator('header').first().innerText({ timeout: 3000 }).catch(() => '')
    return this.parseFollowerCount(headerText)
  }

  private parseFollowerCount(text?: string | null): number | null {
    if (!text) return null

    const normalized = text
      .replace(/,/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const patterns = [
      /팔로워\s*([0-9]+(?:\.[0-9]+)?)\s*(억|만|천|[kKmMbB])?/,
      /([0-9]+(?:\.[0-9]+)?)\s*(억|만|천|[kKmMbB])?\s*(followers|Follower|팔로워)/i,
      /([0-9]+(?:\.[0-9]+)?)\s*(억|만|천|[kKmMbB])?/
    ]

    for (const pattern of patterns) {
      const match = normalized.match(pattern)
      if (!match) continue

      const value = Number(match[1])
      if (Number.isNaN(value)) continue

      const unit = match[2] || ''
      const multiplier = this.getCountMultiplier(unit)
      return Math.round(value * multiplier)
    }

    return null
  }

  private getCountMultiplier(unit: string): number {
    const normalized = unit.toLowerCase()
    if (unit === '억' || normalized === 'b') return unit === '억' ? 100000000 : 1000000000
    if (unit === '만' || normalized === 'm') return unit === '만' ? 10000 : 1000000
    if (unit === '천' || normalized === 'k') return 1000
    return 1
  }

  private async waitForProfileLoad(): Promise<boolean> {
    const maxWaitTime = 30000
    const checkInterval = 3000
    let waited = 0

    while (waited < maxWaitTime) {
      await this.page.waitForTimeout(checkInterval)
      waited += checkInterval

      const bodyLength = await this.page.evaluate(() => document.body?.innerText?.length || 0).catch(() => 0)
      if (bodyLength >= 100) return true

      const pageText = await this.page.evaluate(() => document.body?.innerText || '').catch(() => '')
      if (pageText.includes('오류가 발생했습니다') || pageText.includes('Something went wrong')) {
        return false
      }
    }

    return false
  }

  private async checkAccountStatus(): Promise<'accessible' | 'private' | 'not_found'> {
    const notFound = await this.page
      .getByText(/페이지를 사용할 수 없습니다|Sorry, this page isn't available/i)
      .isVisible()
      .catch(() => false)

    if (notFound) return 'not_found'

    const isPrivate = await this.page
      .getByText(/비공개 계정|This account is private/i)
      .isVisible()
      .catch(() => false)

    return isPrivate ? 'private' : 'accessible'
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
        scroll_delay_ms: 1800,
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

  private getNextAdaptiveSettings(job: CollectionJob, result: CollectionResult): {
    dailyLimit: number
    scrollDelayMs: number
  } {
    const configured = Math.max(1, this.options.dailyLimit)
    const currentLimit = Math.min(configured, Math.max(this.options.minDailyLimit, job.adaptive_daily_limit || configured))

    if (result.insertedCount === 0 || (result.stoppedByEnd && result.insertedCount < currentLimit)) {
      return {
        dailyLimit: this.reduceDailyLimit(currentLimit),
        scrollDelayMs: Math.min(6000, (job.scroll_delay_ms || 1800) + 500)
      }
    }

    if (result.insertedCount >= currentLimit && currentLimit < configured) {
      return {
        dailyLimit: Math.min(configured, Math.ceil(currentLimit * 1.1)),
        scrollDelayMs: Math.max(1600, (job.scroll_delay_ms || 1800) - 200)
      }
    }

    return {
      dailyLimit: currentLimit,
      scrollDelayMs: job.scroll_delay_ms || 1800
    }
  }

  private reduceDailyLimit(currentLimit: number): number {
    return Math.max(this.options.minDailyLimit, Math.floor(currentLimit * 0.8))
  }

  private resolveMaxScrollRounds(dailyLimit: number): number {
    const estimatedRounds = Math.ceil(dailyLimit / 5) + 40
    return Math.min(300, Math.max(50, estimatedRounds))
  }

  private getNextRunAt(): Date {
    const next = new Date()
    next.setDate(next.getDate() + 1)
    next.setHours(9, 0, 0, 0)
    return next
  }

  private withJitter(valueMs: number): number {
    const base = Math.max(1000, valueMs || 1800)
    const jitter = Math.floor(Math.random() * 700)
    return base + jitter
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
