import { Page, Browser } from 'playwright'

export class LoginService {
  constructor(private page: Page) {}

  async login(username: string, password: string): Promise<boolean> {
    try {
      console.log('로그인 페이지 접속 중...')
      await this.page.goto('https://www.instagram.com/accounts/login/')
      await this.page.waitForTimeout(2000) // 페이지 로딩 대기

      // 이미 로그인되어 있는지 확인
      const loginForm = this.page.locator('form[id="loginForm"]')
      if (!(await loginForm.isVisible())) {
        console.log('이미 로그인되어 있습니다')
        return true
      }

      // 아이디 입력
      const usernameInput = this.page.getByLabel(
        /전화번호, 사용자 이름 또는 이메일|phone number, username, or email/i
      )
      await usernameInput.click()
      await usernameInput.pressSequentially(username, { delay: 50 })

      await this.page.waitForTimeout(1000)

      // 비밀번호 입력
      const passwordInput = this.page.getByLabel(/비밀번호|password/i)
      await passwordInput.click()
      await passwordInput.pressSequentially(password, { delay: 50 })

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
