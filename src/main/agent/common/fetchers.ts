import axios, { AxiosResponse } from 'axios'

const axiosClient = axios.create({
  validateStatus: (status) => status < 500
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
