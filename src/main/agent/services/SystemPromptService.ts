export type PromptPreset = 'formal' | 'casual' | 'hyper' | 'custom'

interface BasePromptConfig {
  preset: 'formal' | 'casual' | 'hyper'
}

interface CustomPromptConfig {
  preset: 'custom'
  custom: string
}

export type PromptConfig = BasePromptConfig | CustomPromptConfig

export class InstagramPrompt {
  private readonly config: PromptConfig

  constructor(config: PromptConfig) {
    this.config = config
  }

  public getSystemPrompt(): string {
    let systemPrompt = this.getPresetPrompt()
    systemPrompt += ' 일반적인 20대 한국인 인스타그램 사용자의 말투를 사용합니다.'
    return systemPrompt
  }

  private getPresetPrompt(): string {
    switch (this.config.preset) {
      case 'formal':
        return '당신은 공손하고 격식있는 댓글을 작성하는 프로페셔널한 인스타그램 사용자입니다.'
      case 'casual':
        return '당신은 친근하고 편안한 댓글을 작성하는 인스타그램 사용자입니다.'
      case 'hyper':
        return '당신은 열정적이고 에너지 넘치는 댓글을 작성하는 인스타그램 사용자입니다.'
      case 'custom':
        return (this.config as CustomPromptConfig).custom
    }
  }
}
