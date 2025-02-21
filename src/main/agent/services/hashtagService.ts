import { Page } from 'playwright'
import { chooseRandomSleep, majorActionDelays, scrollDelays, waitRandom } from '../common/timeUtils'
import { expect } from '@playwright/test'

export class HashtagService {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async searchHashtag(tag: string): Promise<void> {
    // 인스타그램 메인 페이지로 이동
    await this.page.goto('https://www.instagram.com')
    await waitRandom(500, 0.2)

    // 검색 메뉴 클릭
    const searchMenu = await this.page.locator('a', {
      has: this.page.locator('span', {
        hasText: /검색|search/i
      }),
      hasText: /검색|search/i
    })

    if (!searchMenu) throw Error("I can't find the search menu.")
    await searchMenu.click()
    await waitRandom(500, 0.2)

    // 검색어 입력
    const searchInput = await this.page.getByPlaceholder(/검색|search/i)
    if (!searchInput) throw Error("I can't find the search input.")
    await searchInput.type(`#${tag}`, { delay: 50 })
    await waitRandom(3000, 0.2)

    // 검색 결과 클릭
    const hashtagElement = await this.page.getByText(`#${tag}`, { exact: true })
    if (!hashtagElement) throw Error('Hashtag element not found')
    await hashtagElement.click()

    await chooseRandomSleep(majorActionDelays)

    // 게시물 목록 처리리
    await this.processPostsInGrid()
  }

  private async processPostsInGrid(maxPosts: number = 12): Promise<void> {
    let processedCount = 0
    const processedUrls = new Set<string>()

    const posts = await this.page.locator('a[role="link"][tabindex="0"]').all()

    while (processedCount < maxPosts) {
      // 현재 화면에 보이는 게시물 선택
      const posts = await this.page.locator('article a').all()

      for (const post of posts) {
        if (processedCount >= maxPosts) break

        try {
          // 게시물의 href 속성을 확인하여 중복 처리 방지
          const postUrl = await post.getAttribute('href')
          console.log('postUrl:', postUrl)
          // if (postUrl && processedUrls.has(postUrl)) continue
          // if (postUrl) processedUrls.add(postUrl)

          // // 게시물이 뷰포트에 보일 때까지 스크롤
          // await post.scrollIntoViewIfNeeded()
          // await chooseRandomSleep(scrollDelays)

          // // 게시물 클릭
          // await post.click()
          // await waitRandom(2000, 0.2)

          // // 좋아요 및 댓글 처리
          // // await this.processPost()

          // processedCount++

          // // 모달 닫기
          // const closeButton = await this.page.locator(
          //   'svg[aria-label="닫기" i], svg[aria-label="Close" i]'
          // )
          // await closeButton.click()
          // await waitRandom(1500, 0.2)
        } catch (error) {
          console.error('게시물 처리 중 오류 발생:', error)
          continue
        }
      }

      // 더 많은 게시물 로드를 위해 스크롤
      // await this.scrollForMorePosts()
      // await waitRandom(2000, 0.2)
    }
  }

  private async processPost(): Promise<void> {
    try {
      // 좋아요 버튼 클릭
      const likeButton = await this.page
        .locator('[aria-label="좋아요" i], [aria-label="Like" i]')
        .first()
      if (await likeButton.isVisible()) {
        await likeButton.click()
        await waitRandom(1000, 0.2)
      }

      // 댓글 입력
      const commentInput = await this.page.locator(
        'textarea[aria-label="댓글 달기..." i], textarea[aria-label="Add a comment..." i]'
      )
      if (await commentInput.isVisible()) {
        await commentInput.type('멋진 게시물이네요! 👍', { delay: 50 })
        await waitRandom(1000, 0.2)

        // 댓글 게시 버튼 클릭
        const postButton = await this.page.getByRole('button', { name: /게시|Post/i })
        await postButton.click()
        await waitRandom(1500, 0.2)
      }
    } catch (error) {
      console.error('게시물 상호작용 중 오류:', error)
    }
  }

  private async scrollForMorePosts(): Promise<void> {
    await this.page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 2)
    })
  }
}
