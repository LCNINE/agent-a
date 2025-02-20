// src/main/agent/services/interactWithHashtagService/searchInput.ts

import { Page } from 'playwright'
import { waitRandom } from '../../common/timeUtils'

export class SearchInputService {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async searchHashtag(tag: string): Promise<void> {
    // 인스타그램 메인 페이지로 이동
    await this.page.goto('https://www.instagram.com')
    await waitRandom(500, 0.2)
    await this.page.goto('https://www.instagram.com')

    // 검색 메뉴 클릭
    const searchMenu = await this.page.locator('.x1iyjqo2.xh8yej3 > div:nth-child(2)').first()
    if (!searchMenu) throw Error('검색 메뉴를 찾을 수 없습니다')
    await searchMenu.click()
    await waitRandom(500, 0.2)

    // 검색어 입력
    const searchInputSelector = '.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1d52u69.xktsk01.x1n2onr6.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1 input'
    const searchInput = await this.page.locator(searchInputSelector).first()
    if (!searchInput) throw Error('검색 입력창을 찾을 수 없습니다')
    await searchInput.type(`#${tag}`, { delay: 50 })
    await waitRandom(3000, 0.2)

    // 첫 번째 검색 결과 클릭
    const firstSearchResultSelector = '.x9f619.x78zum5.xdt5ytf.x1iyjqo2.x6ikm8r.x1odjw0f.xh8yej3.xocp1fn > a:nth-child(1) .x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft'
    const firstSearchResult = await this.page.locator(firstSearchResultSelector).first()
    if (!firstSearchResult) throw Error('검색 결과를 찾을 수 없습니다')

    const resultText = await firstSearchResult.textContent()
    if (!resultText) throw Error('검색 결과 텍스트를 찾을 수 없습니다')
    if (`#${tag}` !== resultText) throw Error('올바른 해시태그를 찾을 수 없습니다')

    await firstSearchResult.click()
    await waitRandom(3000, 0.1)
  }
}
