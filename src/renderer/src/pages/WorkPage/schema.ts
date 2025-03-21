import { z } from 'zod'

export const workSchema = z.object({
  feedWork: z.object({
    count: z.coerce.number().min(1, { message: '최소 1개 이상 입력해주세요.' }),
    enabled: z.boolean()
  }),
  hashtagWork: z.object({
    count: z.coerce.number().min(1, { message: '최소 1개 이상 입력해주세요.' }),
    enabled: z.boolean(),
    hashtags: z.array(z.string().min(1))
  }),
  myFeedInteractionWork: z.object({
    count: z.coerce.number().min(1, { message: '최소 1개 이상 입력해주세요.' }),
    enabled: z.boolean()
  }),
  hashtagInteractionWork: z.object({
    count: z.coerce.number().min(1, { message: '최소 1개 이상 입력해주세요.' }),
    enabled: z.boolean()
  })
})

export type WorkSchema = z.infer<typeof workSchema>
