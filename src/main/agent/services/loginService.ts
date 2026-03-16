import { Page, Browser } from 'playwright'

export class LoginService {
  constructor(private page: Page) {}

  async login(username: string, password: string): Promise<boolean> {
    try {
      console.log('로그인 페이지 접속 중...')
      await this.page.goto('https://www.instagram.com/accounts/login/')
      await this.page.waitForTimeout(2000) // 페이지 로딩 대기

      // 이미 로그인되어 있는지 확인 (로그인 폼 id="login_form"이 보이면 로그인 필요)
      const loginForm = this.page.locator('form#login_form')
      const needsLogin = await loginForm.isVisible().catch(() => false)
      if (!needsLogin) {
        console.log('이미 로그인되어 있습니다')
        return true
      }

      // 아이디 입력 (폼 내 input name="email" 또는 name="username")
      const usernameInput = loginForm.locator(
        'input[name="email"], input[name="username"]'
      ).first()
      await usernameInput.waitFor({ state: 'visible', timeout: 15000 })
      await usernameInput.click()
      await usernameInput.pressSequentially(username, { delay: 50 })

      await this.page.waitForTimeout(800)

      // 비밀번호 입력 (폼 내 type="password" 또는 name="pass")
      const passwordInput = loginForm.locator(
        'input[type="password"], input[name="pass"], input[name="password"]'
      ).first()
      await passwordInput.waitFor({ state: 'visible', timeout: 15000 })
      await passwordInput.scrollIntoViewIfNeeded()
      await this.page.waitForTimeout(300)
      await passwordInput.click()
      await passwordInput.fill(password)

      await this.page.waitForTimeout(1000)

      // 로그인 버튼 클릭
      await this.page
        .getByRole('button', { name: /로그인|log in/i })
        .first()
        .click()

      // 로그인 완료 대기
      await this.page.waitForURL('https://www.instagram.com/', { timeout: 30000 })

      return true
    } catch (error) {
      throw new Error(`로그인 실패: ${(error as Error).message}`)
    }
  }
}
