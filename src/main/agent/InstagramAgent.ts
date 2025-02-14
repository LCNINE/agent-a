import { Browser, ElementHandle, Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import { AgentConfig } from '../..'
import { waitRandom } from './common/timeUtils'
import { app } from 'electron'
import path from 'path'
import { startBrowser } from './common/browser'

export interface InstagramPost {
  id: string
  shortcode: string
  ownerUsername: string
  hasLiked: boolean
  hasCommented: boolean
  isAd: boolean
}

export class InstagramAgent {
  private browser: Browser | null = null
  private page: Page | null = null
  private isLoggedIn = false
  private processedShortcodes: Set<string> = new Set()
  private config: AgentConfig
  private anthropic: Anthropic

  constructor(config: AgentConfig) {
    this.config = config
    this.anthropic = new Anthropic({
      apiKey:
        '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'
    })
  }

  async initialize() {
    try {
      this.browser = await startBrowser(this.config.credentials)

      this.page = await this.browser.newPage()
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      // try {
      //   const cookiesString = await fs.readFile(path.join(this.userDataDir, 'cookies.json'), 'utf8');
      //   this.cookies = JSON.parse(cookiesString);
      //   if (this.cookies.length > 0) {
      //     await this.browser.setCookie(...this.cookies);
      //   }
      // } catch (error) {
      //   console.log('No saved cookies found');
      // }
    } catch (error) {
      throw new Error(`Failed to initialize browser: ${(error as Error).message}`)
    }
  }

  async login(username: string, password: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized')
    await new Promise((resolve) => setTimeout(resolve, 500))
    try {
      console.log('accessing login page')
      await this.page.goto('https://www.instagram.com/accounts/login/')
      console.log('attempt login')
      await new Promise((resolve) => setTimeout(resolve, 500))

      const loginForm = await this.page.$('form[id="loginForm"]')
      if (!loginForm) {
        this.isLoggedIn = true
        return
      }

      await this.page.waitForSelector('input[name="username"]')
      await this.page.waitForSelector('input[name="password"]')

      await this.page.type('input[name="username"]', username, { delay: 50 })
      await this.page.type('input[name="password"]', password, { delay: 50 })

      await this.page.click('button[type="submit"]')

      await this.page.waitForNavigation()

      this.isLoggedIn = true
    } catch (error) {
      throw new Error(`Login failed: ${(error as Error).message}`)
    }
  }

  async scanFeed(): Promise<void> {
    if (!this.page || !this.isLoggedIn) throw new Error('Not logged in')

    try {
      await this.page.goto('https://www.instagram.com/')
      await this.interactWithPosts()
    } catch (error) {
      if ((error as Error).message == 'searchMenu not found')
        await new Promise((resolve) => setTimeout(resolve, 2000000))
      throw new Error(`Failed to scan feed: ${(error as Error).message}`)
    }
  }

  async scanHashtag(tag: string): Promise<void> {
    if (!this.page || !this.isLoggedIn) throw new Error('Not logged in')

    try {
      await this.page.goto('https://www.instagram.com/')
      await this.interactWithHashtag(tag)
    } catch (error) {
      if ((error as Error).message == 'searchMenu not found')
        await new Promise((resolve) => setTimeout(resolve, 2000000))
      throw new Error(`Failed to scan feed: ${(error as Error).message}`)
    }
  }

  async interactWithHashtag(tag: string): Promise<void> {
    if (!this.page) return

    // 초기 인스타그램 페이지 로딩
    await this.page.goto('https://www.instagram.com')
    await new Promise((resolve) => setTimeout(resolve, 5000)) // 초기 페이지 로딩 대기

    const searchMenu = await this.page.$('.x1iyjqo2.xh8yej3 > div:nth-child(2)')
    if (!searchMenu) throw Error('searchMenu not found')

    await searchMenu.click()
    await new Promise((resolve) => setTimeout(resolve, 3000)) // 검색 메뉴 로딩 대기

    const searchInputSelector =
      '.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1d52u69.xktsk01.x1n2onr6.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1 input'

    if (!(await this.page.$(`${searchInputSelector}`)))
      await new Promise((resolve) => setTimeout(resolve, 2000000))

    await this.page.type(searchInputSelector, `#${tag}`, { delay: 50 })
    await new Promise((resolve) => setTimeout(resolve, 5000)) // 검색 결과 로딩 대기

    const firstSearchResultTitleSelector =
      '.x9f619.x78zum5.xdt5ytf.x1iyjqo2.x6ikm8r.x1odjw0f.xh8yej3.xocp1fn > a:nth-child(1) .x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft'
    const firstSearchResultTitle = await this.page.$(firstSearchResultTitleSelector)
    if (!firstSearchResultTitle) throw Error('firstSearchResultTitle not found')

    const firstSearchResultTitleText = await firstSearchResultTitle.evaluate((el) => {
      return el.textContent
    })
    if (!firstSearchResultTitleText) throw Error('firstSearchResultTitleText not found')
    if (`#${tag}` !== firstSearchResultTitleText) throw Error('proper tag not found')

    await firstSearchResultTitle.click()
    await new Promise((resolve) => setTimeout(resolve, 5000)) // 해시태그 페이지 로딩 대기

    const postSelector =
      'div.x1qjc9v5.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1lliihq.xdt5ytf.x2lah0s'
    const modalSelector = `div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1n2onr6.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.x1q0g3np.xqjyukv.x1qjc9v5.x1oa3qoh.xl56j7k`
    const sectionSelector = `section.x78zum5.x1q0g3np.xwib8y2.x1yrsyyn.x1xp8e9x.x13fuv20.x178xt8z.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xo1ph6p.x1pi30zi.x1swvt13`

    const post = await this.page.$(postSelector)
    if(!post){
      throw Error('post not found')
    }

    post.click()
    await new Promise((resolve) => setTimeout(resolve, 5000)) // 첫 번째 게시물 모달 로딩 대기

    let postIndex = 0 // 실제 작업 완료한 게시물 수
    const maxPosts = 10 // 목표 작업 수
    
    const nextButtonSelector = "div._aaqg._aaqh > button"
    
    while (postIndex < maxPosts) {
      const nextButton = await this.page.$(nextButtonSelector)
      if(!nextButton){
        throw Error('nextButton not found')
      }

      // 게시물 내용 로딩 대기
      await new Promise((resolve) => setTimeout(resolve, 3000))

      try {
        const replySelector = 'h3.x6s0dn4.x3nfvp2'
        await this.page.waitForSelector(replySelector, { timeout: 50000 })
        const replys = await this.page.$$(replySelector)

        let shouldSkipPost = false

        // 내 댓글이 있는지 확인
        for (const reply of replys) {
          const linkText = await reply.$eval('a', (el) => el.textContent)
          if (linkText === this.config.credentials.username) {
            shouldSkipPost = true
            break
          }
        }
        
        if (shouldSkipPost) {
          console.log('skip : reply alread exist')
          await nextButton.click()
          // 다음 게시물로 이동 전 대기
          await new Promise((resolve) => setTimeout(resolve, this.config.postIntervalSeconds * 1000))
          continue
        }
      } catch (error) {
        console.error('Error checking replies:', error)
      }

      const section = await this.page.$(sectionSelector)
      if (!section) throw Error('post modal button section not found')

      // 좋아요 처리
      const likeButtonSelector = `${sectionSelector} svg[aria-label]:is([aria-label="Like"], [aria-label="좋아요"])`
      const likeButton = await this.page.$(likeButtonSelector)
      const ariaLabel = await likeButton?.evaluate((el) => el.getAttribute('aria-label'))

      if (ariaLabel === 'Like' || ariaLabel === '좋아요') {
        await likeButton!.click()
        // 좋아요 후 2초 대기
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }

      // 게시물 내용 로딩 대기
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const liHandle = await this.page.$('li._a9zj._a9zl._a9z5')
      const h1Handle = await liHandle?.$('h1._ap3a._aaco._aacu._aacx._aad7._aade')
      if (!h1Handle) break

      const fullText = await h1Handle.evaluate((el) => el.textContent)

      const mediaContent = await this.page.$('div._aatk._aatl')
      const mediaBase64String = mediaContent
        ? await mediaContent.screenshot({ encoding: 'base64', type: 'jpeg' })
        : null

      const messages: Anthropic.Messages.MessageParam[] = [
        {
          role: 'user',
          content: `다음 인스타그램 게시물을 보고, 작성자가 이 글을 작성하며 달렸으면 했을 댓글을 작성하세요. 글자수는 ${this.config.commentLength.min}자에서 ${this.config.commentLength.max}자 사이여야 합니다. 글 내용: ${fullText}`
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

      // 댓글창 로딩 대기
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const commentBox = await this.page.$(`${modalSelector} textarea`)
      if (!commentBox) {
        console.log("can't type comment")
      } else {
        const aiRes = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 1000,
          system: this.getSystemPrompt(),
          messages
        })

        const comment = aiRes.content.find((v) => v.type === 'text')?.text ?? ''
        await this.page.type(`${modalSelector} textarea`, comment, {
          delay: 200
        })

        const postButton = await this.page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('div[role="button"]'))
          return buttons.find(
            (button) => button.textContent === 'Post' && !button.hasAttribute('disabled')
          )
        })

        if (postButton) {
          await (postButton as any).click()
          console.log('댓글 작성 완료')
          postIndex++ // 댓글 작성 성공시에만 카운트 증가
        }
      }

      // 다음 게시물로 이동 전 대기
      await new Promise((resolve) => setTimeout(resolve, this.config.postIntervalSeconds * 1000))
      
      await nextButton?.click()
    }
    console.log(`작업 완료: 총 ${postIndex}개의 게시물에 댓글을 작성했습니다.`)
  }

  async interactWithPosts() {
    if (!this.page) return

    let postIndex = 0 // Start with the first post
    const maxPosts = 10 // Limit to prevent infinite scrolling

    while (postIndex <= maxPosts) {
      postIndex += 1
      try {
        const postSelector =
          postIndex === 1 ? 'article' : `article[data-test-id="${postIndex - 1}"] ~ article`

        // Check if the post exists
        const postElement = await this.page.$(postSelector)
        if (!postElement) {
          console.log('No more posts found. Exiting loop..., now loop: ', postIndex)
          break
        }
        console.log('postIndex', postIndex)
        await postElement.evaluate((el, index) => {
          el.setAttribute('data-test-id', `${index}`)
        }, postIndex)

        // const adFlagSelector = `${postSelector} .x1fhwpqd.x132q4wb.x5n08af`;
        // const adFlag = await this.page.$(adFlagSelector);
        // if (adFlag) {
        //   console.log("Ad detected, continue...");
        //   continue;
        // }

        const adSpanSelector = `${postSelector} div > span > div > span.x1fhwpqd.x132q4wb.x5n08af`
        const adSpan = await this.page.$(adSpanSelector)
        if (adSpan) {
          const adText = await this.page.evaluate((el) => el.textContent, adSpan)
          if (adText === '광고' || adText === 'Sponsored') {
            console.log('Ad detected, continue...')
            continue
          }
        }

        const likeButtonSelector = `${postSelector} svg[aria-label]:is([aria-label="Like"], [aria-label="좋아요"])`
        const likeButton = await this.page.$(likeButtonSelector)
        const ariaLabel = await likeButton?.evaluate((el: Element) => el.getAttribute('aria-label'))

        if (ariaLabel === 'Like' || ariaLabel === '좋아요') {
          console.log(`Liking post ${postIndex}...`)
          await likeButton!.click()
          await this.page.keyboard.press('Enter')
          console.log(`Post ${postIndex} liked.`)
        } else if (ariaLabel === 'Unlike' || ariaLabel === '좋아요 취소') {
          console.log(`Post ${postIndex} is already liked.`)
        } else {
          console.log(`Like button not found for post ${postIndex}.`)
        }

        // Extract and log the post caption
        const captionSelector = `${postSelector} div.x9f619 span._ap3a div span._ap3a`
        const captionElement = await this.page.$(captionSelector)

        let caption = ''
        if (captionElement) {
          caption = await captionElement.evaluate((el: any) => el.textContent)
          console.log(`Caption for post ${postIndex}: `, Buffer.from(caption, 'utf-8').toString())
        } else {
          console.log(`No caption found for post ${postIndex}.`)
        }

        // // Check if there is a '...more' link to expand the caption
        const moreLinkSelector = `${postSelector} div.x9f619 span._ap3a span div span.x1lliihq`
        const moreLink = await this.page.$(moreLinkSelector)
        if (moreLink) {
          console.log(`Expanding caption for post ${postIndex}...`)
          await moreLink.click() // Click the '...more' link to expand the caption
          const expandedCaption = await captionElement!.evaluate((el: any) => el.textContent)
          caption = expandedCaption // Update caption with expanded content
        }

        let mediaBase64String: string | null = null
        const mediaContentSelector = `${postSelector} > div`
        const mediaContent = await this.page.$(mediaContentSelector)
        if (mediaContent) {
          mediaBase64String = await mediaContent.screenshot({
            encoding: 'base64',
            type: 'jpeg'
          })
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

        // // Comment on the post
        const commentBoxSelector = `${postSelector} textarea`
        const commentBox = await this.page.$(commentBoxSelector)
        if (commentBox) {
          console.log(`Commenting on post ${postIndex}...`)
          const aiRes = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-latest',
            max_tokens: 1000,
            system: this.getSystemPrompt(),
            messages
          })

          const comment = aiRes.content.find((v) => v.type === 'text')?.text ?? ''

          await this.page.type(commentBoxSelector, comment, { delay: 50 })
          console.log('comment', comment)

          // New selector approach for the post button
          const postButton = await this.page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('div[role="button"]'))
            return buttons.find(
              (button) => button.textContent === 'Post' && !button.hasAttribute('disabled')
            )
          })

          if (postButton) {
            console.log(`Posting comment on post ${postIndex}...`)
            await (postButton as any).click()
            console.log(`Comment posted on post ${postIndex}.`)
          } else {
            console.log('Post button not found.')
          }
        } else {
          console.log('Comment box not found.')
          continue
        }

        await new Promise((resolve) => setTimeout(resolve, this.config.postIntervalSeconds * 1000))

        // 다음 게시물의 댓글창을 찾을 때까지 스크롤
        let foundNextComment = false

        while (!foundNextComment) {
          await this.page.evaluate(() => {
            window.scrollBy(0, 100)
          })
          await waitRandom(2000, 0.5)

          // 다음 게시물의 댓글창 확인 및 가시성 체크
          const isVisible = await this.page.evaluate(() => {
            const nextPost = document.querySelector('article[data-test-id="1"] ~ article textarea')
            if (!nextPost) return false

            const rect = nextPost.getBoundingClientRect()
            return (
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
              rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            )
          })

          if (isVisible) {
            foundNextComment = true
            console.log("Found next post's comment box in viewport.")
          } else {
            console.log('post not visible in viewport yet')
          }
        }

        await waitRandom(2000, 0)
        // Scroll to the next post
      } catch (error) {
        console.error(`Error interacting with post ${postIndex}:`, error)
        break
      }
    }
  }

  private getSystemPrompt(): string {
    if (!this.config) throw new Error('Config not set')

    const promptConfig = this.config.prompt
    let systemPrompt = ''

    // Set system prompt based on preset
    if ('preset' in promptConfig) {
      switch (promptConfig.preset) {
        case 'formal':
          systemPrompt =
            '당신은 공손하고 격식있는 댓글을 작성하는 프로페셔널한 인스타그램 사용자입니다.'
          break
        case 'casual':
          systemPrompt = '당신은 친근하고 편안한 댓글을 작성하는 인스타그램 사용자입니다.'
          break
        case 'hyper':
          systemPrompt = '당신은 열정적이고 에너지 넘치는 댓글을 작성하는 인스타그램 사용자입니다.'
          break
        case 'custom':
          systemPrompt = promptConfig.custom
          break
      }
    }
    systemPrompt += ' 일반적인 20대 한국인 인스타그램 사용자의 말투를 사용합니다.'

    return systemPrompt
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
    this.isLoggedIn = false
  }
}
