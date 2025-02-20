import Anthropic from '@anthropic-ai/sdk'
import { Page } from '@playwright/test'
import { AgentConfig } from '../../../index'
import { chooseRandomSleep, randomSleep, SLEEP_ENTRIES } from '../common/timeUtils'
import { InstagramPrompt } from './SystemPromptService'

export class ScanFeedService {
  private promptHandler: InstagramPrompt
  private anthropic: Anthropic

  constructor(
    private page: Page,
    private isLoggedIn: boolean,
    private config: AgentConfig
  ) {
    this.promptHandler = new InstagramPrompt(this.config.prompt)
    this.anthropic = new Anthropic({
      apiKey:
        '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'
    })
  }

  async execute(): Promise<void> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in')
    }

    try {
      await this.page.goto('https://www.instagram.com/')
      await this.interactWithPosts()
    } catch (error) {
      if ((error as Error).message === 'searchMenu not found') {
        await new Promise((resolve) => setTimeout(resolve, 2000000))
      }
      throw new Error(`Failed to scan feed: ${(error as Error).message}`)
    }
  }

  private async interactWithPosts() {
    if (!this.page) return

    let postIndex = 0 // Start with the first post
    const maxPosts = 10 // Limit to prevent infinite scrolling

    while (postIndex <= maxPosts) {
      postIndex += 1
      try {
        const postSelector =
          postIndex === 1 ? 'article' : `article[data-test-id="${postIndex - 1}"] ~ article`

        const postElement = await this.page
          .waitForSelector(postSelector, { timeout: 5000 })
          .catch(() => null)

        if (!postElement) {
          console.log('No more posts found. Exiting loop..., now loop: ', postIndex)
          break
        }

        await this.page.$eval(
          postSelector,
          (el, index) => {
            el.setAttribute('data-test-id', String(index))
          },
          postIndex
        )

        const isAdVisible = await this.page
          .getByText(/sponsored/i, { exact: true }) // 대소문자 구분 없이 매칭
          .or(this.page.getByText('광고', { exact: true }))
          .isVisible()
          .catch(() => false)

        if (isAdVisible) {
          console.log('Ad detected, continue...')
          continue
        }

        const likeButton = this.page
          .getByRole('button')
          .filter({
            has: this.page.locator(
              'svg[aria-label="Like"], svg[aria-label="좋아요"], svg[aria-label="Unlike"], svg[aria-label="좋아요 취소"]'
            )
          })
          .first()

        const isVisible = await likeButton.isVisible()
        if (!isVisible) {
          console.log(`Like button not found for post ${postIndex}.`)
          continue
        }

        const ariaLabel = await likeButton.getAttribute('aria-label')

        // 이미 좋아요가 눌러져 있다면 건너뛰기
        if (ariaLabel === 'Unlike' || ariaLabel === '좋아요 취소') {
          console.log(`Post ${postIndex} is already liked. Skipping...`)
          continue
        }

        // 좋아요 누르기
        console.log(`Liking post ${postIndex}...`)
        await likeButton.click()
        await this.page.keyboard.press('Enter')
        console.log(`Post ${postIndex} liked.`)

        // Extract and log the post caption
        const isMoreVisible = await this.page
          .getByText(/more/i, { exact: true })
          .or(this.page.getByText('더보기', { exact: true }))
          .isVisible()
          .catch(() => false)

        if (isMoreVisible) {
          await this.page
            .getByText(/more/i, { exact: true })
            .or(this.page.getByText('더보기', { exact: true }))
            .click()
            .catch(() => console.log('더보기 버튼 클릭 실패'))
        }

        const captionSelector = `${postSelector} span[dir="auto"]`
        const caption = await this.page.locator(captionSelector).textContent()

        if (caption) {
          console.log(`Caption for post ${postIndex}: `, Buffer.from(caption, 'utf-8').toString())
        } else {
          console.log(`No caption found for post ${postIndex}.`)
        }

        let mediaBase64String: string | null = null
        const mediaContentSelector = `${postSelector} > div`
        const mediaContent = await this.page.locator(mediaContentSelector).nth(postIndex - 1)

        if (await mediaContent.isVisible()) {
          const buffer = await mediaContent.screenshot({
            type: 'jpeg'
          })

          mediaBase64String = buffer.toString('base64')

          console.log(`Image capture completed for post ${postIndex}`)
        }

        const messages: Anthropic.Messages.MessageParam[] = [
          {
            role: 'user',
            content: `다음 인스타그램 게시물을 보고, 작성자가 이 글을 작성하며 달렸으면 했을 댓글을 작성하세요. 글자수는 ${this.config.commentLength.min}자에서 ${this.config.commentLength.max}자 사이여야 합니다. 글 내용: ${caption}`
          }
        ]
        if (mediaBase64String) {
          messages.push({
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: mediaBase64String
                }
              }
            ]
          })
        }

        // Comment on the post
        const commentBoxSelector = `${postSelector} textarea`

        try {
          const commentBox = await this.page.locator(commentBoxSelector).nth(postIndex - 1)

          if (await commentBox.isVisible()) {
            console.log(`Commenting on post ${postIndex}...`)

            // AI 응답 생성
            const aiRes = await this.anthropic.messages.create({
              model: 'claude-3-5-sonnet-latest',
              max_tokens: 1000,
              system: this.promptHandler.getSystemPrompt(),
              messages
            })

            let comment = aiRes.content.find((v) => v.type === 'text')?.text ?? ''
            // 시작과 끝의 따옴표 제거
            comment = comment.replace(/^"|"$/g, '')

            // 댓글 입력
            await commentBox.fill(comment)
            console.log('comment', comment)

            // Post 버튼 찾기
            const postButton = this.page
              .locator('div[role="button"]')
              .filter({
                hasText: 'Post',
                hasNot: this.page.locator('[disabled]')
              })
              .first()

            // 버튼이 있는지 확인하고 클릭
            if (await postButton.isVisible()) {
              console.log(`Posting comment on post ${postIndex}...`)
              await postButton.click()
              console.log(`Comment posted on post ${postIndex}.`)
            } else {
              console.log('Post button not found.')
            }
          } else {
            console.log('Comment box not found.')
          }

          // 대기
          await chooseRandomSleep(SLEEP_ENTRIES)
        } catch (error) {
          console.error(`Error while commenting on post ${postIndex}:`, error)
        }

        // 다음 게시물의 댓글창을 찾을 때까지 스크롤
        let foundNextComment = false
        const nextPostSelector = `article[data-test-id="${postIndex}"] ~ article textarea`

        while (!foundNextComment) {
          await this.page.evaluate('window.scrollBy(0, 100)')
          await randomSleep(2000, 0.5)

          const nextCommentBox = this.page.locator(nextPostSelector)

          // 요소가 뷰포트 내에 있고 보이는지 확인
          const isVisible = await nextCommentBox.isVisible()
          const inViewport = await nextCommentBox
            .evaluate((el) => {
              const rect = el.getBoundingClientRect()
              return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
              )
            })
            .catch(() => false)

          if (isVisible && inViewport) {
            foundNextComment = true
            console.log("Found next post's comment box in viewport.")
          } else {
            console.log('Post not visible in viewport yet')
          }
        }

        await chooseRandomSleep(SLEEP_ENTRIES)
        // Scroll to the next post
      } catch (error) {
        console.error(`Error interacting with post ${postIndex}:`, error)
        break
      }
    }
  }
}
