import { BrowserContext, Locator } from 'playwright-core'
import { AgentConfig, FeedWork, Work, WorkType } from '../../..'
import { startBrowser } from '../common/browser'
import { loginWithCredentials } from '../common/browserUtils'
import { callGenerateComments, callGenerateReply } from '../common/fetchers'
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
  private excludeUsernames = new Set<string>()

  constructor(
    private workType: WorkType,
    private works: Work[] | FeedWork[],
    private config: AgentConfig
  ) {
    this.excludeUsernames = new Set(this.config.excludeUsernames)
  }

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

                  await page.waitForTimeout(500)

                  // 게시 버튼 찾기
                  let postButtonLoc = articleLocator
                    .getByRole('button', { name: '게시', exact: true })
                    .first()
                  console.log('[runWork] 게시 버튼 찾기 시도 (한국어):', postButtonLoc)

                  if (!(await postButtonLoc.isVisible())) {
                    console.log('[runWork] 한국어 게시 버튼이 보이지 않음, 영어 버튼 시도')
                    postButtonLoc = articleLocator
                      .getByRole('button', {
                        name: 'Post',
                        exact: true
                      })
                      .first()
                    console.log('[runWork] 게시 버튼 찾기 시도 (영어):', postButtonLoc)
                  }

                  if (await postButtonLoc.isVisible()) {
                    console.log('[runWork] 게시 버튼 클릭')
                    await postButtonLoc.click()
                  } else {
                    console.log('[runWork] 게시 버튼을 찾을 수 없음')
                    return false
                  }

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

                    const authorLoc = page
                      .locator(
                        'a.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz._acan._acao._acat._acaw._aj1-._ap30._a6hd'
                      )
                      .first()
                    const author = await authorLoc.textContent()

                    if (!author) {
                      console.log('[authorLoc] 작성자 요소를 찾을 수 없습니다.')
                      await page.getByLabel(/닫기|Close/).click()
                      return false
                    }

                    if (this.excludeUsernames.has(author)) {
                      console.log('[runWork] 제외 유저 스킵')

                      await page.getByLabel(/닫기|Close/).click()
                      return false
                    }

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
                        { state: 'visible', timeout: 3000 }
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

              const feedList = (work as FeedWork).feedList
              const activeFeeds = feedList.filter((feed) => feed.active)

              const feedWorkBasicModeService = new FeedWorkBasicModeService(
                page,
                async (
                  commentLocator: Locator,
                  commentId: string,
                  commentAuthor: string | null,
                  commentContents: string | null
                ) => {
                  let isProcessed = false

                  console.log(
                    '[work옵션 확인]:',
                    '좋아요 기능 활성화 상태:',
                    work.likeCommentsEnabled
                  )
                  console.log(
                    '[work옵션 확인]:',
                    '답글 기능 활성화 상태:',
                    work.replyCommentsEnabled
                  )

                  const authorLoc = await commentLocator
                    .locator('span._ap3a._aaco._aacw._aacx._aad7._aade')
                    .first()
                  const author = await authorLoc.textContent()

                  if (!author) {
                    console.log('[author] 작성자 요소를 찾을 수 없습니다.')
                    return false
                  }

                  if (this.excludeUsernames.has(author)) {
                    console.log(`[runWork] ${author} 제외 유저 스킵`)
                    return false
                  }

                  if (this.config.credentials.username === commentAuthor) {
                    console.log('[runWork] 자신의 댓글 스킵')
                    return false
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

                  // 좋아요 옵션 활성화일때
                  if (work.likeCommentsEnabled) {
                    const likeButtonLoc = page
                      .locator(`div[data-comment-id="${commentId}"]`)
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
                  }

                  // 답글 옵션 활성화일때
                  if (work.replyCommentsEnabled) {
                    const replyButtonLoc = page.locator(`div[data-comment-id="${commentId}"]`)
                    await replyButtonLoc
                      .getByText(/답글 달기|Reply/i, { exact: false })
                      .click()
                      .catch(() => {
                        console.log('[replyButtonLoc] 답글 달기 버튼을 찾을 수 없습니다.')
                      })

                    const articleScreenshot = await commentLocator.screenshot({ type: 'jpeg' })
                    const base64Image = articleScreenshot.toString('base64')

                    const commentRes = await callGenerateReply({
                      image: base64Image,
                      content: commentContents as string,
                      minLength: this.config.commentLength.min,
                      maxLength: this.config.commentLength.max,
                      prompt: this.config.prompt
                    })

                    if (!commentRes.isAllowed) {
                      console.log('[runWork] AI가 댓글 작성을 거부한 게시글 스킵')
                      return false
                    }

                    const commentTextarea = page.locator(
                      'textarea[aria-label*="댓글" i], textarea[aria-label*="comment" i]'
                    )

                    if (!(await commentTextarea.isVisible())) {
                      console.log('[runWork] 댓글 작성이 불가능한 게시글 스킵')
                      return false
                    }

                    await commentTextarea.pressSequentially(commentRes.comment, { delay: 100 })

                    let postButton = page.getByRole('button', { name: '게시', exact: true })
                    if (!(await postButton.isVisible())) {
                      postButton = page.getByRole('button', { name: 'Post', exact: true })
                    }
                    await postButton.click()

                    isProcessed = true
                  }

                  await chooseRandomSleep(postInteractionDelays)
                  return isProcessed
                },
                {},
                this.config,
                this.currentWorkIndex,
                work
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
