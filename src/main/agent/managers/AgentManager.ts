
import { AgentConfig, Work } from '../../..';
import { InstagramAgent } from '../InstagramAgent';


export interface BotStatus {
  isRunning: boolean;
  currentWork: Work | null;
  waiting: {
    for: string;
    until: string;
  } | null;
}

export class AgentManager {
  private agent: InstagramAgent | null = null;
  private status: BotStatus = {
    isRunning: false,
    currentWork: null,
    waiting: null
  };
  private config: AgentConfig | null = null;
  private workList: Work[] = [];
  private currentWorkIndex = 0;
  // private openai: OpenAI;

  constructor() {
    // this.openai = new OpenAI();
  }

  async start(config: AgentConfig, workList: Work[]): Promise<void> {
    try {
      if (this.status.isRunning) {
        throw new Error('Agent is already running');
      }

      this.status = {
        isRunning: true,
        currentWork: null,
        waiting: null
      };

      this.config = config;
      this.workList = workList;
      this.currentWorkIndex = 0;

      // Initialize and login
      this.agent = new InstagramAgent(config);
      await this.agent.initialize();
      await this.agent.login(config.credentials.username, config.credentials.password);

      await this.startWorkLoop();
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  private async startWorkLoop() {
    if (!this.agent || !this.config || this.workList.length === 0) return;

    while (this.status.isRunning) {
      try {
        const currentWork = this.workList[this.currentWorkIndex];
        this.status.currentWork = currentWork;
        this.status.waiting = null;

        // Process work based on type 
        if (currentWork.type === 'feed') {
          await this.agent.scanFeed();
        } else if (currentWork.type === 'hashtag') {
          await this.agent.scanHashtag(currentWork.tag);
        }

        // Set waiting status for work interval
        // const nextTime = new Date();
        // nextTime.setSeconds(nextTime.getSeconds() + this.config.workIntervalSeconds);
        
        // this.status.waiting = {
        //   for: 'Next work cycle',
        //   until: nextTime.toISOString()
        // };

        // Move to next work and wait
        this.currentWorkIndex = (this.currentWorkIndex + 1) % this.workList.length;
        // await new Promise(resolve => 
        //   setTimeout(resolve, this.config!.workIntervalSeconds * 1000)
        // );
        if (this.currentWorkIndex === 0) {
          await new Promise(resolve => setTimeout(resolve, (this.config?.loopIntervalSeconds ?? 300) * 1000))
          // await waitRandomTime(this.config.loopIntervalSeconds * 1000, 0.2)
        }
        else {
          await new Promise(resolve => setTimeout(resolve, (this.config?.workIntervalSeconds ?? 21600) * 1000))
          // await waitRandomTime(this.config.workIntervalSeconds * 1000, 0.2)
        }

      } catch (error) {
        console.error('Error in work loop:', error);
        await new Promise(resolve => setTimeout(resolve, 1000))
        this.currentWorkIndex = (this.currentWorkIndex + 1) % this.workList.length;
        continue;
      }
    }
  }



  async stop(): Promise<void> {
    if (this.agent) {
      await this.agent.close();
      this.agent = null;
    }

    this.status = {
      isRunning: false,
      currentWork: null,
      waiting: null
    };
  }

  getStatus(): BotStatus {
    return this.status;
  }
}