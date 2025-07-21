import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string({ required_error: '이메일을 입력해주세요.' }).email('이메일 형식이 아닙니다.'),
  password: z.string({ required_error: '비밀번호를 입력해주세요.' }).min(6, '너무 짧습니다.')
})

export type LoginSchema = z.infer<typeof loginSchema>
