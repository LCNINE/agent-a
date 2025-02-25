import { z } from 'zod'

export const configSchema = z.object({
  prompt: z.union([
    z.object({
      preset: z.enum(['formal', 'casual', 'hyper'])
    }),
    z.object({ preset: z.literal('custom'), custom: z.string().min(1) })
  ]),
  commentLength: z
    .object({
      min: z.coerce.number().min(20),
      max: z.coerce.number().max(40)
    })
    .refine((data) => data.max >= data.min, {
      message: '최대 길이는 최소 길이보다 크거나 같아야 합니다',
      path: ['max']
    }),
  postIntervalSeconds: z.coerce.number().min(1),
  workIntervalSeconds: z.coerce.number().min(1),
  loopIntervalSeconds: z.coerce.number().min(1)
})

export type ConfigSchema = z.infer<typeof configSchema>
