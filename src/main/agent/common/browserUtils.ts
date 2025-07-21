import { Page, ElementHandle, BrowserContext, Locator } from 'playwright'
import { LoginCredentials } from '../../..'

/**
 * 페이지 또는 특정 컨테이너 내에서 요소로 부드럽게 스크롤합니다.
 * @param pageOrLocator 스크롤할 페이지 또는 컨테이너 요소의 Locator
 * @param element 스크롤 대상 요소
 */
export async function smoothScrollToElement(
  pageOrLocator: Page | Locator,
  element: ElementHandle
): Promise<void> {
  const page = 'viewportSize' in pageOrLocator ? pageOrLocator : pageOrLocator.page()
  const viewportSize = page.viewportSize()
  if (!viewportSize) return

  // Locator인 경우 해당 요소 내에서 스크롤, 아니면 window에서 스크롤
  const isLocator = !('viewportSize' in pageOrLocator)

  if (isLocator) {
    const containerHandle = await (pageOrLocator as Locator).elementHandle()
    if (!containerHandle) return

    const scrollInfo = await page.evaluate(
      ([container, target]) => {
        const containerEl = container as HTMLElement
        const targetEl = target as HTMLElement

        const containerRect = containerEl.getBoundingClientRect()
        const targetRect = targetEl.getBoundingClientRect()

        return {
          containerScrollTop: containerEl.scrollTop,
          targetTop: targetRect.top - containerRect.top + containerEl.scrollTop,
          containerHeight: containerEl.clientHeight
        }
      },
      [containerHandle, element]
    )

    await page.evaluate(
      ([container, info]) => {
        return new Promise<void>((resolve) => {
          const containerEl = container as HTMLElement
          const scrollInfo = info as {
            targetTop: number
            containerHeight: number
            containerScrollTop: number
          }
          const { targetTop, containerHeight, containerScrollTop } = scrollInfo

          // 타겟 위치 계산 (컨테이너 높이의 20% 정도 위쪽에 위치하도록)
          const targetY = Math.max(0, targetTop - containerHeight * 0.2)
          const startY = containerScrollTop
          const distance = targetY - startY

          if (Math.abs(distance) < 10) {
            resolve()
            return
          }

          // 부드러운 스크롤을 위한 설정
          const duration = 800 // 스크롤 지속 시간 (ms)
          const steps = 40 // 스크롤 단계 수
          const stepDuration = duration / steps
          let currentStep = 0

          const tick = () => {
            currentStep++

            if (currentStep >= steps) {
              // 애니메이션 완료
              containerEl.scrollTo(0, targetY)
              resolve()
              return
            }

            const progress = currentStep / steps
            const easing =
              progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2

            containerEl.scrollTo(0, startY + distance * easing)
            setTimeout(tick, stepDuration)
          }

          tick()
        })
      },
      [containerHandle, scrollInfo]
    )

    await containerHandle.dispose()
  } else {
    // 기존 window 스크롤 로직
    const elementPosition = await element.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect()
      return {
        top: rect.top,
        absoluteTop: rect.top + window.scrollY,
        height: rect.height
      }
    })

    // 전체 페이지에서 부드럽게 스크롤
    await page.evaluate(
      ({ absoluteTop, viewportHeight }) => {
        return new Promise<void>((resolve) => {
          // 타겟 위치 계산 (뷰포트 높이의 20% 정도 위쪽에 위치하도록)
          const targetY = Math.max(0, absoluteTop - viewportHeight * 0.2 * Math.random())
          const startY = window.scrollY
          const distance = targetY - startY

          if (Math.abs(distance) < 10) {
            resolve()
            return
          }

          // 부드러운 스크롤을 위한 설정
          const duration = 800
          const steps = 40
          const stepDuration = duration / steps
          let currentStep = 0

          // 스크롤 애니메이션 함수
          const tick = () => {
            currentStep++

            if (currentStep >= steps) {
              window.scrollTo(0, targetY)
              resolve()
              return
            }

            // 이징(easing) 함수를 사용하여 부드러운 스크롤 효과 적용
            const progress = currentStep / steps
            const easing =
              progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2

            window.scrollTo(0, startY + distance * easing)
            setTimeout(tick, stepDuration)
          }

          tick()
        })
      },
      {
        absoluteTop: elementPosition.absoluteTop,
        viewportHeight: viewportSize.height
      }
    )
  }

  await page.waitForTimeout(100)
}

// export async function isLoggedIn(browser: BrowserContext, credentials: LoginCredentials) {
//   const page = await browser.newPage()
//   await page.goto('https://www.instagram.com/accounts/login/')

//   try {
//     await page.waitForURL('https://www.instagram.com/', { timeout: 3000 })
//     return true
//   } catch {
//     try {
//       loginWithCredentials(page, credentials)
//       return true
//     } catch {
//       return false
//     }
//   } finally {
//     page.close()
//   }
// }

export async function loginWithCredentials(page: Page, credentials: LoginCredentials) {
  const { username, password } = credentials
  try {
    console.log('로그인 페이지 접속 중...')
    await page.goto('https://www.instagram.com/accounts/login/')
    await page.waitForTimeout(2000) // 페이지 로딩 대기

    const loginForm = page.locator('form[id="loginForm"]')
    if (!(await loginForm.isVisible())) {
      console.log('이미 로그인되어 있습니다')
      return true
    }

    const usernameInput = page.getByLabel(
      /전화번호, 사용자 이름 또는 이메일|phone number, username, or email/i
    )
    await usernameInput.click()
    await usernameInput.pressSequentially(username, { delay: 50 })

    await page.waitForTimeout(1000)

    const passwordInput = page.getByLabel(/비밀번호|password/i)
    await passwordInput.click()
    await passwordInput.pressSequentially(password, { delay: 50 })

    await page.waitForTimeout(1000)

    await page
      .getByRole('button', { name: /로그인|log in/i })
      .first()
      .click()

    await page.waitForURL('https://instagram.com', { timeout: 300000 })

    return true
  } catch (error) {
    throw new Error(`로그인 실패: ${(error as Error).message}`)
  }
}

/**
 * 홈 버튼을 찾아 클릭합니다.
 * @param page Playwright Page 객체
 */
export async function navigateToHome(page: Page): Promise<void> {
  try {
    await page.reload({ waitUntil: 'domcontentloaded' })

    console.log('홈 버튼 찾는중...')
    await page.waitForSelector('a:has(span:text-matches("홈|home", "i"))', {
      timeout: 5000
    })

    const homeMenu = page.locator('a', {
      has: page.locator('span', {
        hasText: /홈|home/i
      }),
      hasText: /홈|home/i
    })

    await homeMenu.click()
    console.log('홈 버튼 클릭')
  } catch (error) {
    console.error('홈 버튼 찾기 실패:', error instanceof Error ? error.message : String(error))
    throw new Error('홈 버튼을 찾을 수 없습니다.')
  }
}
