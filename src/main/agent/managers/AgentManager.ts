import { BrowserContext, Locator } from 'playwright-core'
import { AgentConfig, FeedWork, Work, WorkType } from '../../..'
import { startBrowser } from '../common/browser'
import { loginWithCredentials } from '../common/browserUtils'
import { callGenerateComments } from '../common/fetchers'
import { chooseRandomSleep, majorActionDelays, postInteractionDelays } from '../common/timeUtils'
import { ArticleProcessingService } from '../services/ArticleProcessingService'
import { HashtagService } from '../services/HashtagProcessingService'
import { FeedWorkBasicModeService } from '../services/FeedWorkBasicModeService'

export interface BotStatus {
  isRunning: boolean
  currentWork: Work | FeedWork | null
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
    private workType: WorkType,
    private works: Work[] | FeedWork[],
    private config: AgentConfig
  ) {}

  async start(config: AgentConfig, workList: Work[] | FeedWork[]): Promise<void> {
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
    if (!this.browser || !this.config || this.works?.length === 0) return

    while (this._status.isRunning) {
      try {
        if (await this.isBrowserClosed()) {
          console.log('브라우저가 닫혔습니다. 작업을 중단합니다.')
          this.stop()
          break
        }

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

        if (String(error).includes('Target page, context or browser has been closed')) {
          console.log('브라우저가 닫혔습니다. 작업을 중단합니다.')
          this.stop()
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))
        this.currentWorkIndex = (this.currentWorkIndex + 1) % this.works.length
        continue
      }
    }
  }

  async runWork(work: Work | FeedWork) {
    try {
      if (await this.isBrowserClosed()) {
        console.log('브라우저가 닫혔거나 유효하지 않습니다.')
        this.stop()
        return
      }

      const page = await this.browser!.newPage()

      if (this.workType === 'hashtag_and_feed') {
        if ('type' in work) {
          switch (work.type) {
            case 'feed': {
              const loggedIn = await loginWithCredentials(page!, this.config.credentials)

              if (!loggedIn) throw Error('로그인 실패')

              await page.waitForTimeout(2000)
              await page.goto('https://www.instagram.com/')

              const articleService = new ArticleProcessingService(
                page,
                async (articleLocator: Locator, articleId: string) => {
                  let isProcessed = false

                  const adIndicatorLocs = await articleLocator.getByText(/광고|Sponsor/).all()
                  if (adIndicatorLocs.length !== 0) {
                    console.log('[runWork] 광고 스킵')
                    return false
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

                  let postButton = articleLocator.getByRole('button', { name: '게시', exact: true })
                  if (!(await postButton.isVisible())) {
                    postButton = articleLocator.getByRole('button', { name: 'Post', exact: true })
                  }
                  await postButton.click()

                  isProcessed = true
                  await chooseRandomSleep(postInteractionDelays)

                  return isProcessed
                },
                {},
                this.config
              )

              await articleService.processArticles()
              break
            }

            case 'hashtag': {
              const loggedIn = await loginWithCredentials(page!, this.config.credentials)
              if (!loggedIn) throw Error('로그인 실패')

              await page.waitForTimeout(2000)
              await page.goto('https://www.instagram.com/')

              const hashtagService = new HashtagService(
                page,
                async (postLoc: Locator, articleId: string) => {
                  let isProcessed = false

                  try {
                    await postLoc.click()
                    await chooseRandomSleep(postInteractionDelays)

                    // 내 댓글이 있는지 확인
                    const myUsername = this.config.credentials.username
                    const comments = page.locator('h3.x6s0dn4.x3nfvp2')
                    const commentAuthors = await comments.locator('a').allTextContents()

                    if (commentAuthors.includes(myUsername)) {
                      await chooseRandomSleep(postInteractionDelays)

                      console.log('이미 댓글을 작성한 게시물 스킵')

                      await page.getByLabel(/닫기|Close/).click()
                      return false
                    }

                    const adIndicator = page.getByText(/광고|Sponsored/)
                    if (await adIndicator.isVisible()) {
                      await chooseRandomSleep(postInteractionDelays)
                      console.log('광고 게시물 스킵')

                      await page.getByLabel(/닫기|Close/).click()
                      return false
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
                      return false
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
                      return false
                    }

                    const commentTextarea = page.locator(
                      'textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i]'
                    )
                    if (await commentTextarea.isVisible()) {
                      await commentTextarea.pressSequentially(commentRes.comment, { delay: 100 })
                      await chooseRandomSleep(postInteractionDelays)

                      await page.waitForSelector(
                        'div[role="button"]:has-text("게시"), div[role="button"]:has-text("Post")',
                        { state: 'visible', timeout: 60000 }
                      )

                      // 한국어 또는 영어 게시 버튼을 찾아 클릭
                      let postButton = page.getByRole('button', { name: '게시', exact: true })
                      if (!(await postButton.isVisible())) {
                        postButton = page.getByRole('button', { name: 'Post', exact: true })
                      }
                      await postButton.click()
                      isProcessed = true
                    }

                    await chooseRandomSleep(postInteractionDelays)
                    await page.getByLabel(/닫기|Close/).click()
                    await chooseRandomSleep(postInteractionDelays)
                  } catch (error) {
                    console.error('게시물 처리 중 오류:', error)
                    await page.getByLabel(/닫기|Close/).click()
                  }

                  return isProcessed
                },
                {},
                this.config
              )

              await hashtagService.processHashtag(work.tag)
              break
            }

            default:
              throw Error(`지원하지 않는 작업 타입: ${work}`)
          }
        }
      } else {
        if ('feedWorkModeType' in work) {
          switch (work.feedWorkModeType) {
            case 'basic':
              const loggedIn = await loginWithCredentials(page!, this.config.credentials)
              if (!loggedIn) throw Error('로그인 실패')

              await page.waitForTimeout(2000)

              const feeds = (work as FeedWork).feeds
              const activeFeeds = feeds.filter((feed) => feed.active)

              await page.goto(activeFeeds[this.currentWorkIndex].url)

              const feedWorkBasicModeService = new FeedWorkBasicModeService(
                page,
                async (feedLoc: Locator, feedId: string) => {
                  return true
                },
                {},
                this.config
              )

              await feedWorkBasicModeService.processFeeds(activeFeeds)
              break

            case 'advanced':
              break

            default:
              throw Error(`지원하지 않는 작업 타입: ${work}`)
          }
        }
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
