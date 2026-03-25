import { Locator, Page } from 'playwright-core'
import { AgentConfig, TargetUser } from '../../..'
import { checkedAction } from '../common/checkedAction'
import { randomSleep } from '../common/timeUtils'

interface TargetUserProcessingOptions {
  likeEnabled: boolean
  commentEnabled: boolean
  postsPerUser: number
  onLike?: (username: string, postIndex: number) => Promise<void>
  onComment?: (username: string, postIndex: number, imageBase64: string, content: string) => Promise<string | null>
  onUserStatusUpdate?: (username: string, status: TargetUser['status'], error?: string) => void
  onLog?: (action: string, details?: string, success?: boolean) => void
}

export class TargetUserProcessingService {
  private page: Page
  private config: AgentConfig
  private options: TargetUserProcessingOptions
  private shouldStop: boolean = false

  constructor(
    page: Page,
    config: AgentConfig,
    options: TargetUserProcessingOptions
  ) {
    this.page = page
    this.config = config
    this.options = options
  }

  stop() {
    this.shouldStop = true
  }

  private log(action: string, details?: string, success?: boolean) {
    if (this.options.onLog) {
      this.options.onLog(action, details, success)
    }
    console.log(`[TargetUserProcessingService] ${action}${details ? `: ${details}` : ''}`)
  }

  async processTargetUsers(users: TargetUser[]): Promise<void> {
    const pendingUsers = users.filter(u => u.status === 'pending')
    this.log('타겟 유저 처리 시작', `${pendingUsers.length}명 대기 중`)

    for (const user of pendingUsers) {
      if (this.shouldStop) {
        this.log('작업 중지됨')
        break
      }

      try {
        this.options.onUserStatusUpdate?.(user.username, 'processing')
        await this.processUser(user.username)
        this.options.onUserStatusUpdate?.(user.username, 'completed')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.log('유저 처리 실패', `${user.username}: ${errorMessage}`, false)
        this.options.onUserStatusUpdate?.(user.username, 'failed', errorMessage)
      }

      // 유저 간 대기
      if (!this.shouldStop) {
        const waitSeconds = this.config.workIntervalSeconds || 60
        this.log('유저 간 대기', `${waitSeconds}초`)
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
      }
    }

    this.log('타겟 유저 처리 완료')
  }

  private async processUser(username: string): Promise<void> {
    this.log('프로필 방문', username)

    // 프로필 페이지 방문
    const profileUrl = `https://www.instagram.com/${username}/`
    await this.page.goto(profileUrl, { waitUntil: 'networkidle' })
    await randomSleep(3000, 0.5) // 3-5초 랜덤 대기

    // 계정 상태 확인
    const accountStatus = await this.checkAccountStatus()
    if (accountStatus !== 'accessible') {
      throw new Error(accountStatus === 'private' ? '비공개 계정입니다' : '존재하지 않는 계정입니다')
    }

    // 게시물 링크 가져오기
    const postLinks = await this.getPostLinks()
    if (postLinks.length === 0) {
      this.log('게시물 없음', username)
      return
    }

    this.log('게시물 발견', `${username}: ${postLinks.length}개`)

    let processedCount = 0
    const postsToProcess = this.options.postsPerUser

    for (let i = 0; i < postLinks.length && processedCount < postsToProcess; i++) {
      if (this.shouldStop) break

      try {
        // 프로필 페이지에서 다시 게시물 목록 가져오기 (DOM이 변경될 수 있으므로)
        const currentPostLinks = await this.getPostLinks()
        if (i >= currentPostLinks.length) {
          this.log('게시물 인덱스 초과', `${i}/${currentPostLinks.length}`)
          break
        }

        const wasProcessed = await this.processPost(currentPostLinks[i], username, i)
        if (wasProcessed) {
          processedCount++
          this.log('게시물 처리 완료', `${username}: ${processedCount}/${postsToProcess}`)
        }

        // 게시물 간 대기 - 설정된 postIntervalSeconds 사용
        if (processedCount < postsToProcess && !this.shouldStop) {
          const waitSeconds = this.config.postIntervalSeconds || 60
          this.log('게시물 간 대기', `${waitSeconds}초`)
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
        }
      } catch (error) {
        this.log('게시물 처리 실패', `${username} 게시물 ${i + 1}: ${error instanceof Error ? error.message : String(error)}`, false)
      }
    }

    this.log('유저 처리 완료', `${username}: ${processedCount}개 처리됨`)
  }

  private async checkAccountStatus(): Promise<'accessible' | 'private' | 'not_found'> {
    try {
      await this.page.waitForTimeout(1000)

      // 존재하지 않는 페이지 확인
      const notFoundText = await this.page.getByText(/페이지를 사용할 수 없습니다|Sorry, this page isn't available/i).isVisible()
      if (notFoundText) {
        return 'not_found'
      }

      // 비공개 계정 확인
      const privateText = await this.page.getByText(/비공개 계정|This account is private/i).isVisible()
      if (privateText) {
        return 'private'
      }

      return 'accessible'
    } catch {
      return 'accessible'
    }
  }

  private async getPostLinks(): Promise<Locator[]> {
    try {
      // 프로필 게시물 그리드 로드 대기 - /p/ (게시물)와 /reel/ (릴스) 모두 포함
      const selectors = [
        'main article a[href*="/p/"], main article a[href*="/reel/"]',
        'main section a[href*="/p/"], main section a[href*="/reel/"]',
        'a[href*="/p/"][role="link"], a[href*="/reel/"][role="link"]',
        'div._ac7v a[href*="/p/"], div._ac7v a[href*="/reel/"]',
        'article div a[href*="/p/"], article div a[href*="/reel/"]'
      ]

      let postLocators: Locator[] = []

      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 3000 })
          postLocators = await this.page.locator(selector).all()
          if (postLocators.length > 0) {
            this.log('게시물 선택자 사용', `${selector} - ${postLocators.length}개 발견`)
            break
          }
        } catch {
          continue
        }
      }

      return postLocators
    } catch {
      return []
    }
  }

  private async processPost(postLocator: Locator, username: string, postIndex: number): Promise<boolean> {
    this.log('게시물 클릭 시도', `${username} 게시물 ${postIndex + 1}`)

    // 게시물 요소로 스크롤
    try {
      await postLocator.scrollIntoViewIfNeeded()
      await this.page.waitForTimeout(500)
    } catch (e) {
      this.log('스크롤 실패', `${username} 게시물 ${postIndex + 1}`)
    }

    // 게시물 클릭하여 모달 열기
    try {
      await postLocator.click({ force: true })
    } catch (e) {
      this.log('게시물 클릭 실패', `${username} 게시물 ${postIndex + 1}: ${e}`, false)
      return false
    }

    await this.page.waitForTimeout(2500)

    // 모달 확인 - 여러 선택자 시도
    let dialog: Locator | null = null
    const dialogSelectors = [
      '[role="dialog"]',
      'div[style*="display: flex"] article',
      'div._aatb'
    ]

    for (const selector of dialogSelectors) {
      const loc = this.page.locator(selector).first()
      if (await loc.isVisible().catch(() => false)) {
        dialog = loc
        break
      }
    }

    if (!dialog) {
      this.log('게시물 모달 열기 실패', `${username} 게시물 ${postIndex + 1}`, false)
      await this.page.keyboard.press('Escape')
      return false
    }

    let didSomething = false

    try {
      // 이미 좋아요 했는지 확인
      const alreadyLiked = await this.checkAlreadyLiked(dialog)

      // 이미 댓글 작성했는지 확인
      const alreadyCommented = await this.checkAlreadyCommented(dialog)

      // 좋아요 필요 여부
      const needLike = this.options.likeEnabled && !alreadyLiked
      // 댓글 필요 여부
      const needComment = this.options.commentEnabled && this.options.onComment && !alreadyCommented

      this.log('게시물 상태 확인', `좋아요: ${alreadyLiked ? '완료' : '필요'}, 댓글: ${alreadyCommented ? '완료' : '필요'}`)

      // 이미 모든 작업 완료된 경우 - 이 게시물 건너뛰기
      if (!needLike && !needComment) {
        this.log('이미 처리된 게시물 - 건너뜀', `${username} 게시물 ${postIndex + 1}`)
        return false // 처리하지 않음 → 다음 게시물로
      }

      // 좋아요 처리 (아직 안 했으면)
      if (needLike) {
        const likeSuccess = await this.handleLike(dialog, username, postIndex)
        if (likeSuccess) didSomething = true
      }

      // 댓글 처리 (아직 안 했으면)
      if (needComment) {
        const commentSuccess = await this.handleComment(dialog, username, postIndex)
        if (commentSuccess) didSomething = true
      }

    } finally {
      // 모달 닫기
      await this.closeModal()
      await this.page.waitForTimeout(1000)
    }

    return didSomething // 실제로 작업한 경우만 true
  }

  private async checkAlreadyLiked(dialog: Locator): Promise<boolean> {
    try {
      // "좋아요 취소" 버튼이 있으면 이미 좋아요 한 것
      const unlikeButton = dialog.locator('[aria-label="좋아요 취소"], [aria-label="Unlike"]').first()
      return await unlikeButton.isVisible().catch(() => false)
    } catch {
      return false
    }
  }

  private async checkAlreadyCommented(dialog: Locator): Promise<boolean> {
    try {
      const myUsername = this.config.credentials.username
      // 댓글 목록에서 내 username 찾기
      const comments = dialog.locator('ul li span a, h3 a, div._a9zr a')
      const allCommentAuthors = await comments.allTextContents()
      return allCommentAuthors.some(author => author.toLowerCase() === myUsername.toLowerCase())
    } catch {
      return false
    }
  }

  private async handleLike(dialog: Locator, username: string, postIndex: number): Promise<boolean> {
    // 좋아요 버튼 찾기 - 여러 선택자 시도
    const likeSelectors = [
      '[aria-label="좋아요"]',
      '[aria-label="Like"]',
      'svg[aria-label="좋아요"]',
      'svg[aria-label="Like"]'
    ]

    let likeButton: Locator | null = null
    for (const selector of likeSelectors) {
      const loc = dialog.locator(selector).first()
      if (await loc.isVisible().catch(() => false)) {
        likeButton = loc
        break
      }
    }

    if (!likeButton) {
      // 페이지 전체에서 찾기
      for (const selector of likeSelectors) {
        const loc = this.page.locator(selector).first()
        if (await loc.isVisible().catch(() => false)) {
          likeButton = loc
          break
        }
      }
    }

    if (!likeButton) {
      this.log('좋아요 버튼을 찾을 수 없음', `${username} 게시물 ${postIndex + 1}`)
      return false
    }

    const likeResult = await checkedAction(
      likeButton,
      this.page,
      '좋아요',
      async (locator: Locator) => {
        await locator.evaluate((el) => {
          const clickable = el.closest('[role="button"], button') || el
          clickable.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })
      }
    )

    if (likeResult) {
      this.log('좋아요 성공', `${username} 게시물 ${postIndex + 1}`, true)
      if (this.options.onLike) {
        await this.options.onLike(username, postIndex)
      }
      // 좋아요 후 대기 - 설정된 postIntervalSeconds 사용
      const waitSeconds = this.config.postIntervalSeconds || 60
      this.log('좋아요 후 대기', `${waitSeconds}초`)
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
      return true
    } else {
      this.log('좋아요 실패', `${username} 게시물 ${postIndex + 1}`)
      return false
    }
  }

  private async handleComment(dialog: Locator, username: string, postIndex: number): Promise<boolean> {
    try {
      // 댓글 입력 영역 찾기 - 여러 선택자 시도
      const textareaSelectors = [
        '[role="textbox"][contenteditable="true"]',
        'textarea[aria-label*="댓글" i]',
        'textarea[aria-label*="comment" i]',
        'textarea[placeholder*="댓글" i]',
        'textarea[placeholder*="comment" i]'
      ]

      let commentTextarea: Locator | null = null

      // 댓글 입력창이 이미 보이는지 확인
      for (const selector of textareaSelectors) {
        const loc = dialog.locator(selector).first()
        if (await loc.isVisible().catch(() => false)) {
          commentTextarea = loc
          this.log('댓글 입력창 발견', selector)
          break
        }
      }

      // 댓글 입력창이 없으면 "댓글 달기" 텍스트 클릭 시도
      if (!commentTextarea) {
        // "댓글 달기" 또는 "Add a comment" 텍스트 찾기
        const commentTriggerSelectors = [
          'span:has-text("댓글 달기")',
          'span:has-text("Add a comment")',
          'form span:has-text("댓글")',
          'section span:has-text("댓글 달기")'
        ]

        for (const selector of commentTriggerSelectors) {
          const trigger = dialog.locator(selector).first()
          if (await trigger.isVisible().catch(() => false)) {
            this.log('댓글 달기 텍스트 클릭', selector)
            await trigger.click({ force: true })
            await this.page.waitForTimeout(1500)
            break
          }
        }
      }

      // textarea 찾기
      for (const selector of textareaSelectors) {
        // dialog 내에서 찾기
        let loc = dialog.locator(selector).first()
        if (await loc.isVisible().catch(() => false)) {
          commentTextarea = loc
          break
        }
        // 페이지 전체에서 찾기
        loc = this.page.locator(selector).first()
        if (await loc.isVisible().catch(() => false)) {
          commentTextarea = loc
          break
        }
      }

      if (!commentTextarea) {
        this.log('댓글 입력 영역을 찾을 수 없음', `${username} 게시물 ${postIndex + 1}`)
        return false
      }

      // 스크린샷 및 콘텐츠 가져오기
      const screenshot = await dialog.screenshot({ type: 'jpeg' }).catch(() => null)
      if (!screenshot) {
        this.log('스크린샷 캡처 실패', `${username} 게시물 ${postIndex + 1}`)
        return false
      }
      const base64Image = screenshot.toString('base64')

      // 게시물 내용 가져오기
      const contentSelectors = ['h1', 'span[dir="auto"]', 'div._a9zs span']
      let content = ''
      for (const selector of contentSelectors) {
        const contentLoc = dialog.locator(selector).first()
        content = await contentLoc.textContent().catch(() => '') || ''
        if (content) break
      }

      // AI 댓글 생성
      const generatedComment = await this.options.onComment!(username, postIndex, base64Image, content)
      if (!generatedComment) {
        this.log('댓글 생성 실패/거부', `${username} 게시물 ${postIndex + 1}`)
        return false
      }

      // 댓글 입력 - contenteditable 요소에 더 안정적으로 입력
      await commentTextarea.click({ force: true })
      await this.page.waitForTimeout(500)

      // 기존 내용 삭제 (있을 경우)
      await this.page.keyboard.press('Control+A')
      await this.page.waitForTimeout(100)
      await this.page.keyboard.press('Backspace')
      await this.page.waitForTimeout(300)

      // 방법 1: type() 사용 (키보드 입력 시뮬레이션)
      await this.page.keyboard.type(generatedComment, { delay: 80 })
      await this.page.waitForTimeout(800)

      // 입력 확인
      const inputtedText = await commentTextarea.textContent().catch(() => '') ||
                           await commentTextarea.inputValue().catch(() => '') || ''

      // 입력이 안 됐으면 다른 방법 시도
      if (inputtedText.trim().length < generatedComment.length * 0.5) {
        this.log('댓글 입력 재시도', 'fill() 방식 사용')
        await commentTextarea.click({ force: true })
        await this.page.waitForTimeout(300)

        // 방법 2: fill() 사용 (직접 값 설정)
        try {
          await commentTextarea.fill(generatedComment)
        } catch {
          // contenteditable인 경우 evaluate 사용
          await commentTextarea.evaluate((el, text) => {
            (el as HTMLElement).innerText = text
            el.dispatchEvent(new Event('input', { bubbles: true }))
          }, generatedComment)
        }
        await this.page.waitForTimeout(500)
      }

      // 최종 입력 확인
      const finalText = await commentTextarea.textContent().catch(() => '') ||
                        await commentTextarea.inputValue().catch(() => '') || ''
      this.log('댓글 입력 완료', `"${finalText.substring(0, 30)}..." (${finalText.length}자)`)

      if (finalText.trim().length === 0) {
        this.log('댓글 입력 실패', '입력창에 텍스트가 없음', false)
        return false
      }

      // 게시 버튼 찾기 - AgentManager와 동일한 방식 사용
      // dialog 내에서 "게시" 또는 "Post" 버튼 찾기
      let postButton = dialog.getByRole('button').filter({ hasText: /^(게시|Post)$/ }).first()

      // dialog에서 못 찾으면 form에서 찾기
      if (!(await postButton.isVisible().catch(() => false))) {
        const form = dialog.locator('form').first()
        postButton = form.getByRole('button').filter({ hasText: /^(게시|Post)$/ }).first()
      }

      // form에서도 못 찾으면 페이지 전체에서 찾기 (단, 공유 모달 제외)
      if (!(await postButton.isVisible().catch(() => false))) {
        postButton = this.page.locator('form:has([role="textbox"])').getByRole('button').filter({ hasText: /^(게시|Post)$/ }).first()
      }

      // 마지막 시도: div[role="button"]으로 찾기
      if (!(await postButton.isVisible().catch(() => false))) {
        postButton = dialog.locator('div[role="button"]').filter({ hasText: /^(게시|Post)$/ }).first()
      }

      if (!(await postButton.isVisible().catch(() => false))) {
        this.log('게시 버튼을 찾을 수 없음', `${username} 게시물 ${postIndex + 1}`, false)
        return false
      }

      // 게시 버튼 상태 확인
      const isDisabled = await postButton.getAttribute('aria-disabled').catch(() => null)
      this.log('게시 버튼 상태', `disabled: ${isDisabled}`)

      if (isDisabled === 'true') {
        this.log('게시 버튼 비활성화 상태', '댓글 입력이 인식되지 않음', false)

        // 입력창에 포커스 후 재입력 시도
        await commentTextarea.click({ force: true })
        await this.page.waitForTimeout(300)
        await this.page.keyboard.press('Control+A')
        await this.page.keyboard.press('Backspace')
        await this.page.waitForTimeout(200)
        await this.page.keyboard.type(generatedComment, { delay: 50 })
        await this.page.waitForTimeout(1000)

        // 다시 확인
        const isStillDisabled = await postButton.getAttribute('aria-disabled').catch(() => null)
        if (isStillDisabled === 'true') {
          this.log('게시 버튼 여전히 비활성화', '댓글 게시 실패', false)
          return false
        }
      }

      // 게시 버튼 클릭
      this.log('게시 버튼 클릭', '')
      const postResult = await checkedAction(
        postButton,
        this.page,
        '댓글 게시',
        async (locator: Locator) => {
          await locator.click({ force: true })
        }
      )

      await this.page.waitForTimeout(2500)

      // 공유 모달이 열렸는지 확인
      const shareModal = this.page.locator('div[role="dialog"]:has-text("받는 사람"), div[role="dialog"]:has-text("공유")').first()
      if (await shareModal.isVisible().catch(() => false)) {
        this.log('공유 모달 감지 - 잘못된 버튼 클릭됨', '', false)
        await this.page.keyboard.press('Escape')
        await this.page.waitForTimeout(500)
        return false
      }

      // 댓글 게시 성공 여부 확인 - 입력창이 비워졌는지 확인
      const textAfterPost = await commentTextarea.textContent().catch(() => '') ||
                            await commentTextarea.inputValue().catch(() => '') || ''

      // 입력창이 비워졌으면 성공
      if (textAfterPost.trim() === '' || textAfterPost.length < finalText.length * 0.5) {
        this.log('댓글 게시 성공 (입력창 비워짐)', `${username} 게시물 ${postIndex + 1}`, true)
      } else {
        // 입력창에 내용이 남아있으면 실패 가능성
        this.log('댓글 게시 실패 가능성', `입력창에 내용 남음: "${textAfterPost.substring(0, 20)}..."`, false)

        // 추가 확인: 내 댓글이 목록에 있는지 확인
        const myUsername = this.config.credentials.username
        const commentsAfter = dialog.locator('ul li span a, h3 a, div._a9zr a, span a[role="link"]')
        const allAuthors = await commentsAfter.allTextContents().catch(() => [])
        const foundMyComment = allAuthors.some(author =>
          author.toLowerCase() === myUsername.toLowerCase()
        )

        if (foundMyComment) {
          this.log('댓글 게시 확인됨 (목록에서 발견)', `${username} 게시물 ${postIndex + 1}`, true)
        } else {
          this.log('댓글 게시 실패', `${username} 게시물 ${postIndex + 1} - 입력창이 비워지지 않음`, false)
          return false
        }
      }

      this.log('댓글 게시 완료', `${username} 게시물 ${postIndex + 1}`, true)
      // 댓글 후 대기 - 설정된 postIntervalSeconds 사용
      const waitSeconds = this.config.postIntervalSeconds || 60
      this.log('댓글 후 대기', `${waitSeconds}초`)
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
      return true
    } catch (error) {
      this.log('댓글 처리 중 오류', `${username}: ${error instanceof Error ? error.message : String(error)}`, false)
      return false
    }
  }

  private async closeModal(): Promise<void> {
    try {
      await this.page.waitForTimeout(500)
      const closeButton = this.page.getByLabel(/닫기|Close/).first()
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click()
        await this.page.waitForTimeout(500)
      }
    } catch {
      // ESC 키로 닫기 시도
      await this.page.keyboard.press('Escape')
    }
  }
}
