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

export interface BotStatus {
  isRunning: boolean
  currentWork: WorkType | null
  waiting: {
    for: string
    until: string
  } | null
}

export class AgentManager {
  private browser: BrowserContext | null = null
  private page: Page | null = null
  private _status: BotStatus = {
    isRunning: false,
    currentWork: null,
    waiting: null
  }
  private currentWorkIndex = 0
  private excludeUsernames = new Set<string>()
  private isLoggedIn: Boolean = false

  constructor(
    private works: WorkType,
    private config: AgentConfig
  ) {
    this.excludeUsernames = new Set(this.config.excludeUsernames)
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
        waiting: null
      }

      this.config = config
      this.works = workList
      this.currentWorkIndex = 0
      this.browser = await startBrowser(this.config.credentials)

      await this.startWorkLoop()
    } catch (error) {
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
          this.stop()
          break
        }

        this._status.currentWork = this.works
        await this.runWork(this.works)

        // 작업 완료 후 설정된 시간만큼 대기
        console.log(
          `작업 완료. ${this.config.loopIntervalSeconds || 300}초 대기 후 다시 시작합니다.`
        )

        // 테스트할때 사용
        // await new Promise((resolve) => setTimeout(resolve, 200))

        // 테스트할때 주석처리
        await new Promise((resolve) =>
          setTimeout(resolve, (this.config?.loopIntervalSeconds ?? 300) * 1000)
        )
      } catch (error) {
        console.error('Error in work loop:', error)

        if (String(error).includes('Target page, context or browser has been closed')) {
          console.log('브라우저가 닫혔습니다. 작업을 중단합니다.')
          this.stop()
          break
        }

        // 오류 발생 시 짧은 시간 대기 후 다시 시도
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }
  }

  async runWork(work: WorkType) {
    try {
      if (await this.isBrowserClosed()) {
        console.log('브라우저가 닫혔거나 유효하지 않습니다.')
        this.stop()
        return
      }

      if (!this.page) {
        this.page = await this.browser!.newPage()
        this.isLoggedIn = false
      }

      if (!this.isLoggedIn) {
        this.isLoggedIn = await loginWithCredentials(this.page, this.config.credentials)

        if (!this.isLoggedIn) throw Error('로그인 실패')
        await this.page.goto('https://www.instagram.com/')
      }

      if (work.feedWork.enabled) {
        await this.page.waitForTimeout(2000)
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
              return false
            }

            if (this.excludeUsernames.has(author)) {
              console.log(`[runWork] ${author} 제외 유저 스킵`)
              return false
            }

            const adIndicatorLocs = await articleLocator.getByText(/광고|Sponsor/).all()
            if (adIndicatorLocs.length !== 0) {
              console.log('[runWork] 광고 스킵')
              return false
            }

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
              await chooseRandomSleep(postInteractionDelays)
            } else {
              return likeResult
            }

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
              await chooseRandomSleep(postInteractionDelays)
            } else {
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
              return false
            }

            const commentRes = await callGenerateComments({
              image: base64Image,
              content: content,
              minLength: this.config.commentLength.min,
              maxLength: this.config.commentLength.max,
              prompt: this.config.prompt
            })

            if (!commentRes.isAllowed) {
              console.log('[runWork] AI가 댓글 작성을 거부한 게시글 스킵')
              return false
            }

            const commentTextarea = articleLocator.getByRole('textbox')
            if (!(await commentTextarea.isVisible())) {
              console.log('[runWork] 댓글 작성이 불가능한 게시글 스킵')
              return false
            }
            await commentTextarea.pressSequentially(commentRes.comment, { delay: 100 })

            await this.page!.waitForTimeout(500)

            const postButtonResult = await checkedAction(
              articleLocator
                .getByRole('button')
                .filter({ hasText: /^(게시|Post)$/ })
                .first(),
              this.page!,
              '게시'
            )

            console.log('[runWork] 댓글 작성 완료')

            if (!postButtonResult) {
              return false
            }

            isProcessed = true
            await chooseRandomSleep(postInteractionDelays)

            return isProcessed
          },
          {},
          this.works.feedWork.count,
          this.config
        )

        await articleService.processArticles()
      }

      if (work.hashtagWork.enabled) {
        await this.page.waitForTimeout(2000)
        await navigateToHome(this.page)
        await this.page.waitForTimeout(2000)

        const hashtagService = new HashtagService(
          this.page,
          async (postLoc: Locator) => {
            let isProcessed = false

            try {
              await postLoc.click()
              await chooseRandomSleep(postInteractionDelays)

              const authorLoc = this.page!.locator(
                'a.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz._acan._acao._acat._acaw._aj1-._ap30._a6hd'
              ).first()
              const author = await authorLoc.textContent()

              if (!author) {
                console.log('[authorLoc] 작성자 요소를 찾을 수 없습니다.')
                await this.page!.getByLabel(/닫기|Close/).click()
                return false
              }

              if (this.excludeUsernames.has(author)) {
                console.log('[runWork] 제외 유저 스킵')

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

                await this.page!.getByLabel(/닫기|Close/).click()
                return false
              }

              const adIndicator = this.page!.getByText(/광고|Sponsored/)
              if (await adIndicator.isVisible()) {
                await chooseRandomSleep(postInteractionDelays)
                console.log('광고 게시물 스킵')

                await this.page!.getByLabel(/닫기|Close/).click()
                return false
              }

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
                await chooseRandomSleep(postInteractionDelays)
              }

              const contentLoc = this.page!.locator(
                'li._a9zj._a9zl._a9z5 h1._ap3a._aaco._aacu._aacx._aad7._aade'
              )
              const content = await contentLoc.textContent()
              if (content == null) {
                console.log('[runWork] 내용이 없는 게시글 스킵')
                return false
              }

              const mediaLoc = this.page!.locator('div._aatk._aatl')
              const mediaBase64 = await mediaLoc.screenshot({ type: 'jpeg' })
              const base64Image = mediaBase64.toString('base64')

              const commentRes = await callGenerateComments({
                image: base64Image,
                content: content || '',
                minLength: this.config.commentLength.min,
                maxLength: this.config.commentLength.max,
                prompt: this.config.prompt
              })

              if (!commentRes.isAllowed) {
                console.log('AI가 댓글 작성을 거부한 게시글 스킵')

                await this.page!.getByLabel(/닫기|Close/).click()
                return false
              }

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

                  await checkedAction(
                    this.page!.getByRole('button', { name: /^(게시|Post)$/ }),
                    this.page!,
                    '게시'
                  )
                }
              )

              if (commentTextareaResult) {
                isProcessed = true
              }

              await chooseRandomSleep(postInteractionDelays)
              await this.page!.getByLabel(/닫기|Close/).click()
              await chooseRandomSleep(postInteractionDelays)
            } catch (error) {
              console.error('게시물 처리 중 오류:', error)
              await this.page!.getByLabel(/닫기|Close/).click()
            }

            return isProcessed
          },
          {},
          this.works.hashtagWork.count,
          this.config
        )

        await hashtagService.processHashtag(work.hashtagWork.hashtags)
      }

      if (work.myFeedInteractionWork.enabled) {
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
                return false
              }

              if (this.config.credentials.username === notificationInfo.author) {
                console.log('[runWork] 자신의 댓글 스킵')
                return false
              }
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
                await chooseRandomSleep(postInteractionDelays)
              }

              // 답글 모두 보기 버튼
              const siblingDivs = commentLocator.locator('xpath=../following-sibling::div[1]')
              const button = await siblingDivs.getByRole('button')
              if (await button.isVisible()) {
                await button.click()
              }

              const commentReply = await siblingDivs
                .locator('ul')
                .textContent()
                .catch(() => {
                  return null
                })

              if (commentReply === null) {
                console.log('[commentReply] 아직 답글을 달지 못한 게시글 확인')
              }

              if (
                (commentReply && commentReply.startsWith(this.config.credentials.username)) ||
                commentReply?.includes(this.config.credentials.username)
              ) {
                console.log('[runWork] 이미 답글을 작성한 댓글이므로 건너뜁니다.')
                return false
              }

              await checkedAction(
                commentLocator.getByText(/답글 달기|Reply/i, { exact: false }).first(),
                this.page!,
                '답글 달기'
              )

              // 댓글 스크린샷 및 AI 답글 생성
              const commentScreenshot = await commentLocator.screenshot({ type: 'jpeg' })
              const base64Image = commentScreenshot.toString('base64')

              const commentRes = await callGenerateReply({
                image: base64Image,
                content: notificationInfo.content,
                minLength: this.config.commentLength.min,
                maxLength: this.config.commentLength.max,
                prompt: this.config.prompt
              })

              if (!commentRes.isAllowed) {
                console.log('[runWork] AI가 댓글 작성을 거부한 게시글 스킵')
                return false
              }

              // 댓글 입력 영역 찾기
              const commentTextarea = this.page?.locator(
                'textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i]'
              )

              if (!(await commentTextarea!.isVisible())) {
                console.log('[runWork] 댓글 작성이 불가능한 게시글 스킵')
                return false
              }

              await commentTextarea!.pressSequentially(commentRes.comment, { delay: 100 })
              await this.page!.waitForTimeout(500)

              // 게시 버튼 찾기 및 클릭
              isProcessed = await checkedAction(
                this.page!.getByRole('button', { name: /^(게시|Post)$/, exact: true }),
                this.page!,
                '게시'
              )

              if (isProcessed) {
                console.log('답글 작성 성공!')
              }

              await chooseRandomSleep(postInteractionDelays)
            } catch (error) {
              console.error('댓글 처리 중 오류:', error)
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
      }

      if (work.hashtagInteractionWork.enabled) {
        await this.page.waitForTimeout(2000)
        await navigateToHome(this.page)
        await this.page.waitForTimeout(2000)

        console.log('hashtagInteractionWork 기능은 아직 구현되지 않았습니다.')
      }

      // 어떤 작업도 지정되지 않은 경우 에러 처리
      if (
        !work.myFeedInteractionWork &&
        !work.feedWork &&
        !work.hashtagWork &&
        !work.hashtagInteractionWork
      ) {
        throw Error('지원하지 않는 작업')
      }
    } catch (error) {
      console.error('작업 실행 중 오류 발생:', error)

      // 브라우저 닫힘 에러인 경우 처리
      if (String(error).includes('Target page, context or browser has been closed')) {
        console.log('브라우저가 닫혔습니다. 작업을 중단합니다.')
        this.stop()
      }

      throw error
    }
  }

  async stop(): Promise<void> {
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
      waiting: null
    }
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
}
