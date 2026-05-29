import { BrowserContext, Locator, Page } from 'playwright-core'
import { AgentConfig, WorkType, UserCollectionSettings, TargetFollowerCollectionTarget } from '../../..'
import { startBrowser } from '../common/browser'
import { loginWithCredentials, navigateToHome } from '../common/browserUtils'
import { checkedAction } from '../common/checkedAction'
import { callGenerateComments, callGenerateReply } from '../common/fetchers'
import { chooseRandomSleep, postInteractionDelays } from '../common/timeUtils'
import {
  loadCommentHistory,
  saveCommentHistory,
  hasCommentedOnPost,
  addCommentedPost,
  CommentHistory,
  hasCommentedOnPostSupabase,
  saveCommentToSupabase
} from '../common/commentHistory'
import { ArticleProcessingService } from '../services/ArticleProcessingService'
import { HashtagService } from '../services/HashtagProcessingService'
import { MyFeedInteractionService } from '../services/MyFeedInteractionService'
import { TargetUserProcessingService } from '../services/TargetUserProcessingService'
import { SuggestedUsersService } from '../services/SuggestedUsersService'
import { UserCollectionService } from '../services/UserCollectionService'
import { TargetFollowerCollectionService } from '../services/TargetFollowerCollectionService'
import { app, BrowserWindow } from 'electron'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../../renderer/src/supabase/database.types'
import { stopPowerSaveBlocker } from '../../index'

export interface WorkLog {
  timestamp: number
  action: string
  details?: string
  success?: boolean
}

export interface BotStatus {
  isRunning: boolean
  currentWork: WorkType | null
  waiting: {
    for: string
    until: string
  } | null
  logs?: WorkLog[]
  currentAction?: string
  isCollectingFollowers?: boolean
}

export class AgentManager {
  private browser: BrowserContext | null = null
  private page: Page | null = null
  private _status: BotStatus = {
    isRunning: false,
    currentWork: null,
    waiting: null,
    logs: [],
    currentAction: undefined
  }
  private currentWorkIndex = 0
  private excludeUsernames = new Set<string>()
  private commentHistory: CommentHistory = { commentedPosts: [], lastCleanup: Date.now() }
  private isLoggedIn: Boolean = false
  private mainWindow: BrowserWindow | null = null
  private userCollectionService: UserCollectionService | null = null
  private supabase = createClient<Database>(
    'https://xszdgbmgwnaxbyekqons.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzemRnYm1nd25heGJ5ZWtxb25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzODAxMDcsImV4cCI6MjA1Mzk1NjEwN30.S4fGG1sv9drG9f04ejWCpmeGyrLkRTdXnxq_UaZzlUg'
  )

  constructor(
    private works: WorkType,
    private config: AgentConfig,
    mainWindow?: BrowserWindow,
    private agentId?: string,
    private userId?: string,
    private userEmail?: string
  ) {
    this.excludeUsernames = new Set(this.config.excludeUsernames)
    this.mainWindow = mainWindow || BrowserWindow.getAllWindows()[0]
  }

  private addLog(action: string, details?: string, success?: boolean) {
    const log: WorkLog = {
      timestamp: Date.now(),
      action,
      details,
      success
    }

    if (this._status.logs && this._status.logs.length >= 100) {
      this._status.logs = [...this._status.logs.slice(-99), log]
    } else {
      this._status.logs = [...(this._status.logs || []), log]
    }

    this._status.currentAction = action

    this.broadcastStatus()
  }

  private broadcastStatus() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('agent:status-update', this.agentId || this.config.credentials.username, this._status)
    }
  }

  private async loadBlockedAccounts() {
    if (!this.userId) {
      console.warn('userId가 없어서 차단된 계정을 로드할 수 없습니다.')
      // userId가 없어도 본인 계정은 제외
      this.excludeUsernames.add(this.config.credentials.username)
      return
    }

    try {
      const { data, error } = await this.supabase
        .from('block_account')
        .select('block_ids')
        .eq('member_id', this.userId)
        .maybeSingle()

      if (error) {
        console.error('차단된 계정 로드 실패:', error)
        return
      }

      // 차단 목록이 없으면 빈 Set 유지
      if (!data) return

      if (data && data.block_ids) {
        // block_ids가 문자열인 경우 JSON 파싱
        const blockIds =
          typeof data.block_ids === 'string'
            ? (JSON.parse(data.block_ids) as string[])
            : data.block_ids
        this.excludeUsernames = new Set(blockIds)
      }

      // 본인 계정도 제외 목록에 추가 (본인 게시물에 댓글 방지)
      this.excludeUsernames.add(this.config.credentials.username)
    } catch (error) {
      console.error('차단된 계정 로드 중 오류:', error)
      // 에러 발생시에도 본인 계정은 제외
      this.excludeUsernames.add(this.config.credentials.username)
    }
  }

  private async updateBlockedAccounts(usernames: string[]) {
    if (!this.userId) {
      console.warn('userId가 없어서 차단된 계정을 업데이트할 수 없습니다.')
      return
    }

    try {
      const { data: existingData, error: fetchError } = await this.supabase
        .from('block_account')
        .select('*')
        .eq('member_id', this.userId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('차단된 계정 조회 실패:', fetchError)
        return
      }

      const uniqueUsernames = Array.from(new Set(usernames))
      const blockIdsJson = JSON.stringify(uniqueUsernames)

      if (existingData) {
        const { error: updateError } = await this.supabase
          .from('block_account')
          .update({
            block_ids: blockIdsJson
          })
          .eq('member_id', this.userId)

        if (updateError) {
          console.error('차단된 계정 업데이트 실패:', updateError)
        }
      } else {
        const { error: insertError } = await this.supabase.from('block_account').insert({
          id: this.userId,
          member_id: this.userId,
          block_ids: blockIdsJson
        })

        if (insertError) {
          console.error('차단된 계정 생성 실패:', insertError)
        }
      }

      this.excludeUsernames = new Set(uniqueUsernames)
    } catch (error) {
      console.error('차단된 계정 업데이트 중 오류:', error)
    }
  }

  async start(config: AgentConfig, workList: WorkType): Promise<void> {
    try {
      if (this._status.isRunning) {
        console.log('이미 실행 중입니다.')
        return
      }

      this._status = {
        isRunning: true,
        currentWork: null,
        waiting: null,
        logs: [],
        currentAction: '에이전트 시작 준비 중'
      }

      this.broadcastStatus()

      this.config = config
      this.works = workList
      this.currentWorkIndex = 0

      // 차단된 계정 로드
      await this.loadBlockedAccounts()

      // 댓글 기록 로드
      this.commentHistory = loadCommentHistory(this.config.credentials.username)
      this.addLog('댓글 기록 로드 완료', `${this.commentHistory.commentedPosts.length}개 기록`)

      this.addLog('브라우저 시작 중')
      this.browser = await startBrowser(this.config.credentials)
      this.addLog('브라우저 시작 완료', undefined, true)

      await this.startWorkLoop()
    } catch (error) {
      this.addLog(
        '에이전트 시작 실패',
        error instanceof Error ? error.message : String(error),
        false
      )
      this.stop()
      throw error
    }
  }

  private async startWorkLoop() {
    if (!this.browser || !this.config || !this.works) return

    while (this._status.isRunning) {
      try {
        if (await this.isBrowserClosed()) {
          console.log('브라우저가 닫혔습니다. 작업을 중단합니다.')
          this.addLog('브라우저가 닫힘', '작업을 중단합니다', false)
          this.stop()
          break
        }

        this._status.currentWork = this.works
        this.broadcastStatus()

        this.addLog('작업 실행 시작')
        await this.runWork(this.works)
        this.addLog('작업 실행 완료', undefined, true)

        const waitSeconds = this.config.loopIntervalSeconds || 300
        console.log(`작업 완료. ${waitSeconds}초 대기 후 다시 시작합니다.`)

        const until = new Date(Date.now() + waitSeconds * 1000).toLocaleTimeString()
        this._status.waiting = {
          for: `다음 작업 루프 대기 중 (${waitSeconds}초)`,
          until
        }
        this.broadcastStatus()

        this.addLog('대기 시작', `${waitSeconds}초 대기`)

        await new Promise((resolve) =>
          setTimeout(resolve, (this.config?.loopIntervalSeconds ?? 300) * 1000)
        )

        this._status.waiting = null
        this.broadcastStatus()
        this.addLog('대기 완료', '다음 작업 시작')
      } catch (error) {
        console.error('Error in work loop:', error)
        this.addLog('작업 루프 오류', error instanceof Error ? error.message : String(error), false)

        if (String(error).includes('Target page, context or browser has been closed')) {
          console.log('브라우저가 닫혔습니다. 작업을 중단합니다.')
          this.addLog('브라우저가 닫힘', '작업을 중단합니다', false)
          this.stop()
          break
        }

        this.addLog('오류 후 재시도 대기', '5초 후 다시 시도합니다')
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }
  }

  async runWork(work: WorkType) {
    try {
      if (await this.isBrowserClosed()) {
        console.log('브라우저가 닫혔거나 유효하지 않습니다.')
        this.addLog('브라우저 유효성 검사 실패', '작업을 중단합니다', false)
        this.stop()
        return
      }

      if (!this.page) {
        this.addLog('새 페이지 생성 중')
        this.page = await this.browser!.newPage()
        this.isLoggedIn = false
        this.addLog('새 페이지 생성 완료')
      }

      if (!this.isLoggedIn) {
        this.addLog('로그인 시도 중', this.config.credentials.username)
        this.isLoggedIn = await loginWithCredentials(this.page, this.config.credentials)

        if (!this.isLoggedIn) {
          this.addLog('로그인 실패', '인스타그램 로그인에 실패했습니다', false)
          throw Error('로그인 실패')
        }
        this.addLog('로그인 성공', this.config.credentials.username, true)
        await this.page.goto('https://www.instagram.com/')
      }

      if (work.feedWork.enabled) {
        this.addLog('피드 작업 시작')
        await this.page.waitForTimeout(2000)
        this.addLog('홈으로 이동')
        await navigateToHome(this.page)
        await this.page.waitForTimeout(2000)

        // count > 0일 때만 좋아요/댓글 작업 실행
        if (work.feedWork.count > 0) {
          const articleService = new ArticleProcessingService(
            this.page,
            async (articleLocator: Locator) => {
            let isProcessed = false

            const authorLoc = await articleLocator
              .locator('span._ap3a._aaco._aacw._aacx._aad7._aade')
              .first()
            const author = await authorLoc.textContent()

            if (!author) {
              console.log('[authorLoc] 작성자 요소를 찾을 수 없습니다.')
              this.addLog('작성자 정보 없음', '게시물 건너뜀')
              return false
            }

            this.addLog('게시물 확인', `작성자: ${author}`)

            if (this.excludeUsernames.has(author)) {
              console.log(`[runWork] ${author} 제외 유저 스킵`)
              this.addLog('제외된 사용자', `${author} - 건너뜀`)
              return false
            }

            // 게시물 고유 링크 추출 (피드에서는 page.url()이 항상 홈이므로 article 내 링크 사용)
            const postLinkLoc = articleLocator.locator('a[href*="/p/"], a[href*="/reel/"]').first()
            const postHref = await postLinkLoc.getAttribute('href').catch(() => null)
            const currentPostUrl = postHref ? `https://www.instagram.com${postHref}` : `feed-${author}-${Date.now()}`

            // 1. 로컬 기록에서 중복 체크 (빠름)
            if (hasCommentedOnPost(this.commentHistory, currentPostUrl)) {
              console.log('이미 댓글을 작성한 게시물 스킵 (로컬 기록)')
              this.addLog('이미 댓글 작성한 게시물', '로컬 기록 - 건너뜀')
              return false
            }

            // 2. Supabase 기록에서 중복 체크 (네트워크)
            if (await hasCommentedOnPostSupabase(this.supabase, this.config.credentials.username, currentPostUrl)) {
              console.log('이미 댓글을 작성한 게시물 스킵 (Supabase 기록)')
              this.addLog('이미 댓글 작성한 게시물', 'Supabase 기록 - 건너뜀')
              return false
            }

            const adIndicatorLocs = await articleLocator.getByText(/광고|Sponsor/).all()
            if (adIndicatorLocs.length !== 0) {
              console.log('[runWork] 광고 스킵')
              this.addLog('광고 게시물', '건너뜀')
              return false
            }

            // 1. 댓글 달기 버튼 클릭 → 모달 오픈 또는 textarea 직접 포커스
            this.addLog('댓글 달기 버튼 클릭 시도')
            const commentTrigger = articleLocator.getByText(/^댓글 달기$|^Add a comment$/i).first()
            const commentIcon = articleLocator.locator(
              'svg[aria-label*="댓글" i], svg[aria-label*="comment" i]'
            ).first()
            const commentTextareaInArticle = articleLocator.locator(
              'textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i], [role="textbox"][contenteditable="true"]'
            ).first()

            if (await commentTrigger.isVisible().catch(() => false)) {
              await commentTrigger.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
            } else if (await commentIcon.isVisible().catch(() => false)) {
              await commentIcon.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
            } else if (await commentTextareaInArticle.isVisible().catch(() => false)) {
              await commentTextareaInArticle.evaluate((el) => (el as HTMLElement).focus())
            } else {
              console.log('[runWork] 댓글 달기 버튼을 찾을 수 없습니다')
              this.addLog('댓글 달기 버튼 없음', '게시물 건너뜀', false)
              return false
            }
            await this.page!.waitForTimeout(1500)

            // 모달(dialog) 확인
            const commentModal = this.page!.locator('[role="dialog"]').first()
            const modalVisible = await commentModal.isVisible().catch(() => false)
            const commentScope = modalVisible ? commentModal : articleLocator

            // 내 댓글이 있는지 확인 (대소문자 무시)
            const myUsername = this.config.credentials.username
            const myUsernameLower = myUsername.toLowerCase()

            // 댓글 로드 대기
            await this.page!.waitForTimeout(1500)

            // 모든 댓글 작성자 가져오기
            const commentAuthors = await commentScope.locator('ul h3 a[href^="/"], ul span a[href^="/"][role="link"]').allTextContents().catch(() => [] as string[])

            // 대소문자 무시하고 본인 댓글 확인
            const hasMyComment = commentAuthors.some(author => author.toLowerCase().trim() === myUsernameLower)

            if (hasMyComment) {
              await chooseRandomSleep(postInteractionDelays)
              console.log('이미 댓글을 작성한 게시물 스킵')
              this.addLog('이미 댓글 작성한 게시물', '건너뜀')
              if (modalVisible) await this.page!.getByLabel(/닫기|Close/).first().click().catch(() => {})
              return false
            }

            // 2. 모달 안에서 좋아요
            this.addLog('좋아요 시도 중')
            const likeResult: boolean = await checkedAction(
              commentScope
                .locator('[aria-label="좋아요"], [aria-label="Like"]')
                .first(),
              this.page!,
              '좋아요 버튼',
              async (locator: Locator) => {
                await locator.evaluate((el) => {
                  // SVG일 수 있으므로 가장 가까운 클릭 가능한 부모를 찾아 클릭
                  const clickable = el.closest('[role="button"], button') || el
                  clickable.dispatchEvent(new MouseEvent('click', { bubbles: true }))
                })
              }
            )
            if (likeResult) {
              this.addLog('좋아요 성공', author, true)
              await chooseRandomSleep(postInteractionDelays)
            } else {
              this.addLog('좋아요 실패', author, false)
            }

            // 3. 모달 안에서 스냅샷
            this.addLog('게시물 스냅샷 캡처 중')
            const screenshotTarget = modalVisible ? commentModal : articleLocator
            const articleScreenshot = await screenshotTarget.screenshot({ type: 'jpeg' })
            const base64Image = articleScreenshot.toString('base64')

            // 게시물 내용 가져오기
            const contentLoc = commentScope
              .locator('h1, span[dir="auto"]')
              .first()
            const content = await contentLoc.textContent()

            if (content == null) {
              console.log('[runWork] 내용이 없는 게시글 스킵')
              this.addLog('내용 없음', '게시물 건너뜀')
              if (modalVisible) await this.page!.getByLabel(/닫기|Close/).first().click().catch(() => {})
              return false
            }

            // 4. AI 댓글 생성 및 작성
            this.addLog('AI 댓글 생성 중')
            const commentRes = await callGenerateComments({
              image: base64Image,
              content: content,
              minLength: this.config.commentLength.min,
              maxLength: this.config.commentLength.max,
              prompt: this.config.prompt
            })

            if (!commentRes.isAllowed) {
              console.log('[runWork] AI가 댓글 작성을 거부한 게시글 스킵')
              this.addLog('AI 댓글 거부', '부적절한 게시물', false)
              if (modalVisible) await this.page!.getByLabel(/닫기|Close/).first().click().catch(() => {})
              return false
            }

            this.addLog('댓글 입력 영역 확인 중')
            const commentTextarea = commentScope.locator(
              '[role="textbox"][contenteditable="true"], textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i]'
            ).first()
            if (!(await commentTextarea.isVisible().catch(() => false))) {
              console.log('[runWork] 댓글 작성이 불가능한 게시글 스킵')
              if (modalVisible) await this.page!.getByLabel(/닫기|Close/).first().click().catch(() => {})
              return false
            }

            this.addLog('AI 댓글 생성 완료', commentRes.comment)
            await commentTextarea.click({ force: true })
            await this.page!.waitForTimeout(300)
            await commentTextarea.pressSequentially(commentRes.comment, { delay: 100 })
            await this.page!.waitForTimeout(500)

            this.addLog('댓글 게시 시도 중')
            isProcessed = await checkedAction(
              commentScope
                .getByRole('button')
                .filter({ hasText: /^(게시|Post)$/ })
                .first(),
              this.page!,
              '게시'
            )

            // 모달 닫기 (성공/실패 무관하게 모달이 열려있으면 닫기)
            if (modalVisible) {
              await this.page!.waitForTimeout(1000)
              await this.page!.getByLabel(/닫기|Close/).first().click().catch(() => {})
            }

            if (isProcessed) {
              console.log('댓글 작성 성공!')
              this.addLog('댓글 게시 성공', author, true)

              // 댓글 기록 저장 (로컬 + Supabase)
              addCommentedPost(this.commentHistory, currentPostUrl, author)
              saveCommentHistory(this.config.credentials.username, this.commentHistory)
              await saveCommentToSupabase(this.supabase, this.config.credentials.username, currentPostUrl, author)

              const waitSeconds = this.config.postIntervalSeconds || 60
              const until = new Date(Date.now() + waitSeconds * 1000).toLocaleTimeString()
              this._status.waiting = {
                for: `댓글 작성 후 대기 중 (${waitSeconds}초)`,
                until
              }
              this.broadcastStatus()
            } else {
              this.addLog('댓글 게시 실패', '게시 버튼을 찾을 수 없습니다', false)
            }

            await chooseRandomSleep(postInteractionDelays)
            return isProcessed
            },
            {},
            work.feedWork.count,
            this.config
          )

          await articleService.processArticles()
        } else {
          this.addLog('피드 좋아요/댓글 작업', '개수가 0이므로 건너뜀')
        }

        // 추천 유저 팔로우
        if (work.feedWork.suggestedFollowEnabled && work.feedWork.suggestedFollowCount > 0) {
          this.addLog('추천 유저 팔로우 시작')

          const suggestedService = new SuggestedUsersService(
            this.page!,
            this.excludeUsernames,
            work.feedWork.suggestedFollowCount,
            (action, details, success) => this.addLog(action, details, success)
          )

          const followedCount = await suggestedService.processSuggestedUsers()
          this.addLog('추천 유저 팔로우 완료', `${followedCount}명 팔로우`, true)
        }

        this._status.waiting = null
        this.broadcastStatus()
        this.addLog('피드 작업 완료')
      }

      if (work.hashtagWork.enabled) {
        this.addLog('해시태그 작업 시작')
        await this.page.waitForTimeout(2000)

        // 팔로우 카운터 초기화 (게시물 수만큼 팔로우 가능)
        let followCount = 0
        const maxFollowCount = work.hashtagWork.followEnabled ? work.hashtagWork.count : 0

        // 유저 수집 서비스 초기화 (활성화된 경우)
        const userCollectionSettings = work.hashtagWork.userCollection
        if (userCollectionSettings?.enabled) {
          this.userCollectionService = new UserCollectionService(
            this.page!,
            this.supabase,
            this.config.credentials.username,
            userCollectionSettings,
            this.excludeUsernames,
            (action, details, success) => this.addLog(action, details, success)
          )
          this.addLog('유저 수집 서비스 초기화', `해시태그당 ${userCollectionSettings.usersPerHashtag}명 수집`)
        }

        // 해시태그별 카운터 (댓글, 수집 독립 관리)
        let collectedUsersPerHashtag: Record<string, number> = {}
        let commentsPerHashtag: Record<string, number> = {}

        // 목표 개수 설정
        const maxCommentCount = work.hashtagWork.count
        const maxCollectionCount = userCollectionSettings?.enabled ? (userCollectionSettings.usersPerHashtag || 0) : 0

        for (let i = 0; i < work.hashtagWork.hashtags.length; i++) {
          const hashtag = work.hashtagWork.hashtags[i]
          collectedUsersPerHashtag[hashtag] = 0
          commentsPerHashtag[hashtag] = 0

          // 최대 시도 횟수 = 목표 합계의 3배 (무한 루프 방지)
          // 두 목표 모두 달성할 때까지 게시물 순회
          const totalWorkCount = Math.max((maxCommentCount + maxCollectionCount) * 3, 10)

          this.addLog('해시태그 루프 시작', `[${i + 1}/${work.hashtagWork.hashtags.length}] #${hashtag} (댓글: ${maxCommentCount}개, 수집: ${maxCollectionCount}명, 최대시도: ${totalWorkCount})`)

          if (!this._status.isRunning) {
            this.addLog('isRunning이 false로 인해 중단')
            break
          }

          this.addLog('해시태그 검색 시작', `#${hashtag}`)
          let hashtagService: HashtagService | null = null
          hashtagService = new HashtagService(
            this.page,
            async (articleLocator) => {
              let isProcessed = false

              // 두 목표 모두 달성되었으면 즉시 다음 해시태그로 (wait 없이)
              const commentGoalDone = commentsPerHashtag[hashtag] >= maxCommentCount
              const collectionGoalDone = collectedUsersPerHashtag[hashtag] >= maxCollectionCount
              if (commentGoalDone && collectionGoalDone) {
                this.addLog('목표 달성 완료', `댓글 ${commentsPerHashtag[hashtag]}/${maxCommentCount}, 수집 ${collectedUsersPerHashtag[hashtag]}/${maxCollectionCount}`)
                return { processed: false, goalsReached: true }
              }

              try {
                await articleLocator.click()
                await chooseRandomSleep(postInteractionDelays)

                this.addLog('해시태그 게시물 열기')

                let author: string | null = null
                let retryCount = 0
                const maxRetries = 2

                while (retryCount <= maxRetries && !author) {
                  if (retryCount > 0) {
                    this.addLog('작성자 정보 재시도', `${retryCount}번째 시도`)
                    await this.page!.waitForTimeout(2000)
                  }

                  // 모달 헤더에서 작성자 찾기 (여러 선택자 시도)
                  const dialog = this.page!.locator('[role="dialog"]').first()

                  // 선택자 배열 - 우선순위 순서
                  const authorSelectors = [
                    'header a[role="link"]',
                    'header a[href^="/"]',
                    'header span a',
                    'a[href^="/"][role="link"]:not([href="/explore/"])',
                    'span._ap3a._aaco._aacw._aacx._aad7._aade a',
                    'div._aaqt a'
                  ]

                  for (const selector of authorSelectors) {
                    try {
                      const authorLoc = dialog.locator(selector).first()
                      const text = await authorLoc.textContent({ timeout: 2000 })
                      if (text && text.trim() && !text.includes('#') && !text.includes('...')) {
                        author = text.trim()
                        break
                      }
                    } catch {
                      // 다음 선택자 시도
                    }
                  }

                  retryCount++
                }

                if (!author) {
                  console.log('[authorLoc] 작성자 요소를 찾을 수 없습니다.')
                  this.addLog('작성자 정보 없음', '게시물 건너뜀')
                  await this.page!.getByLabel(/닫기|Close/).click()
                  return false
                }

                this.addLog('게시물 확인', `작성자: ${author}`)

                if (this.excludeUsernames.has(author)) {
                  console.log('[runWork] 제외 유저 스킵')
                  this.addLog('제외된 사용자', `${author} - 건너뜀`)
                  await this.page!.getByLabel(/닫기|Close/).click()
                  return false
                }

                // 1. 로컬 기록에서 중복 체크 (현재 페이지 URL 기준)
                const hashtagPostUrl = this.page!.url()
                const alreadyCommentedLocal = hasCommentedOnPost(this.commentHistory, hashtagPostUrl)

                // 2. Supabase 기록에서 중복 체크 (네트워크)
                const alreadyCommentedSupabase = await hasCommentedOnPostSupabase(this.supabase, this.config.credentials.username, hashtagPostUrl)

                // 내 댓글이 있는지 확인 (대소문자 무시)
                const myUsername = this.config.credentials.username
                const myUsernameLower = myUsername.toLowerCase()

                // 댓글 로드 대기
                await this.page!.waitForTimeout(1500)

                // 모든 댓글 작성자 가져오기
                const commentSection = this.page!.locator('[role="dialog"] ul')
                const commentAuthors = await commentSection.locator('h3 a[href^="/"], span a[href^="/"][role="link"]').allTextContents().catch(() => [] as string[])

                // 대소문자 무시하고 본인 댓글 확인
                const hasMyComment = commentAuthors.some(author => author.toLowerCase().trim() === myUsernameLower)

                // 이미 댓글 작성한 게시물인지 확인
                const alreadyCommented = alreadyCommentedLocal || alreadyCommentedSupabase || hasMyComment

                if (alreadyCommented) {
                  // 유저 수집 및 즉시 처리 (이미 댓글 작성 게시물에서도 실행)
                  if (this.userCollectionService && userCollectionSettings?.enabled) {
                    if (collectedUsersPerHashtag[hashtag] < maxCollectionCount) {
                      this.addLog('유저 수집 시도 (이미 댓글 작성 게시물)', `#${hashtag} (${collectedUsersPerHashtag[hashtag] + 1}/${maxCollectionCount})`)
                      const postId = hashtagPostUrl.match(/\/p\/([^/]+)/)?.[1] || hashtagPostUrl
                      const collectedUser = await this.userCollectionService.collectFromPostModal(hashtag, postId)
                      if (collectedUser) {
                        collectedUsersPerHashtag[hashtag]++
                        this.addLog('유저 수집 완료', `${collectedUser.collected_username} (${collectedUsersPerHashtag[hashtag]}/${maxCollectionCount})`, true)

                        // 모달 닫기
                        await this.page!.getByLabel(/닫기|Close/).click().catch(() => {})
                        await this.page!.waitForTimeout(1000)

                        // 즉시 수집된 유저 처리
                        await this.processCollectedUserImmediately(collectedUser, userCollectionSettings)

                        // 세션 처리 완료 표시
                        this.userCollectionService!.markUserAsProcessed(collectedUser.collected_username)

                        // 해시태그 페이지로 복귀
                        this.addLog('해시태그 복귀', `#${hashtag}`)
                        await this.page!.goto(`https://www.instagram.com/explore/tags/${hashtag}/`, { waitUntil: 'domcontentloaded' })
                        await this.page!.waitForTimeout(2000)
                        await hashtagService?.scrollToLastProcessedPost()

                        return true // 수집 처리했으므로 true 반환
                      }
                    }
                  }

                  await chooseRandomSleep(postInteractionDelays)
                  const skipReason = alreadyCommentedLocal ? '로컬 기록' : alreadyCommentedSupabase ? 'Supabase 기록' : 'UI 확인'
                  console.log(`이미 댓글을 작성한 게시물 스킵 (${skipReason})`)
                  this.addLog('이미 댓글 작성한 게시물', `${skipReason} - 건너뜀`)
                  await this.page!.getByLabel(/닫기|Close/).click()
                  return false
                }

                const adIndicator = this.page!.getByText(/광고|Sponsored/)
                if (await adIndicator.isVisible()) {
                  await chooseRandomSleep(postInteractionDelays)
                  console.log('광고 게시물 스킵')
                  this.addLog('광고 게시물', '건너뜀')
                  await this.page!.getByLabel(/닫기|Close/).click()
                  return false
                }

                // 댓글 목표 도달 체크 - 도달 시 수집만 진행
                const commentGoalReached = commentsPerHashtag[hashtag] >= maxCommentCount
                if (commentGoalReached) {
                  this.addLog('댓글 목표 도달', `${commentsPerHashtag[hashtag]}/${maxCommentCount} - 수집만 진행`)

                  // 수집만 시도
                  if (this.userCollectionService && userCollectionSettings?.enabled) {
                    if (collectedUsersPerHashtag[hashtag] < maxCollectionCount) {
                      this.addLog('유저 수집 시도 (댓글 목표 도달)', `#${hashtag} (${collectedUsersPerHashtag[hashtag] + 1}/${maxCollectionCount})`)
                      const postId = hashtagPostUrl.match(/\/p\/([^/]+)/)?.[1] || hashtagPostUrl
                      const collectedUser = await this.userCollectionService.collectFromPostModal(hashtag, postId)
                      if (collectedUser) {
                        collectedUsersPerHashtag[hashtag]++
                        this.addLog('유저 수집 완료', `${collectedUser.collected_username} (${collectedUsersPerHashtag[hashtag]}/${maxCollectionCount})`, true)

                        // 모달 닫기
                        await this.page!.getByLabel(/닫기|Close/).click().catch(() => {})
                        await this.page!.waitForTimeout(1000)

                        // 즉시 수집된 유저 처리
                        await this.processCollectedUserImmediately(collectedUser, userCollectionSettings)

                        // 세션 처리 완료 표시
                        this.userCollectionService!.markUserAsProcessed(collectedUser.collected_username)

                        // 해시태그 페이지로 복귀
                        this.addLog('해시태그 복귀', `#${hashtag}`)
                        await this.page!.goto(`https://www.instagram.com/explore/tags/${hashtag}/`, { waitUntil: 'domcontentloaded' })
                        await this.page!.waitForTimeout(2000)
                        await hashtagService?.scrollToLastProcessedPost()

                        return true // 수집 처리했으므로 true
                      }
                    }
                  }

                  // 수집도 못 했으면 스킵
                  await this.page!.getByLabel(/닫기|Close/).click()
                  return false
                }

                this.addLog('좋아요 시도 중')
                const likeButtonResult: boolean = await checkedAction(
                  this.page!.locator('[aria-label="좋아요"], [aria-label="Like"]').first(),
                  this.page!,
                  '좋아요',
                  async (locator: Locator) => {
                    await locator.evaluate((el) => {
                      const clickable = el.closest('[role="button"], button') || el
                      clickable.dispatchEvent(
                        new MouseEvent('click', {
                          bubbles: true,
                          cancelable: true,
                          view: window
                        })
                      )
                    })
                  }
                )

                if (likeButtonResult) {
                  this.addLog('좋아요 성공', author, true)
                  await chooseRandomSleep(postInteractionDelays)
                } else {
                  this.addLog('좋아요 실패', author, false)
                }

                this.addLog('게시물 내용 확인 중')
                const contentLoc = this.page!.locator(
                  'li._a9zj._a9zl._a9z5 h1._ap3a._aaco._aacu._aacx._aad7._aade'
                )

                const content = await contentLoc.textContent()
                if (content == null) {
                  console.log('[runWork] 내용이 없는 게시글 스킵')
                  this.addLog('내용 없음', '게시물 건너뜀')
                  await this.page!.getByLabel(/닫기|Close/).click()
                  return false
                }

                this.addLog('게시물 이미지 확인 중')
                const mediaLoc = this.page!.locator('div._aatk._aatl')
                const mediaBase64 = await mediaLoc.screenshot({ type: 'jpeg' })
                const base64Image = mediaBase64.toString('base64')

                this.addLog('AI 댓글 생성 중')
                const commentRes = await callGenerateComments({
                  image: base64Image,
                  content: content || '',
                  minLength: this.config.commentLength.min,
                  maxLength: this.config.commentLength.max,
                  prompt: this.config.prompt
                })

                if (!commentRes.isAllowed) {
                  console.log('AI가 댓글 작성을 거부한 게시글 스킵')
                  this.addLog('AI 댓글 거부', '부적절한 게시물', false)
                  await this.page!.getByLabel(/닫기|Close/).click()
                  return false
                }
                this.addLog('AI 댓글 생성 완료', commentRes.comment)

                this.addLog('댓글 입력 영역 확인 중')

                // 해시태그 모달 안에서 "댓글 달기" 또는 댓글 아이콘 클릭
                const hashtagDialog = this.page!.locator('[role="dialog"]').first()
                const hashtagCommentTrigger = hashtagDialog.getByText(/^댓글 달기$|^Add a comment$/i).first()
                const hashtagCommentIcon = hashtagDialog.locator(
                  'svg[aria-label*="댓글" i], svg[aria-label*="comment" i]'
                ).first()
                const hashtagCommentTextarea = hashtagDialog.locator(
                  'textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i], [role="textbox"][contenteditable="true"]'
                ).first()

                if (await hashtagCommentTrigger.isVisible().catch(() => false)) {
                  await hashtagCommentTrigger.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
                  await this.page!.waitForTimeout(1500)
                } else if (await hashtagCommentIcon.isVisible().catch(() => false)) {
                  await hashtagCommentIcon.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
                  await this.page!.waitForTimeout(1500)
                } else if (await hashtagCommentTextarea.isVisible().catch(() => false)) {
                  await hashtagCommentTextarea.evaluate((el) => (el as HTMLElement).focus())
                  await this.page!.waitForTimeout(500)
                }

                // 댓글 모달이 새로 열렸을 수 있으므로 가장 위의 dialog에서 찾기
                const commentDialog = this.page!.locator('[role="dialog"]').last()
                const commentTextareaResult: boolean = await checkedAction(
                  commentDialog.locator(
                    '[role="textbox"][contenteditable="true"], textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i]'
                  ).first(),
                  this.page!,
                  '댓글 입력 영역',
                  async (locator: Locator) => {
                    await locator.click()
                    await this.page!.waitForTimeout(300)
                    await locator.pressSequentially(commentRes.comment, { delay: 100 })
                    await chooseRandomSleep(postInteractionDelays)

                    await checkedAction(
                      commentDialog.getByRole('button', { name: /^(게시|Post)$/i }),
                      this.page!,
                      '게시'
                    )
                  }
                )

                if (commentTextareaResult) {
                  isProcessed = true
                  commentsPerHashtag[hashtag]++  // 댓글 카운트 증가
                  this.addLog('댓글 게시 성공', `${author} (${commentsPerHashtag[hashtag]}/${maxCommentCount})`, true)

                  // 댓글 기록 저장 (로컬 + Supabase)
                  addCommentedPost(this.commentHistory, hashtagPostUrl, author)
                  saveCommentHistory(this.config.credentials.username, this.commentHistory)
                  await saveCommentToSupabase(this.supabase, this.config.credentials.username, hashtagPostUrl, author)

                  // 팔로우 시도 (활성화되어 있고 최대 횟수 미만인 경우)
                  if (work.hashtagWork.followEnabled && followCount < maxFollowCount) {
                    const hashtagDialog = this.page!.locator('[role="dialog"]').first()
                    const followResult = await this.performHashtagFollow(hashtagDialog, author!)
                    if (followResult) {
                      followCount++
                      this.addLog('팔로우 성공', `${author} (${followCount}/${maxFollowCount})`, true)
                    }
                  }
                } else {
                  this.addLog('댓글 게시 실패', '댓글 입력 영역을 찾을 수 없습니다', false)
                }

                // 유저 수집 및 즉시 처리 (댓글 성공/실패 관계없이 실행)
                if (this.userCollectionService && userCollectionSettings?.enabled) {
                  if (collectedUsersPerHashtag[hashtag] < maxCollectionCount) {
                    this.addLog('유저 수집 시도', `#${hashtag} (${collectedUsersPerHashtag[hashtag] + 1}/${maxCollectionCount})`)
                    const postId = hashtagPostUrl.match(/\/p\/([^/]+)/)?.[1] || hashtagPostUrl
                    const collectedUser = await this.userCollectionService.collectFromPostModal(hashtag, postId)
                    if (collectedUser) {
                      collectedUsersPerHashtag[hashtag]++
                      this.addLog('유저 수집 완료', `${collectedUser.collected_username} (${collectedUsersPerHashtag[hashtag]}/${maxCollectionCount})`, true)

                      // 모달 닫기
                      await this.page!.getByLabel(/닫기|Close/).click().catch(() => {})
                      await this.page!.waitForTimeout(1000)

                      // 즉시 수집된 유저 처리
                      await this.processCollectedUserImmediately(collectedUser, userCollectionSettings)

                      // 세션 처리 완료 표시
                      this.userCollectionService!.markUserAsProcessed(collectedUser.collected_username)

                      // 해시태그 페이지로 복귀
                      this.addLog('해시태그 복귀', `#${hashtag}`)
                      await this.page!.goto(`https://www.instagram.com/explore/tags/${hashtag}/`, { waitUntil: 'domcontentloaded' })
                      await this.page!.waitForTimeout(2000)
                      await hashtagService?.scrollToLastProcessedPost()

                      return true
                    }
                  }
                }

                // 대기 시간 적용 (댓글 성공 시에만)
                if (commentTextareaResult) {
                  const waitSeconds = this.config.postIntervalSeconds || 60
                  const until = new Date(Date.now() + waitSeconds * 1000).toLocaleTimeString()
                  this._status.waiting = {
                    for: `댓글 작성 후 대기 중 (${waitSeconds}초)`,
                    until
                  }
                  this.broadcastStatus()
                }

                await chooseRandomSleep(postInteractionDelays)
                this.addLog('게시물 닫기')
                await this.page!.getByLabel(/닫기|Close/).click()
                await chooseRandomSleep(postInteractionDelays)
              } catch (error) {
                console.error('게시물 처리 중 오류:', error)
                this.addLog(
                  '게시물 처리 오류',
                  error instanceof Error ? error.message : String(error),
                  false
                )
                await this.page!.getByLabel(/닫기|Close/).click()
              }

              return isProcessed
            },
            {},
            totalWorkCount,  // 댓글 개수와 수집 개수 중 큰 값
            this.config,
            (action, details, success) => this.addLog(action, details, success)
          )

          try {
            this.addLog('해시태그 처리 시작', `#${hashtag}`)
            await hashtagService.processHashtag([hashtag])
            this.addLog('해시태그 처리 완료', `#${hashtag}`, true)
          } catch (error) {
            this.addLog(
              '해시태그 처리 실패',
              `#${hashtag} - ${error instanceof Error ? error.message : String(error)}`,
              false
            )
            // 에러가 발생해도 다음 해시태그로 진행
            continue
          }

          // 마지막 해시태그가 아니면 대기
          if (i < work.hashtagWork.hashtags.length - 1) {
            const waitSeconds = this.config.workIntervalSeconds || 60
            const until = new Date(Date.now() + waitSeconds * 1000).toLocaleTimeString()
            this._status.waiting = {
              for: `해시태그 작업 간 대기 중 (${waitSeconds}초)`,
              until
            }
            this.broadcastStatus()
            this.addLog('해시태그 작업 간 대기', `${waitSeconds}초`)

            await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000))

            this._status.waiting = null
            this.broadcastStatus()

            // 대기 중 중단 여부 확인
            if (!this._status.isRunning) {
              this.addLog('해시태그 대기 중 중단됨')
              break
            }

            this.addLog('다음 해시태그로 이동', `#${work.hashtagWork.hashtags[i + 1]}`)
          }

          this.addLog('해시태그 루프 종료', `[${i + 1}/${work.hashtagWork.hashtags.length}] #${hashtag}`)
        }

        this.addLog('해시태그 작업 완료')
      }

      if (work.myFeedInteractionWork.enabled) {
        this.addLog('내 피드 댓글 작업 시작')
        await this.page.waitForTimeout(2000)
        await navigateToHome(this.page)
        await this.page.waitForTimeout(2000)

        const feedWorkBasicModeService = new MyFeedInteractionService(
          this.page,
          async (
            commentLocator: Locator,
            notificationInfo: {
              author: string
              content: string
            }
          ) => {
            let isProcessed = false

            try {
              if (this.excludeUsernames.has(notificationInfo.author)) {
                console.log(`[runWork] ${notificationInfo.author} 제외 유저 스킵`)
                this.addLog('제외된 사용자', `${notificationInfo.author} - 건너뜀`)
                return false
              }

              if (this.config.credentials.username === notificationInfo.author) {
                console.log('[runWork] 자신의 댓글 스킵')
                this.addLog('자신의 댓글', '건너뜀')
                return false
              }

              this.addLog('댓글 확인', `작성자: ${notificationInfo.author}`)
              this.addLog('좋아요 시도 중')
              const likeButtonResult: boolean = await checkedAction(
                this.page!.locator('[aria-label="좋아요"], [aria-label="Like"]').first(),
                this.page!,
                '좋아요',
                async (locator: Locator) => {
                  await locator.evaluate((element) => {
                    element.dispatchEvent(
                      new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                      })
                    )
                  })
                }
              )

              if (likeButtonResult) {
                this.addLog('좋아요 성공', notificationInfo.author, true)
                await chooseRandomSleep(postInteractionDelays)
              } else {
                this.addLog('좋아요 실패', notificationInfo.author, false)
              }

              // 답글 모두 보기 버튼
              this.addLog('답글 확인 중')
              const siblingDivs = commentLocator.locator('xpath=../following-sibling::div[1]')
              const button = await siblingDivs.getByRole('button')
              if (await button.isVisible()) {
                await button.click()
                this.addLog('답글 모두 보기 버튼 클릭')
              }

              const commentReply = await siblingDivs
                .locator('ul')
                .textContent()
                .catch(() => {
                  return null
                })

              if (commentReply === null) {
                console.log('[commentReply] 아직 답글을 달지 못한 게시글 확인')
                this.addLog('답글 확인', '아직 답글 작성 안됨')
              }

              if (
                (commentReply && commentReply.startsWith(this.config.credentials.username)) ||
                commentReply?.includes(this.config.credentials.username)
              ) {
                console.log('[runWork] 이미 답글을 작성한 댓글이므로 건너뜁니다.')
                this.addLog('이미 답글 작성함', '건너뜀')
                return false
              }

              this.addLog('답글 달기 버튼 클릭 시도')
              await checkedAction(
                commentLocator.getByText(/답글 달기|Reply/i, { exact: false }).first(),
                this.page!,
                '답글 달기'
              )

              // 댓글 스크린샷 및 AI 답글 생성
              this.addLog('댓글 이미지 캡처 중')
              const commentScreenshot = await commentLocator.screenshot({ type: 'jpeg' })
              const base64Image = commentScreenshot.toString('base64')

              this.addLog('AI 답글 생성 중')
              const commentRes = await callGenerateReply({
                image: base64Image,
                content: notificationInfo.content,
                minLength: this.config.commentLength.min,
                maxLength: this.config.commentLength.max,
                prompt: this.config.prompt
              })

              if (!commentRes.isAllowed) {
                console.log('[runWork] AI가 댓글 작성을 거부한 게시글 스킵')
                this.addLog('AI 답글 거부', '부적절한 내용', false)
                return false
              }
              this.addLog('AI 답글 생성 완료', commentRes.comment)

              // 댓글 입력 영역 찾기
              this.addLog('답글 입력 영역 확인 중')
              const commentTextarea = this.page
                ?.locator(
                  '[role="textbox"][contenteditable="true"], textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i]'
                )
                .first()

              if (!(await commentTextarea!.isVisible().catch(() => false))) {
                console.log('[runWork] 댓글 작성이 불가능한 게시글 스킵')
                this.addLog('답글 입력란 없음', '건너뜀', false)
                return false
              }

              this.addLog('답글 입력 중', commentRes.comment)
              await commentTextarea!.click()
              await this.page!.waitForTimeout(300)
              await commentTextarea!.pressSequentially(commentRes.comment, { delay: 100 })
              await this.page!.waitForTimeout(500)

              // 게시 버튼 찾기 및 클릭
              this.addLog('답글 게시 시도 중')
              isProcessed = await checkedAction(
                this.page!.getByRole('button', { name: /^(게시|Post)$/, exact: true }),
                this.page!,
                '게시'
              )

              if (isProcessed) {
                console.log('답글 작성 성공!')
                this.addLog('답글 게시 성공', notificationInfo.author, true)

                const waitSeconds = this.config.postIntervalSeconds || 60
                const until = new Date(Date.now() + waitSeconds * 1000).toLocaleTimeString()
                this._status.waiting = {
                  for: `답글 작성 후 대기 중 (${waitSeconds}초)`,
                  until
                }
                this.broadcastStatus()
              } else {
                this.addLog('답글 게시 실패', '게시 버튼을 찾을 수 없습니다', false)
              }

              await chooseRandomSleep(postInteractionDelays)
            } catch (error) {
              console.error('댓글 처리 중 오류:', error)
              this.addLog(
                '댓글 처리 오류',
                error instanceof Error ? error.message : String(error),
                false
              )
              return false
            }

            return isProcessed
          },
          {},
          this.config,
          this.currentWorkIndex,
          work
        )

        await feedWorkBasicModeService.processNotificationsComment()
        this._status.waiting = null
        this.broadcastStatus()
        this.addLog('내 피드 댓글 작업 완료')
      }

      if (work.hashtagInteractionWork.enabled) {
        console.log('hashtagInteractionWork 기능은 아직 구현되지 않았습니다.')
      }

      if (work.targetUserWork?.enabled) {
        this.addLog('타겟 유저 작업 시작')
        await this.page.waitForTimeout(2000)

        const pendingUsers = work.targetUserWork.targetUsers.filter(u => u.status === 'pending')
        if (pendingUsers.length === 0) {
          this.addLog('타겟 유저 작업', '대기 중인 유저가 없습니다')
        } else {
          const targetUserService = new TargetUserProcessingService(
            this.page,
            this.config,
            {
              likeEnabled: work.targetUserWork.likeEnabled,
              commentEnabled: work.targetUserWork.commentEnabled,
              postsPerUser: work.targetUserWork.postsPerUser,
              skipOldPostsMonths: work.targetUserWork.skipOldPostsMonths || 0,
              onLike: async (username: string, postIndex: number) => {
                this.addLog('좋아요 완료', `${username} 게시물 ${postIndex + 1}`, true)
              },
              onComment: async (username: string, postIndex: number, imageBase64: string, content: string) => {
                this.addLog('AI 댓글 생성 중', `${username} 게시물 ${postIndex + 1}`)
                const commentRes = await callGenerateComments({
                  image: imageBase64,
                  content: content,
                  minLength: this.config.commentLength.min,
                  maxLength: this.config.commentLength.max,
                  prompt: this.config.prompt
                })

                if (!commentRes.isAllowed) {
                  this.addLog('AI 댓글 거부', '부적절한 게시물', false)
                  return null
                }
                this.addLog('AI 댓글 생성 완료', commentRes.comment)
                return commentRes.comment
              },
              onUserStatusUpdate: (username: string, status, error?: string) => {
                // 유저 상태 업데이트 (UI로 전송)
                const userIndex = work.targetUserWork.targetUsers.findIndex(u => u.username === username)
                if (userIndex !== -1) {
                  work.targetUserWork.targetUsers[userIndex].status = status
                  work.targetUserWork.targetUsers[userIndex].processedAt = Date.now()
                  if (error) {
                    work.targetUserWork.targetUsers[userIndex].error = error
                  }
                  this.broadcastStatus()
                }
                this.addLog('유저 상태 업데이트', `${username}: ${status}${error ? ` - ${error}` : ''}`)
              },
              onLog: (action: string, details?: string, success?: boolean) => {
                this.addLog(action, details, success)
              },
              // Supabase 댓글 기록 체크 콜백 (로컬 + Supabase)
              checkCommentHistory: async (postUrl: string) => {
                // 1. 로컬 기록 체크 (빠름)
                if (hasCommentedOnPost(this.commentHistory, postUrl)) {
                  return true
                }
                // 2. Supabase 기록 체크 (네트워크)
                return await hasCommentedOnPostSupabase(this.supabase, this.config.credentials.username, postUrl)
              },
              // Supabase 댓글 기록 저장 콜백 (로컬 + Supabase)
              saveCommentHistory: async (postUrl: string, author: string) => {
                // 로컬 기록 저장
                addCommentedPost(this.commentHistory, postUrl, author)
                saveCommentHistory(this.config.credentials.username, this.commentHistory)
                // Supabase에 저장
                await saveCommentToSupabase(this.supabase, this.config.credentials.username, postUrl, author)
              }
            }
          )

          await targetUserService.processTargetUsers(work.targetUserWork.targetUsers)
        }

        this._status.waiting = null
        this.broadcastStatus()
        this.addLog('타겟 유저 작업 완료')
      }

      if (work.targetFollowerCollectWork?.enabled) {
        this.addLog('타겟 유저 팔로워 수집 시작')
        this._status.isCollectingFollowers = true
        this.broadcastStatus()
        await this.page.waitForTimeout(2000)

        const targets = work.targetFollowerCollectWork.targetUsers || []
        if (targets.length === 0) {
          this.addLog('타겟 유저 팔로워 수집', '대기 중인 타겟이 없습니다')
        } else {
          const followerCollectionService = new TargetFollowerCollectionService(
            this.page,
            this.supabase as any,
            {
              appUserId: this.userId || 'unknown',
              appUserEmail: this.userEmail || this.userId || 'unknown',
              dailyLimit: Math.max(1, work.targetFollowerCollectWork.dailyLimit || 500),
              isRunning: () => this._status.isRunning,
              onLog: (action: string, details?: string, success?: boolean) => {
                this.addLog(action, details, success)
              },
              onTargetStatusUpdate: (
                username: string,
                patch: Partial<TargetFollowerCollectionTarget>
              ) => {
                const userIndex = targets.findIndex((u) => u.username.toLowerCase() === username.toLowerCase())
                if (userIndex !== -1) {
                  targets[userIndex] = {
                    ...targets[userIndex],
                    ...patch
                  }
                  this.broadcastStatus()
                }
              }
            }
          )

          await followerCollectionService.processTargets(targets)
        }

        this._status.isCollectingFollowers = false
        this._status.waiting = null
        this.broadcastStatus()
        this.addLog('타겟 유저 팔로워 수집 완료')
      }

      if (
        !work.myFeedInteractionWork.enabled &&
        !work.feedWork.enabled &&
        !work.hashtagWork.enabled &&
        !work.hashtagInteractionWork.enabled &&
        !work.targetUserWork?.enabled &&
        !work.targetFollowerCollectWork?.enabled
      ) {
        this.addLog('지원하지 않는 작업', '활성화된 작업이 없습니다', false)
        throw Error('지원하지 않는 작업')
      }
    } catch (error) {
      console.error('작업 실행 중 오류 발생:', error)
      this.addLog('작업 실행 오류', error instanceof Error ? error.message : String(error), false)

      if (String(error).includes('Target page, context or browser has been closed')) {
        console.log('브라우저가 닫혔습니다. 작업을 중단합니다.')
        this.addLog('브라우저가 닫힘', '작업을 중단합니다', false)
        this.stop()
      }

      throw error
    }
  }

  private async checkIsFollowing(dialog: Locator): Promise<boolean> {
    // "팔로잉", "Following", "요청됨", "Requested" 버튼 확인
    const followingButton = dialog
      .locator('header button, header div[role="button"]')
      .filter({ hasText: /^(팔로잉|Following|요청됨|Requested)$/i })
      .first()
    return await followingButton.isVisible().catch(() => false)
  }

  private async performHashtagFollow(dialog: Locator, author: string): Promise<boolean> {
    try {
      // 이미 팔로우 중인지 확인
      if (await this.checkIsFollowing(dialog)) {
        this.addLog('이미 팔로우 중', author)
        return false
      }

      // 팔로우 버튼 찾기 (header 내에서)
      const followButton = dialog
        .locator('header button, header div[role="button"]')
        .filter({ hasText: /^팔로우$/i })
        .first()

      if (!(await followButton.isVisible().catch(() => false))) {
        this.addLog('팔로우 버튼 없음', author, false)
        return false
      }

      await followButton.click()
      await this.page!.waitForTimeout(1500)
      return true
    } catch (error) {
      this.addLog('팔로우 실패', `${author}: ${error instanceof Error ? error.message : String(error)}`, false)
      return false
    }
  }

  /**
   * 수집된 유저를 즉시 처리 (실시간 처리)
   * - 프로필 방문 → 팔로우 → 게시물 좋아요/댓글
   */
  private async processCollectedUserImmediately(
    collectedUser: import('../../..').CollectedUser,
    settings: import('../../..').UserCollectionSettings
  ): Promise<void> {
    if (!this.page) return

    try {
      this.addLog('수집 유저 프로필 작업 시작', `@${collectedUser.collected_username} 방문 예정`)
      this.broadcastStatus() // UI에 즉시 반영
      this.addLog('수집 유저 즉시 처리 시작', collectedUser.collected_username)

      const targetUserService = new TargetUserProcessingService(
        this.page,
        this.config,
        {
          likeEnabled: settings.autoProcessLikeEnabled,
          commentEnabled: settings.autoProcessCommentEnabled,
          postsPerUser: settings.postsPerCollectedUser,
          tryFollowOnVisit: true,  // 프로필 방문 시 팔로우 시도
          skipOldPostsMonths: 0,  // 수집 유저 활동에는 날짜 스킵 미적용
          onLike: async (username: string, postIndex: number) => {
            this.addLog('좋아요 완료', `${username} 게시물 ${postIndex + 1}`, true)
          },
          onComment: async (username: string, postIndex: number, imageBase64: string, content: string) => {
            this.addLog('AI 댓글 생성 중', `${username} 게시물 ${postIndex + 1}`)
            const commentRes = await callGenerateComments({
              image: imageBase64,
              content: content,
              minLength: this.config.commentLength.min,
              maxLength: this.config.commentLength.max,
              prompt: this.config.prompt
            })

            if (!commentRes.isAllowed) {
              this.addLog('AI 댓글 거부', '부적절한 게시물', false)
              return null
            }
            this.addLog('AI 댓글 생성 완료', commentRes.comment)
            return commentRes.comment
          },
          onUserStatusUpdate: (username: string, status, error?: string) => {
            this.addLog('수집 유저 상태', `${username}: ${status}${error ? ` - ${error}` : ''}`)
          },
          onLog: (action: string, details?: string, success?: boolean) => {
            this.addLog(action, details, success)
          },
          checkCommentHistory: async (postUrl: string) => {
            if (hasCommentedOnPost(this.commentHistory, postUrl)) {
              return true
            }
            return await hasCommentedOnPostSupabase(this.supabase, this.config.credentials.username, postUrl)
          },
          saveCommentHistory: async (postUrl: string, author: string) => {
            addCommentedPost(this.commentHistory, postUrl, author)
            saveCommentHistory(this.config.credentials.username, this.commentHistory)
            await saveCommentToSupabase(this.supabase, this.config.credentials.username, postUrl, author)
          }
        }
      )

      // 단일 유저 처리
      await targetUserService.processTargetUsers([{
        username: collectedUser.collected_username,
        status: 'pending' as const
      }])

      this.addLog('수집 유저 즉시 처리 완료', collectedUser.collected_username)
    } catch (error) {
      this.addLog(
        '수집 유저 즉시 처리 오류',
        error instanceof Error ? error.message : String(error),
        false
      )
    }
  }

  async stop(): Promise<void> {
    this.addLog('에이전트 중지 중')

    if (this.page) {
      await this.page.close().catch(() => {})
      this.page = null
    }

    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }

    this._status = {
      isRunning: false,
      currentWork: null,
      waiting: null,
      logs: this._status.logs,
      currentAction: '중지됨'
    }

    // 화면 보호기 및 절전 모드 방지 중지
    stopPowerSaveBlocker()

    this.broadcastStatus()
    this.addLog('에이전트 중지 완료')
  }

  async isBrowserClosed(): Promise<boolean> {
    if (!this.browser) return true

    try {
      const pages = await this.browser.pages()
      return pages.length === 0
    } catch {
      return true
    }
  }

  getStatus(): BotStatus {
    return this._status
  }

  getRecentLogs(count: number = 10): WorkLog[] {
    return (this._status.logs || []).slice(-count)
  }

  async updateExcludeUsernames(usernames: string[]) {
    await this.updateBlockedAccounts(usernames)
  }
}
