// 메인 프로세스 supabase 클라이언트용 "회복형 fetch".
//
// Node(undici)는 keep-alive 유휴 소켓을 재사용하려다, 그 사이 서버/방화벽이 소켓을
// 닫았으면 "TypeError: fetch failed" (cause: 'terminated' / 'other side closed' /
// ECONNRESET 등)를 던진다. 자동화 앱처럼 장시간 떠 있으면서 호출 간격이 들쭉날쭉하면
// 이 죽은-소켓 재사용 실패가 흔하다. 해법은 단순하다: 재시도하면 그때는 새 소켓을 열어
// 성공한다.
//
// 이 래퍼를 createClient의 global.fetch로 주입하면 모든 supabase 호출
// (block_account, comment_history, target_followers ...)이 자동으로 보호된다.
// 재시도가 성공하면 상위 코드는 fetch failed를 아예 보지 못한다(로그도 깨끗).

// 일시적 네트워크 에러 패턴 (재시도 대상). "fetch failed"는 Node undici가 네트워크
// 실패 시 던지는 정확한 메시지. 일시적 끊김을 영구 실패로 취급하면 안 된다.
export const TRANSIENT_NETWORK_PATTERNS = [
  'fetch failed',
  'failed to fetch',
  'econnreset',
  'etimedout',
  'enotfound',
  'econnrefused',
  'eai_again', // DNS 일시 실패
  'socket hang up',
  'network',
  'timeout',
  'und_err', // undici 내부 에러
  'terminated' // undici 'other side closed'
]

/** Error 객체 또는 supabase PostgrestError를 받아 일시적 네트워크 에러인지 판정 */
export function isTransientNetworkError(err: unknown): boolean {
  if (!err) return false
  const parts: string[] = []
  const anyErr = err as any
  if (typeof anyErr?.message === 'string') parts.push(anyErr.message)
  if (typeof anyErr?.code === 'string') parts.push(anyErr.code)
  if (typeof anyErr?.cause?.code === 'string') parts.push(anyErr.cause.code)
  if (typeof anyErr?.cause?.message === 'string') parts.push(anyErr.cause.message)
  if (typeof anyErr?.details === 'string') parts.push(anyErr.details) // PostgrestError
  if (typeof err === 'string') parts.push(err)
  const haystack = parts.join(' ').toLowerCase()
  return TRANSIENT_NETWORK_PATTERNS.some((p) => haystack.includes(p))
}

/** 에러에서 진짜 하위 원인 코드(ECONNRESET / EAI_AGAIN / terminated ...)를 뽑아낸다. */
export function networkErrorCause(err: unknown): string {
  const anyErr = err as any
  return String(anyErr?.cause?.code ?? anyErr?.code ?? anyErr?.cause?.message ?? '')
}

const RETRY_ATTEMPTS = 3
const BASE_DELAY_MS = 800 // 800ms -> 1600ms

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * supabase createClient의 global.fetch에 주입할 재시도 fetch 래퍼.
 * undici 일시 네트워크 실패(특히 keep-alive 'terminated')를 지수 백오프로 재시도한다.
 * - 일시적 에러 & 재시도 여유 → 백오프 후 새 소켓으로 재시도
 * - 영구 에러(또는 재시도 소진) → 그대로 throw (supabase-js가 { error }로 변환)
 */
export function createResilientFetch(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    let lastErr: unknown
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        return await baseFetch(input, init)
      } catch (err) {
        lastErr = err
        if (isTransientNetworkError(err) && attempt < RETRY_ATTEMPTS) {
          const cause = networkErrorCause(err)
          const delay = BASE_DELAY_MS * 2 ** (attempt - 1)
          // 재시도 성공이 정상 흐름이므로 조용히 한 줄만(노이즈 최소화). 원인 코드는 남긴다.
          console.warn(
            `[supabase fetch] 일시 네트워크 오류 재시도 (${attempt}/${RETRY_ATTEMPTS}) ${delay}ms 후${cause ? ` [${cause}]` : ''}`
          )
          await sleep(delay)
          continue
        }
        throw err
      }
    }
    throw lastErr
  }
}
