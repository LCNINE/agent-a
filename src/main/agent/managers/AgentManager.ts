import { BrowserContext, Locator } from 'playwright-core'
import { AgentConfig, Work } from '../../..'
import { startBrowser } from '../common/browser'
import { loginWithCredentials } from '../common/browserUtils'
import { callGenerateComments } from '../common/fetchers'
import { chooseRandomSleep, postInteractionDelays } from '../common/timeUtils'
import { ArticleProcessingService } from '../services/ArticleProcessingService'
import { HashtagService } from '../services/HashtagProcessingService'

export interface BotStatus {
  isRunning: boolean
  currentWork: Work | null
  waiting: {
    for: string
    until: string
  } | null
}

export class AgentManager {
  private browser: BrowserContext | null = null
  private _status: BotStatus = {
    isRunning: false,
    currentWork: null,
    waiting: null
  }
  private currentWorkIndex = 0

  constructor(
    private works: Work[],
    private config: AgentConfig
  ) {}

  async start(config: AgentConfig, workList: Work[]): Promise<void> {
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
    if (!this.browser || !this.config || this.works.length === 0) return

    while (this._status.isRunning) {
      try {
        const currentWork = this.works[this.currentWorkIndex]
        this._status.currentWork = currentWork

        if (this.works[this.currentWorkIndex] !== undefined) {
          const currentWork = this.works[this.currentWorkIndex]
          await this.runWork(currentWork)
        }

        // Move to next work and wait
        this.currentWorkIndex = (this.currentWorkIndex + 1) % this.works.length

        if (this.currentWorkIndex === 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, (this.config?.loopIntervalSeconds ?? 300) * 1000)
          )
        } else {
          await new Promise((resolve) =>
            setTimeout(resolve, (this.config?.workIntervalSeconds ?? 21600) * 1000)
          )
        }
      } catch (error) {
        console.error('Error in work loop:', error)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        this.currentWorkIndex = (this.currentWorkIndex + 1) % this.works.length
        continue
      }
    }
  }

  async runWork(work: Work) {
    const page = await this.browser!.newPage()

    switch (work.type) {
      case 'feed': {
        let postIndex = 0
        const maxPosts = 10
        const loggedIn = await loginWithCredentials(page!, this.config.credentials)
        if (!loggedIn) throw Error('로그인 실패')

        const articleService = new ArticleProcessingService(
          page,
          async (articleLocator: Locator, articleId: string) => {
            const adIndicatorLocs = await articleLocator.getByText(/광고|Sponsor/).all()
            if (adIndicatorLocs.length !== 0) {
              console.log('[runWork] 광고 스킵')
              return
            }

            const likeButtonLoc = page
              .locator(`article[data-article-id="${articleId}"]`)
              .getByRole('button')
              .filter({
                hasText: /^(좋아요|Like)$/
              })
              .first()

            if (await likeButtonLoc.isVisible()) {
              await likeButtonLoc.evaluate((button) => {
                ;(button as HTMLButtonElement).click()
              })
              await chooseRandomSleep(postInteractionDelays)
            }

            const moreButtonLoc = page
              .locator(`article[data-article-id="${articleId}"]`)
              .getByRole('button')
              .filter({
                hasText: new RegExp('^(더\\s*보기|More)$', 'i')
              })
              .first()

            if (await moreButtonLoc.isVisible()) {
              await moreButtonLoc.click()
              await chooseRandomSleep(postInteractionDelays)
            }

            const articleScreenshot = await articleLocator.screenshot({ type: 'jpeg' })
            const base64Image = articleScreenshot.toString('base64')

            const contentLoc = articleLocator
              .locator('._ap3a._aaco._aacu._aacx._aad7._aade')
              .first()
            const content = await contentLoc.textContent()

            if (content == null) {
              console.log('[runWork] 내용이 없는 게시글 스킵')
              return
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
              return
            }

            const commentTextarea = articleLocator.getByRole('textbox')
            if (!(await commentTextarea.isVisible())) {
              console.log('[runWork] 댓글 작성이 불가능한 게시글 스킵')
              return
            }
            await commentTextarea.pressSequentially(commentRes.comment, { delay: 100 })

            const postButton = articleLocator.getByText(/게시|Post/)
            await postButton.click()
            await chooseRandomSleep(postInteractionDelays)
          },
          {}
        )

        await articleService.processArticles()

        break
      }

      case 'hashtag': {
        const loggedIn = await loginWithCredentials(page!, this.config.credentials)
        if (!loggedIn) throw Error('로그인 실패')

        const hashtagService = new HashtagService(
          page,
          async (postLoc: Locator, articleId: string) => {
            try {
              await postLoc.click()
              await chooseRandomSleep(postInteractionDelays)

              // 내 댓글이 있는지 확인
              const myUsername = this.config.credentials.username
              const comments = page.locator('h3.x6s0dn4.x3nfvp2')
              const commentAuthors = await comments.locator('a').allTextContents()

              if (commentAuthors.includes(myUsername)) {
                console.log('이미 댓글을 작성한 게시물 스킵')
                await page.getByLabel(/닫기|Close/).click()
                return
              }

              const adIndicator = page.getByText(/광고|Sponsored/)
              if (await adIndicator.isVisible()) {
                console.log('광고 게시물 스킵')
                await page.getByLabel(/닫기|Close/).click()
                return
              }

              const likeButtonLoc = page
                .locator('[aria-label="좋아요"], [aria-label="Like"]')
                .first()

              if (await likeButtonLoc.isVisible()) {
                await likeButtonLoc.evaluate((element) => {
                  element.dispatchEvent(
                    new MouseEvent('click', {
                      bubbles: true,
                      cancelable: true,
                      view: window
                    })
                  )
                })
                await chooseRandomSleep(postInteractionDelays)
              }

              const contentLoc = page.locator(
                'li._a9zj._a9zl._a9z5 h1._ap3a._aaco._aacu._aacx._aad7._aade'
              )
              const content = await contentLoc.textContent()
              if (content == null) {
                console.log('[runWork] 내용이 없는 게시글 스킵')
                return
              }

              const mediaLoc = page.locator('div._aatk._aatl')
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
                await page.getByLabel(/닫기|Close/).click()
                return
              }

              const commentTextarea = page.locator(
                'textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i]'
              )
              if (await commentTextarea.isVisible()) {
                await commentTextarea.pressSequentially(commentRes.comment, { delay: 100 })
                await chooseRandomSleep(postInteractionDelays)

                const postButton = page.getByRole('button', { name: /게시|Post/i })
                await postButton.click()
                await chooseRandomSleep(postInteractionDelays)
              }

              await page.getByLabel(/닫기|Close/).click()
              await chooseRandomSleep(postInteractionDelays)
            } catch (error) {
              console.error('게시물 처리 중 오류:', error)
              await page.getByLabel(/닫기|Close/).click()
            }
          },

          {
            maxPosts: 10
          }
        )

        await hashtagService.processHashtag(work.tag)

        break
      }

      default:
        throw Error(`지원하지 않는 작업 타입: ${work}`)
    }
  }

  async stop(): Promise<void> {
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

  getStatus(): BotStatus {
    return this._status
  }
}
