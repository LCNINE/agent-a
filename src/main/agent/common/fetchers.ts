import axios, { AxiosResponse } from 'axios'

const axiosClient = axios.create({
  validateStatus: (status) => status < 500,
  headers: {
    Authorization:
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzemRnYm1nd25heGJ5ZWtxb25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzODAxMDcsImV4cCI6MjA1Mzk1NjEwN30.S4fGG1sv9drG9f04ejWCpmeGyrLkRTdXnxq_UaZzlUg'
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

  return response.data
}

export async function callGenerateReply(params: GenerateCommentReq) {
  const response = await axiosClient.post<
    GenerateCommentRes,
    AxiosResponse<GenerateCommentRes>,
    GenerateCommentReq
  >('https://xszdgbmgwnaxbyekqons.supabase.co/functions/v1/generate-reply', params)

  return response.data
}
