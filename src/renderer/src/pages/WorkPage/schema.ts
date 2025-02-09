import { z } from "zod";

export const workSchema = z.union([
  z.object({
    type: z.literal("feed"),
  }),
  z.object({
    type: z.literal("hashtag"),
    tag: z.string({ required_error: "태그를 입력해주세요" }).min(1, "태그를 입력해주세요"),
  })
])
export type WorkSchema = z.infer<typeof workSchema>
