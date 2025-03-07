import { Locator, Page } from 'playwright'
import { AgentConfig, Feed, FeedWork } from '../../..'
import { smoothScrollToElement } from '../common/browserUtils'
import { chooseRandomSleep, scrollDelays, wait } from '../common/timeUtils'
import { createHash } from 'crypto'

type BasicModeProcessor = (
  article: Locator,
  articleId: string,
  commentAuthor: string | null,
  comment: string | null
) => Promise<boolean>

interface ScrollOptions {
  maxFeeds: number
  scrollDelay: number
  scrollDistance: number
  processingDelay: {
    min: number
    max: number
  }
}

const DEFAULT_OPTIONS: ScrollOptions = {
  maxFeeds: Infinity,
  scrollDelay: 100,
  scrollDistance: 100,
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

export class FeedWorkBasicModeService {
  private page: Page
  private basicModeProcessor: BasicModeProcessor
  private options: ScrollOptions
  private config: AgentConfig
  private processedFeeds: Set<string> = new Set()
  private shouldStop: boolean = false
  private processed: boolean = false
  private currentWorkIndex: number
  private work: FeedWork

  constructor(
    page: Page,
    basicModeProcessor: BasicModeProcessor,
    options: Partial<ScrollOptions>,
    config: AgentConfig,
    currentWorkIndex: number,
    work: FeedWork
  ) {
    this.page = page
    this.basicModeProcessor = basicModeProcessor
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
    this.config = config
    this.currentWorkIndex = currentWorkIndex
    this.work = work

    if (!this.work) {
      console.error('Work가 정의되지 않았습니다. 피드 작업을 진행할 수 없습니다.')
    }

    if (config.workCount && config.workCount > 0) {
      this.options.maxFeeds = config.workCount
      console.log(`FeedWorkBasicModeService 최대 ${config.workCount}개의 작업을 처리합니다`)
    }
  }

  async processFeeds(feeds: Feed[]): Promise<void> {
    if (feeds.length === 0) {
      console.log('활성화된 피드가 없습니다.')
      return
    }

    this.shouldStop = false
    this.processed = false
    this.processedFeeds.clear()

    while (true) {
      await this.goToMyFeeds(feeds)
      await this.page.waitForTimeout(2000)

      const commentContainers = await this.page
        .locator(
          `${COMMENTS_LIST_WRAPPER} > ${COMMENTS_LIST} ${COMMENT_CLASS_NAME}:not(${COMMENT_CONTAINER} ul ${COMMENT_CLASS_NAME})`
        )
        .all()

      // Fucking Instagram
      for (const commentLoc of commentContainers) {
        // commentLoc를 한단계 위로가서 빈div태그의 형제 div를 가져오려면?
        const siblingDiv = commentLoc.locator('xpath=..').locator('div:empty + div').first()
        console.log('siblingDiv:', await siblingDiv.textContent())
        console.log('siblingDiv:', siblingDiv)

        // 최대 처리 수에 도달했는지 확인
        if (this.processedFeeds.size >= this.options.maxFeeds) {
          console.log(`최대 작업업 수(${this.options.maxFeeds})에 도달했습니다. 작업을 종료합니다.`)
          this.shouldStop = true
          break
        }

        const feedElementHandle = await commentLoc.elementHandle()
        if (feedElementHandle == null) {
          console.log('[processMyFeed] feedElementHandle is null')
          continue
        }

        // 댓글 작성자 가져오기
        const commentAuthor = await commentLoc
          .locator(
            'div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1uhb9sk.x1plvlek.xryxfnj.x1iyjqo2.x2lwn1j.xeuugli.x1q0g3np.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1 span.xjp7ctv span._ap3a._aaco._aacw._aacx._aad7._aade'
          )
          .first()
          .textContent()
          .catch(() => '')

        // 댓글 내용 가져오기
        const comment = await commentLoc
          .locator(
            'div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1cy8zhl.x1oa3qoh.x1nhvcw1 span.x1lliihq.x1plvlek.xryxfnj.x1n2onr6.x1ji0vk5.x18bv5gf.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.xo1l8bm.x5n08af.x10wh9bi.x1wdrske.x8viiok.x18hxmgj'
          )
          .first()
          .textContent()
          .catch(() => '')

        // 댓글 작성자와 내용으로 고유 ID 생성
        const commentId = await this.createCommentId(commentLoc, commentAuthor || '', comment || '')

        if (this.processedFeeds.has(commentId)) continue

        await smoothScrollToElement(this.page, feedElementHandle)
        await chooseRandomSleep(scrollDelays)
        const delay =
          Math.random() * (this.options.processingDelay.max - this.options.processingDelay.min) +
          this.options.processingDelay.min
        await this.page.waitForTimeout(delay)

        try {
          this.processed = await this.basicModeProcessor(
            commentLoc,
            commentId,
            commentAuthor,
            comment
          )
        } catch (error) {
          console.error(
            `Feed processing failed: ${error instanceof Error ? error.message : String(error)}`
          )
          continue
        } finally {
          // 실제로 처리에 성공한 경우에만 카운트에 추가
          if (this.processed) {
            this.processedFeeds.add(commentId)
          }
          await wait(this.config.postIntervalSeconds * 1000)
        }
      }

      if (this.shouldStop) {
        break
      }

      await this.page.waitForTimeout(1000)
    }

    console.log('작업종료:', this.processedFeeds.size, this.options.maxFeeds)
    console.log(`처리된 게시물: ${this.processedFeeds.size}개`)
  }

  async goToMyFeeds(feeds: Feed[]) {
    await this.page.goto(feeds[this.currentWorkIndex].url)
  }

  async createCommentId(commentLoc: Locator, author: string, content: string): Promise<string> {
    // 작성자와 내용이 모두 있을 경우 MD5 해시로 ID 생성
    if (author && content) {
      const sanitizedAuthor = author.trim()
      const sanitizedContent = content.trim().substring(0, 30) // 내용은 최대 30자로 제한
      const combinedStr = `${sanitizedAuthor}${sanitizedContent}`
      const hashedId = createHash('md5').update(combinedStr).digest('hex')

      await commentLoc.evaluate(
        async (element, { idAttribute, newId }) => {
          element.setAttribute(idAttribute, newId)
        },
        { idAttribute: 'data-comment-id', newId: hashedId }
      )

      console.log(`ID 할당 (해시): ${hashedId} (원본: ${sanitizedAuthor}-${sanitizedContent})`)
      return hashedId
    }

    // 작성자나 내용이 없을 경우 기존 방식으로 fallback
    const existingId = await commentLoc.getAttribute('data-comment-id')
    if (existingId) return existingId

    const newId = `article-${this.processedFeeds.size}`
    await commentLoc.evaluate(
      async (element, { idAttribute, newId }) => {
        element.setAttribute(idAttribute, newId)
      },
      { idAttribute: 'data-comment-id', newId }
    )
    console.log(`${newId}번 할당함`)
    return newId
  }
}
