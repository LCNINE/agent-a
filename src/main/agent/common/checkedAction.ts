import { Locator, Page } from 'playwright-core'
import { chooseRandomSleep, postInteractionDelays } from './timeUtils'

export async function checkedAction(
  locator: Locator,
  page: Page,
  actionName: string,
  action?: (locator: Locator) => Promise<void>
): Promise<boolean> {
  try {
    // 요소가 페이지에 존재하는지 확인 (DOM에 있는지)
    const exists = (await locator.count()) > 0

    if (!exists) {
      console.log(`[${actionName}] 요소가 존재하지 않습니다.`)
      return false
    }

    const isVisible = await locator.isVisible()

    if (!isVisible) {
      console.log(`[${actionName}] 요소가 보이지 않습니다. 이미 처리되었을 수 있습니다.`)
      await chooseRandomSleep(postInteractionDelays)

      return false
    }

    if (action) {
      await action(locator)
    } else {
      await locator.click()
    }

    await page.waitForTimeout(1000)
    return true
  } catch (error) {
    console.error(`[${actionName}] 액션 수행 중 오류 발생:`, error)
    return false
  }
}
