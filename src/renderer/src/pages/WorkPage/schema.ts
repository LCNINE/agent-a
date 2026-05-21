import { z } from 'zod'

const targetUserSchema = z.object({
  username: z.string().min(1),
  status: z.enum(['pending', 'processing', 'waiting', 'completed', 'failed']),
  processedAt: z.number().optional(),
  error: z.string().optional()
})

const targetFollowerCollectionTargetSchema = z.object({
  username: z.string().min(1),
  groupName: z.string().optional(),
  status: z.enum(['pending', 'processing', 'waiting', 'completed', 'failed']),
  followerCount: z.number().optional(),
  collectedCount: z.number().optional(),
  nextRunAt: z.number().optional(),
  processedAt: z.number().optional(),
  error: z.string().optional()
})

export const workSchema = z.object({
  feedWork: z.object({
    count: z.coerce.number().min(0),
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
  }),
  targetUserWork: z.object({
    count: z.coerce.number().min(1, { message: '최소 1개 이상 입력해주세요.' }),
    enabled: z.boolean(),
    targetUsers: z.array(targetUserSchema),
    likeEnabled: z.boolean(),
    commentEnabled: z.boolean(),
    postsPerUser: z.coerce.number().min(1),
    skipOldPostsMonths: z.coerce.number().min(0)
  }),
  targetFollowerCollectWork: z.object({
    count: z.coerce.number().min(1, { message: '최소 1개 이상 입력해주세요.' }),
    enabled: z.boolean(),
    targetUsers: z.array(targetFollowerCollectionTargetSchema),
    minDailyLimit: z.coerce.number().min(1)
  })
})

export type WorkSchema = z.infer<typeof workSchema>
