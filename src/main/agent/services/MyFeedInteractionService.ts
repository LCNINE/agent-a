import { createHash } from 'crypto'
import { Locator, Page } from 'playwright'
import { AgentConfig, Work } from '../../..'
import { wait } from '../common/timeUtils'
import { smoothScrollToElement } from '../common/browserUtils'
type NotificationProcessor = (
  notification: Locator,
  notificationId: string,
  notificationInfo: {
    author: string
    content: string
    postUrl: string
  }
) => Promise<boolean>

interface NotificationOptions {
  maxNotifications: number
  processingDelay: {
    min: number
    max: number
  }
}

const DEFAULT_OPTIONS: NotificationOptions = {
  maxNotifications: Infinity,
  processingDelay: {
    min: 500,
    max: 1000
  }
}

const COMMENTS_LIST_WRAPPER =
  '.x9f619.x78zum5.xdt5ytf.x5yr21d.xexx8yu.x1pi30zi.x1l90r2v.x1swvt13.x10l6tqk.xh8yej3'
const COMMENTS_LIST = '.x78zum5.xdt5ytf.x1iyjqo2'
const COMMENT_CLASS_NAME =
  '.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.xsag5q8.xz9dl7a.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.x1q0g3np.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1'
const COMMENT_CONTAINER =
  '.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1'

export class MyFeedInteractionService {
  private page: Page
  private notificationProcessor: NotificationProcessor
  private options: NotificationOptions
  private config: AgentConfig
  private processedNotifications: Set<string> = new Set()
  private shouldStop: boolean = false
  private processed: boolean = false
  private currentWorkIndex: number
  private work: Work
  private notificationId: string | null = null

  constructor(
    page: Page,
    notificationProcessor: NotificationProcessor,
    options: Partial<NotificationOptions>,
    config: AgentConfig,
    currentWorkIndex: number,
    work: Work
  ) {
    this.page = page
    this.notificationProcessor = notificationProcessor
    this.config = config
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
    this.currentWorkIndex = currentWorkIndex
    this.work = work

    if (!this.work) {
      console.error('Work가 정의되지 않았습니다. 알림 작업을 진행할 수 없습니다.')
    }

    if (config.workCount && config.workCount > 0) {
      this.options.maxNotifications = config.workCount
      console.log(`NotificationInteractionService 최대 ${config.workCount}개의 작업을 처리합니다`)
    }
  }

  async processNotifications(): Promise<void> {
    this.shouldStop = false
    this.processed = false
    this.processedNotifications.clear()

    try {
      await this.openNotificationPanel()
      await this.page.waitForTimeout(2000)

      // 알림 컨테이너 찾기
      const notiContainer = await this.page.locator(
        '.xvbhtw8.xopu45v.xu3j5b3.xm81vs4.x168nmei.xoqspk4.x12v9rci.xo71vjh.xzmilaz.x9f619.x78zum5.xdt5ytf.x1dr59a3.x1odjw0f.xish69e.x1y1aw1k.x4uap5.xwib8y2.xkhd6sd.x1zvrr1 .x5yr21d.xh8yej3'
      )

      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })

      await this.page.waitForTimeout(1000)

      const notiLocs = await notiContainer
        .locator(
          '.x6s0dn4.x1q4h3jn.x78zum5.x1y1aw1k.xxbr6pl.xwib8y2.xbbxn1n.x87ps6o.x1wq6e7o.x1di1pr7.x1h4gsww.xux34ky.x1ypdohk.x1l895ks'
        )
        .all()

      console.log(`총 ${notiLocs.length}개의 알림을 찾았습니다.`)

      for (let i = 0; i < notiLocs.length; i++) {
        const text = await notiLocs[i].textContent()

        if (text?.includes('님이 댓글을 남겼습니다:')) {
          console.log('댓글 알림 발견')
          // 최대 처리 수에 도달했는지 확인
          if (this.processedNotifications.size >= this.options.maxNotifications) {
            console.log(
              `최대 작업 수(${this.options.maxNotifications})에 도달했습니다. 작업을 종료합니다.`
            )
            this.shouldStop = true
            break
          }

          const notificationElementHandle = await notiLocs[i].elementHandle()

          if (!notificationElementHandle) {
            console.log('[processNotifications] 알림 요소를 가져올 수 없습니다.')
            continue
          }

          // 댓글 알림 정보 추출
          const notificationInfo = await this.extractNotificationInfo(notiLocs[i], text)

          // 댓글 알림 ID 생성
          this.notificationId = await this.createNotificationId(notificationInfo, notiLocs[i])
          console.log('this.notificationId:', this.notificationId)
          // 이미 처리된 댓글 알림이면 건너뛰기
          if (this.processedNotifications.has(this.notificationId)) {
            console.log(
              `이미 처리된 알림 (${notificationInfo.author}: ${notificationInfo.content.substring(0, 20)}...) 건너뛰기`
            )
            continue
          }

          // 알림 클릭하여 해당 게시물로 이동
          await notificationElementHandle.click()
          console.log('해당 댓글로 이동')

          // 페이지 로딩 대기
          await this.page.waitForTimeout(3000)

          // 댓글 찾기 (작성자 이름으로 검색)
          const commentLoc = await this.findCommentByAuthor(
            notificationInfo.author,
            notificationInfo.content
          )

          if (!commentLoc) {
            console.log('해당 댓글을 찾을 수 없습니다. 다음 알림으로 넘어갑니다.')
            continue
          }

          try {
            // 찾은 댓글에 좋아요 및 대댓글 작성
            this.processed = await this.notificationProcessor(
              commentLoc,
              this.notificationId,
              notificationInfo
            )
          } catch (error) {
            console.error(
              `해당 댓글 좋아요 및 대댓글 작성 실패: ${error instanceof Error ? error.message : String(error)}`
            )
            continue
          }

          if (this.shouldStop) {
            break
          }
        }
      }
    } catch (error) {
      console.error('알림 처리 중 오류 발생:', error)
    } finally {
      // 성공적으로 처리한 경우에만 카운트
      if (this.processed) {
        this.processedNotifications.add(this.notificationId as string)
      }

      await this.openNotificationPanel()
      await this.page.waitForTimeout(2000)

      await wait(this.config.postIntervalSeconds * 1000)
    }

    console.log('알림 작업 종료:', this.processedNotifications.size, this.options.maxNotifications)
    console.log(`처리된 알림: ${this.processedNotifications.size}개`)
  }

  private async navigateToHome(): Promise<void> {
    try {
      await this.page
        .locator(
          '.x9f619.x3nfvp2.xr9ek0c.xjpr12u.xo237n4.x6pnmvc.x7nr27j.x12dmmrz.xz9dl7a.xn6708d.xsag5q8.x1ye3gou.x80pfx3.x159b3zp.x1dn74xm.xif99yt.x172qv1o.x10djquj.x1lhsz42.xzauu7c.xdoji71.x1dejxi8.x9k3k5o.xs3sg5q.x11hdxyr.x12ldp4w.x1wj20lx.x1lq5wgf.xgqcy7u.x30kzoy.x9jhf4c'
        )
        .first()
        .click()
        .catch(() => {
          console.log('Home 버튼을 찾을 수 없습니다. 직접 URL로 이동합니다.')
        })

      await this.page.waitForTimeout(2500)
    } catch (error) {
      console.log('홈 화면 이동 중 오류:', error)
    }
  }

  private async openNotificationPanel(): Promise<void> {
    try {

       여기 다시 살펴볼것!
      await this.page
        .locator('span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft')
        .getByText(/Notifications|알림/)
        .click()
    } catch (error) {
      console.error('알림 패널 열기 실패:', error)
      throw error
    }
  }

  private async extractNotificationInfo(
    notification: Locator,
    text: string
  ): Promise<{
    author: string
    content: string
    postUrl: string
  }> {
    // 작성자 추출
    const authorMatch = text.match(/([^\s]+)님이 댓글을 남겼습니다:/)
    const author = authorMatch ? authorMatch[1] : ''

    // 댓글 내용 추출
    const contentMatch = text.match(/남겼습니다:(.*)/)
    const content = contentMatch ? contentMatch[1].trim() : ''

    // 게시물 URL 추출
    const href = (await notification.locator('a').first().getAttribute('href')) || ''

    return {
      author,
      content,
      postUrl: href
    }
  }

  private async createNotificationId(
    info: { author: string; content: string; postUrl: string },
    notiLoc: Locator
  ): Promise<string> {
    // postUrl에서 게시물 ID 추출
    const postIdMatch = info.postUrl.match(/\/p\/([^\/]+)/)
    const postId = postIdMatch ? postIdMatch[1] : ''

    const combinedStr = `${info.author}|${info.content.substring(0, 30)}|${postId}`

    const hashedId = createHash('md5').update(combinedStr).digest('hex')

    await notiLoc.evaluate(
      async (element, { idAttribute, newId }) => {
        element.setAttribute(idAttribute, newId)
      },
      { idAttribute: 'data-comment-id', newId: hashedId }
    )

    return hashedId
  }

  private async findCommentByAuthor(author: string, content: string): Promise<Locator | null> {
    try {
      console.log(`${author}님의 댓글 찾는 중...`)

      const commentContainers = await this.page
        .locator(
          `${COMMENTS_LIST_WRAPPER} > ${COMMENTS_LIST} ${COMMENT_CLASS_NAME}:not(${COMMENT_CONTAINER} ul ${COMMENT_CLASS_NAME})`
        )
        .all()

      for (const commentLoc of commentContainers) {
        const commentLocElementHandle = await this.page
          .locator('div.x5yr21d.xw2csxc.x1odjw0f.x1n2onr6')
          .elementHandle()

        if (commentLocElementHandle) {
          await smoothScrollToElement(this.page, commentLocElementHandle)
        }

        // 각 댓글의 작성자 확인
        const commentAuthor = await commentLoc
          .locator('span._ap3a._aaco._aacw._aacx._aad7._aade')
          .first()
          .textContent()

        const commentContents = await commentLoc
          .locator(
            'span.x1lliihq.x1plvlek.xryxfnj.x1n2onr6.x1ji0vk5.x18bv5gf.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.xo1l8bm.x5n08af.x10wh9bi.x1wdrske.x8viiok.x18hxmgj'
          )
          .nth(1)
          .textContent()
          .catch((error) => {
            throw error('댓글 내용 가져오기 실패:', error)
          })

        if (commentAuthor?.includes(author)) {
          console.log(`${author}님의 댓글 찾음`)

          // data-comment-id 속성 설정
          await commentLoc.evaluate(
            (element, id) => {
              element.setAttribute('data-comment-id', id)
            },
            createHash('md5').update(`${author}|${content}`).digest('hex')
          )

          return commentLoc
        }
      }

      console.log(`${author}님의 댓글을 찾을 수 없습니다.`)
      return null
    } catch (error) {
      console.error('댓글 찾기 오류:', error)
      return null
    }
  }
}
