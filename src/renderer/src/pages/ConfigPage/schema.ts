import { z } from 'zod'

export const configSchema = z.object({
  prompt: z.union([
    z.object({
      preset: z.enum(['formal', 'casual', 'hyper'])
    }),
    z.object({
      preset: z.literal('custom'),
      custom: z
        .string({
          required_error: '대화 스타일을 입력해주세요'
        })
        .min(1, { message: '대화 스타일을 입력해주세요' })
    })
  ]),
  commentLength: z.object({
    min: z.number().min(10),
    max: z.number().max(100)
  }),
  commentLengthPreset: z.enum(['short', 'normal', 'long']),
  postIntervalSeconds: z.coerce.number().min(1),
  workIntervalSeconds: z.coerce.number().min(1),
  loopIntervalSeconds: z.coerce.number().min(1),
  excludeUsernames: z.array(z.string().min(1)).optional()
})

export type ConfigSchema = z.infer<typeof configSchema>
