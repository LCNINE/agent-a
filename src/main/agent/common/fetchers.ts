import axios, { AxiosResponse } from 'axios'

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzemRnYm1nd25heGJ5ZWtxb25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzODAxMDcsImV4cCI6MjA1Mzk1NjEwN30.S4fGG1sv9drG9f04ejWCpmeGyrLkRTdXnxq_UaZzlUg'

const axiosClient = axios.create({
  validateStatus: () => true, // 모든 상태 코드 허용 (에러 응답도 확인 가능)
  headers: {
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY
  }
})

type GenerateCommentReq = {
  image: string
  content: string
  minLength: number
  maxLength: number
  prompt:
    | {
        preset: 'formal' | 'casual' | 'hyper'
      }
    | {
        preset: 'custom'
        custom: string
      }
}
type GenerateCommentRes =
  | {
      isAllowed: true
      comment: string
    }
  | {
      isAllowed: false
      reason: string
    }
export async function callGenerateComments(params: GenerateCommentReq) {
  const response = await axiosClient.post<
    GenerateCommentRes,
    AxiosResponse<GenerateCommentRes>,
    GenerateCommentReq
  >('https://xszdgbmgwnaxbyekqons.supabase.co/functions/v1/generate-comment', params)

  if (response.status >= 400) {
    console.error(`[callGenerateComments] 에러 ${response.status}:`, response.data)
    throw new Error(`댓글 생성 실패 (${response.status}): ${JSON.stringify(response.data)}`)
  }

  return response.data
}

export async function callGenerateReply(params: GenerateCommentReq) {
  const response = await axiosClient.post<
    GenerateCommentRes,
    AxiosResponse<GenerateCommentRes>,
    GenerateCommentReq
  >('https://xszdgbmgwnaxbyekqons.supabase.co/functions/v1/generate-reply', params)

  if (response.status >= 400) {
    console.error(`[callGenerateReply] 에러 ${response.status}:`, response.data)
    throw new Error(`답글 생성 실패 (${response.status}): ${JSON.stringify(response.data)}`)
  }

  return response.data
}
