import { BrowserContext, Locator, Page } from 'playwright-core'
import { AgentConfig, WorkType } from '../../..'
import { startBrowser } from '../common/browser'
import { loginWithCredentials, navigateToHome } from '../common/browserUtils'
import { checkedAction } from '../common/checkedAction'
import { callGenerateComments, callGenerateReply } from '../common/fetchers'
import { chooseRandomSleep, postInteractionDelays } from '../common/timeUtils'
import { ArticleProcessingService } from '../services/ArticleProcessingService'
import { HashtagService } from '../services/HashtagProcessingService'
import { MyFeedInteractionService } from '../services/MyFeedInteractionService'
import { app, BrowserWindow } from 'electron'

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
  private isLoggedIn: Boolean = false
  private mainWindow: BrowserWindow | null = null

  constructor(
    private works: WorkType,
    private config: AgentConfig,
    mainWindow?: BrowserWindow
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
      this.mainWindow.webContents.send('agent:status-update', this._status)
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
      
      this.addLog('브라우저 시작 중')
      this.browser = await startBrowser(this.config.credentials)
      this.addLog('브라우저 시작 완료', undefined, true)

      await this.startWorkLoop()
    } catch (error) {
      this.addLog('에이전트 시작 실패', error instanceof Error ? error.message : String(error), false)
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

            const adIndicatorLocs = await articleLocator.getByText(/광고|Sponsor/).all()
            if (adIndicatorLocs.length !== 0) {
              console.log('[runWork] 광고 스킵')
              this.addLog('광고 게시물', '건너뜀')
              return false
            }

            this.addLog('좋아요 시도 중')
            const likeResult: boolean = await checkedAction(
              articleLocator
                .getByRole('button')
                .filter({
                  hasText: /^(좋아요|Like)$/
                })
                .first(),
              this.page!,
              '좋아요 버튼',
              async (locator: Locator) => {
                await locator.evaluate((button) => {
                  ;(button as HTMLButtonElement).click()
                })
              }
            )
            if (likeResult) {
              this.addLog('좋아요 성공', author, true)
              await chooseRandomSleep(postInteractionDelays)
            } else {
              this.addLog('좋아요 실패', author, false)
              return likeResult
            }

            this.addLog('더 보기 클릭 시도')
            const moreButtonResult: boolean = await checkedAction(
              articleLocator
                .getByRole('button')
                .filter({
                  hasText: /^(?:더\s*보기|more)$/
                })
                .first(),
              this.page!,
              '더 보기'
            )
            if (moreButtonResult) {
              this.addLog('더 보기 클릭 성공')
              await chooseRandomSleep(postInteractionDelays)
            } else {
              this.addLog('더 보기 클릭 실패 또는 필요 없음')
              return moreButtonResult
            }

            const articleScreenshot = await articleLocator.screenshot({ type: 'jpeg' })
            const base64Image = articleScreenshot.toString('base64')

            const contentLoc = articleLocator
              .locator('._ap3a._aaco._aacu._aacx._aad7._aade')
              .first()
            const content = await contentLoc.textContent()

            if (content == null) {
              console.log('[runWork] 내용이 없는 게시글 스킵')
              this.addLog('내용 없음', '게시물 건너뜀')
              return false
            }

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
              return false
            }
            this.addLog('AI 댓글 생성 완료', commentRes.comment)

            this.addLog('댓글 입력 영역 확인 중')
            const commentTextarea = this.page?.locator(
              'textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i]'
            ).first()

            if (!(await commentTextarea!.isVisible())) {
              console.log('[runWork] 댓글 작성이 불가능한 게시글 스킵')
              this.addLog('댓글 입력란 없음', '게시물 건너뜀', false)
              return false
            }

            this.addLog('댓글 입력 중', commentRes.comment)
            await commentTextarea!.pressSequentially(commentRes.comment, { delay: 100 })
            await this.page!.waitForTimeout(500)

            this.addLog('댓글 게시 시도 중')
            isProcessed = await checkedAction(
              this.page!.getByRole('button', { name: /^(게시|Post)$/, exact: true }),
              this.page!,
              '게시'
            )

            if (isProcessed) {
              console.log('댓글 작성 성공!')
              this.addLog('댓글 게시 성공', author, true)

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
        this._status.waiting = null
        this.broadcastStatus()
        this.addLog('피드 작업 완료')
      }

      if (work.hashtagWork.enabled) {
        this.addLog('해시태그 작업 시작')
        await this.page.waitForTimeout(2000)
        
        for (const hashtag of work.hashtagWork.hashtags) {
          if (!this._status.isRunning) break

          this.addLog('해시태그 검색 시작', `#${hashtag}`)
          const hashtagService = new HashtagService(
            this.page,
            async (articleLocator) => {
              let isProcessed = false
              
              try {
                await articleLocator.click()
                await chooseRandomSleep(postInteractionDelays)
                
                this.addLog('해시태그 게시물 열기')
                
                const authorLoc = this.page!.locator(
                  'a.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz._acan._acao._acat._acaw._aj1-._ap30._a6hd'
                ).first()
                const author = await authorLoc.textContent()
                
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
                
                // 내 댓글이 있는지 확인
                const myUsername = this.config.credentials.username
                const comments = this.page!.locator('h3.x6s0dn4.x3nfvp2')
                const commentAuthors = await comments.locator('a').allTextContents()
                
                if (commentAuthors.includes(myUsername)) {
                  await chooseRandomSleep(postInteractionDelays)
                  console.log('이미 댓글을 작성한 게시물 스킵')
                  this.addLog('이미 댓글 작성한 게시물', '건너뜀')
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
                const commentTextareaResult: boolean = await checkedAction(
                  this.page!.locator(
                    'textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i]'
                  ),
                  this.page!,
                  '댓글 입력 영역',
                  async (locator: Locator) => {
                    await locator.pressSequentially(commentRes.comment, { delay: 100 })
                    await chooseRandomSleep(postInteractionDelays)
                    
                    await this.page!.waitForSelector(
                      'div[role="button"]:has-text("게시"), div[role="button"]:has-text("Post")',
                      { state: 'visible', timeout: 3000 }
                    )
                    
                    this.addLog('댓글 게시 시도 중')
                    await checkedAction(
                      this.page!.getByRole('button', { name: /^(게시|Post)$/ }),
                      this.page!,
                      '게시'
                    )
                  }
                )
                
                if (commentTextareaResult) {
                  isProcessed = true
                  this.addLog('댓글 게시 성공', author, true)
                  
                  const waitSeconds = this.config.postIntervalSeconds || 60
                  const until = new Date(Date.now() + waitSeconds * 1000).toLocaleTimeString()
                  this._status.waiting = {
                    for: `댓글 작성 후 대기 중 (${waitSeconds}초)`,
                    until
                  }
                  this.broadcastStatus()
                } else {
                  this.addLog('댓글 게시 실패', '댓글 입력 영역을 찾을 수 없습니다', false)
                }
                
                await chooseRandomSleep(postInteractionDelays)
                this.addLog('게시물 닫기')
                await this.page!.getByLabel(/닫기|Close/).click()
                await chooseRandomSleep(postInteractionDelays)
              } catch (error) {
                console.error('게시물 처리 중 오류:', error)
                this.addLog('게시물 처리 오류', error instanceof Error ? error.message : String(error), false)
                await this.page!.getByLabel(/닫기|Close/).click()
              }
              
              return isProcessed
            },
            {},
            work.hashtagWork.count,
            this.config
          )

          await hashtagService.processHashtag([hashtag])
          
          if (work.hashtagWork.hashtags.indexOf(hashtag) < work.hashtagWork.hashtags.length - 1) {
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
          }
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
              const commentTextarea = this.page?.locator(
                'textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i]'
              ).first()

              if (!(await commentTextarea!.isVisible())) {
                console.log('[runWork] 댓글 작성이 불가능한 게시글 스킵')
                this.addLog('답글 입력란 없음', '건너뜀', false)
                return false
              }

              this.addLog('답글 입력 중', commentRes.comment)
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
              this.addLog('댓글 처리 오류', error instanceof Error ? error.message : String(error), false)
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

      if (
        !work.myFeedInteractionWork.enabled &&
        !work.feedWork.enabled &&
        !work.hashtagWork.enabled &&
        !work.hashtagInteractionWork.enabled
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
}
