import { Page, ElementHandle, BrowserContext } from 'playwright'
import { LoginCredentials } from '../../..'

export async function smoothScrollToElement(page: Page, element: ElementHandle): Promise<void> {
  const viewportSize = page.viewportSize()
  if (!viewportSize) return

  const elementPosition = await element.evaluate((el: Element) => {
    const rect = el.getBoundingClientRect()
    return {
      top: rect.top,
      absoluteTop: rect.top + window.scrollY,
      height: rect.height
    }
  })

  await page.evaluate(
    ({ absoluteTop, viewportHeight }) => {
      return new Promise<void>((resolve) => {
        const targetY = Math.max(0, absoluteTop - viewportHeight * 0.2 * Math.random())
        const startY = window.scrollY
        const distance = targetY - startY

        if (Math.abs(distance) < 10) {
          resolve()
          return
        }

        const duration = 800
        const steps = 40
        const stepDuration = duration / steps
        let currentStep = 0

        const tick = () => {
          currentStep++

          if (currentStep >= steps) {
            window.scrollTo(0, targetY)
            resolve()
            return
          }

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

  await page.waitForTimeout(100)
}

export async function isLoggedIn(browser: BrowserContext, credentials: LoginCredentials) {
  const page = await browser.newPage()
  await page.goto('https://www.instagram.com/accounts/login/')

  try {
    await page.waitForURL('https://www.instagram.com/', { timeout: 3000 })
    return true
  } catch {
    try {
      loginWithCredentials(page, credentials)
      return true
    } catch {
      return false
    }
  } finally {
    page.close()
  }
}

export async function loginWithCredentials(page: Page, credentials: LoginCredentials) {
  const { username, password } = credentials
  try {
    console.log('로그인 페이지 접속 중...')
    await page.goto('https://www.instagram.com/accounts/login/')
    await page.waitForTimeout(2000) // 페이지 로딩 대기

    // 이미 로그인되어 있는지 확인
    const loginForm = page.locator('form[id="loginForm"]')
    if (!(await loginForm.isVisible())) {
      console.log('이미 로그인되어 있습니다')
      return true
    }

    // 아이디 입력
    const usernameInput = page.getByLabel(
      /전화번호, 사용자 이름 또는 이메일|phone number, username, or email/i
    )
    await usernameInput.click()
    await usernameInput.pressSequentially(username, { delay: 50 })

    await page.waitForTimeout(1000)

    // 비밀번호 입력
    const passwordInput = page.getByLabel(/비밀번호|password/i)
    await passwordInput.click()
    await passwordInput.pressSequentially(password, { delay: 50 })

    await page.waitForTimeout(1000)

    // 로그인 버튼 클릭
    await page
      .getByRole('button', { name: /로그인|log in/i })
      .first()
      .click()

    await page.waitForTimeout(3000)
    return true
  } catch (error) {
    throw new Error(`로그인 실패: ${(error as Error).message}`)
  }
}
