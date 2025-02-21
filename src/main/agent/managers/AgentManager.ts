import { Browser, BrowserContext, ElementHandle, Locator } from 'playwright-core'
import { AgentConfig, Work } from '../../..'
import { startBrowser } from '../common/browser'
import { ArticleProcessingService } from '../services/ArticleProcessingService'
import { isLoggedIn } from '../common/browserUtils'
import { callGenerateComments } from '../common/fetchers'
import { chooseRandomSleep, postInteractionDelays, waitRandom } from '../common/timeUtils'

export interface BotStatus {
  isRunning: boolean
  currentWork: Work | null
  waiting: {
    for: string
    until: string
  } | null
}


export class AgentManager {
  private browser: BrowserContext | null = null
  private _status: BotStatus = { 
    isRunning: false,
    currentWork: null,
    waiting: null, 
  }

  constructor(private works: Work[], private config: AgentConfig) {

  }

  async start() {
    this.browser = await startBrowser(this.config.credentials)
    this._status.isRunning = true
  }

  
  async runWork(work: Work) {
    if (this.browser == null) {
      await this.start()
    }

    const page = await this.browser!.newPage()
    switch (work.type) {
      case 'feed': {
        const loggedIn = await isLoggedIn(this.browser!, this.config.credentials)
        if (!loggedIn) throw Error("로그인 실패")
        new ArticleProcessingService(page, async (articleLocator: Locator) => {
          const adIndicatorLocs = await articleLocator.getByText(/광고|Sponsor/).all()
          if (adIndicatorLocs.length !== 0) {
            console.log("[runWork] 광고 스킵")
            return;
          }

          const likeButtonLoc = articleLocator.locator(`svg[aria-label]:is([aria-label="Like"], [aria-label="좋아요"])`)
          if (await likeButtonLoc.isVisible()) {
            await likeButtonLoc.click()
            await chooseRandomSleep(postInteractionDelays)
          }

          const moreButtonLoc = articleLocator
            .filter({ has: articleLocator.getByRole("button") })
            .filter({ hasText: /더 보기|More/})
          if (await moreButtonLoc.isVisible()) {
            await moreButtonLoc.click()
            await chooseRandomSleep(postInteractionDelays)
          }

          const articleScreenshot = await articleLocator.screenshot({ type: "jpeg" })
          const base64Image = articleScreenshot.toString("base64")

          const contentLoc = articleLocator.locator("._ap3a._aaco._aacu._aacx._aad7._aade")
          const content = await contentLoc.textContent()
          if (content == null) {
            console.log("[runWork] 내용이 없는 게시글 스킵")
            return;
          }

          const commentRes = await callGenerateComments({
            image: base64Image,
            content: content,
            minLength: this.config.commentLength.min,
            maxLength: this.config.commentLength.max,
            prompt: this.config.prompt,
          })

          if (!commentRes.isAllowed) {
            console.log("[runWork] AI가 댓글 작성을 거부한 게시글 스킵")
            return;
          }

          const commentTextarea = articleLocator.getByRole("textbox")
          if (!await commentTextarea.isVisible()) {
            console.log("[runWork] 댓글 작성이 불가능한 게시글 스킵")
            return;
          }
          await commentTextarea.pressSequentially(commentRes.comment, { delay: 100 })

          const postButton = articleLocator.getByText(/게시|Post/)
          await postButton.click()
          await chooseRandomSleep(postInteractionDelays)

        }, {})
      }
      case 'hashtag':
      default: throw Error(`지원하지 않는 작업 타입: ${work.type}`)
    }
  }

  // work list를 받아서 하나씩 수행
  // 각 work type별로 적절한 service를 생성하고 browser 넘겨주기
  // browser의 생명 주기 관리리
}




// export class AgentManager {
//   private agent: InstagramAgent | null = null
//   private status: BotStatus = {
//     isRunning: false,
//     currentWork: null,
//     waiting: null
//   }
//   private config: AgentConfig | null = null
//   private workList: Work[] = []
//   private currentWorkIndex = 0
//   // private openai: OpenAI;

//   constructor() {
//     // this.openai = new OpenAI();
//   }

//   async start(config: AgentConfig, workList: Work[]): Promise<void> {
//     try {
//       if (this.status.isRunning) {
//         throw new Error('Agent is already running')
//       }

//       this.status = {
//         isRunning: true,
//         currentWork: null,
//         waiting: null
//       }

//       this.config = config
//       this.workList = workList
//       this.currentWorkIndex = 0

//       // Initialize and login
//       this.agent = new InstagramAgent(config)
//       await this.agent.initialize()
//       await this.agent.login(config.credentials.username, config.credentials.password)

//       await this.startWorkLoop()
//     } catch (error) {
//       this.stop()
//       throw error
//     }
//   }

//   private async startWorkLoop() {
//     if (!this.agent || !this.config || this.workList.length === 0) return

//     while (this.status.isRunning) {
//       try {
//         const currentWork = this.workList[this.currentWorkIndex]
//         this.status.currentWork = currentWork
//         this.status.waiting = null

//         // Process work based on type
//         if (currentWork.type === 'feed') {
//           await this.agent.scanFeed()
//         } else if (currentWork.type === 'hashtag') {
//           await this.agent.scanHashtag(currentWork.tag)
//         }

//         // Set waiting status for work interval
//         // const nextTime = new Date();
//         // nextTime.setSeconds(nextTime.getSeconds() + this.config.workIntervalSeconds);

//         // this.status.waiting = {
//         //   for: 'Next work cycle',
//         //   until: nextTime.toISOString()
//         // };

//         // Move to next work and wait
//         this.currentWorkIndex = (this.currentWorkIndex + 1) % this.workList.length
//         // await new Promise(resolve =>
//         //   setTimeout(resolve, this.config!.workIntervalSeconds * 1000)
//         // );
//         if (this.currentWorkIndex === 0) {
//           await new Promise((resolve) =>
//             setTimeout(resolve, (this.config?.loopIntervalSeconds ?? 300) * 1000)
//           )
//           // await waitRandomTime(this.config.loopIntervalSeconds * 1000, 0.2)
//         } else {
//           await new Promise((resolve) =>
//             setTimeout(resolve, (this.config?.workIntervalSeconds ?? 21600) * 1000)
//           )
//           // await waitRandomTime(this.config.workIntervalSeconds * 1000, 0.2)
//         }
//       } catch (error) {
//         console.error('Error in work loop:', error)
//         await new Promise((resolve) => setTimeout(resolve, 1000))
//         this.currentWorkIndex = (this.currentWorkIndex + 1) % this.workList.length
//         continue
//       }
//     }
//   }

//   async stop(): Promise<void> {
//     if (this.agent) {
//       await this.agent.close()
//       this.agent = null
//     }

//     this.status = {
//       isRunning: false,
//       currentWork: null,
//       waiting: null
//     }
//   }

//   getStatus(): BotStatus {
//     return this.status
//   }
// }
