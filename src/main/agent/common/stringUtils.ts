/**
 * 해시태그 유사도 계산 유틸리티
 */

export interface HashtagCandidate {
  tag: string
  postCount?: number
}

export interface BestMatchResult {
  tag: string
  score: number
  postCount?: number
}

/**
 * 해시태그 유사도 점수 계산
 * - 정확 일치: 1000점
 * - 검색어로 시작 (접두사 매칭): 500점 (길이 짧을수록 우선)
 * - 검색어 포함: 100점 (길이 짧을수록 우선)
 * - 매칭 안됨: 0점
 */
export function calculateHashtagSimilarity(searchTag: string, candidateTag: string): number {
  const search = searchTag.toLowerCase()
  const candidate = candidateTag.toLowerCase()

  // 정확 일치
  if (search === candidate) {
    return 1000
  }

  // 접두사 매칭 (검색어로 시작) - 더 관련성 높음
  if (candidate.startsWith(search)) {
    return 500 - (candidate.length - search.length)
  }

  // 포함 매칭
  if (candidate.includes(search)) {
    return 100 - (candidate.length - search.length)
  }

  return 0
}

/**
 * 인스타그램 게시글 수 텍스트를 숫자로 파싱
 * 예: "게시물 1.2만" → 12000, "게시물 5억" → 500000000
 */
export function parsePostCount(text: string): number {
  // 숫자 부분 추출
  const numMatch = text.match(/[\d.]+/)
  if (!numMatch) return 0

  const num = parseFloat(numMatch[0])

  if (text.includes('억')) {
    return num * 100000000
  }
  if (text.includes('만')) {
    return num * 10000
  }
  if (text.includes('천')) {
    return num * 1000
  }

  // 콤마 제거 후 파싱
  return parseInt(text.replace(/,/g, ''), 10) || num
}

/**
 * 검색어와 가장 유사한 해시태그를 찾아 반환
 * 동점일 경우 게시글 수가 많은 것 우선
 */
export function findBestMatchingHashtag(
  searchTag: string,
  candidates: HashtagCandidate[]
): BestMatchResult | null {
  if (candidates.length === 0) {
    return null
  }

  let bestMatch: BestMatchResult | null = null

  for (const candidate of candidates) {
    const score = calculateHashtagSimilarity(searchTag, candidate.tag)

    // 점수가 0이면 매칭 안됨
    if (score === 0) {
      continue
    }

    if (!bestMatch) {
      bestMatch = {
        tag: candidate.tag,
        score,
        postCount: candidate.postCount
      }
      continue
    }

    // 점수가 더 높으면 선택
    if (score > bestMatch.score) {
      bestMatch = {
        tag: candidate.tag,
        score,
        postCount: candidate.postCount
      }
    }
    // 동점일 경우 게시글 수가 많은 것 선택
    else if (
      score === bestMatch.score &&
      candidate.postCount !== undefined &&
      (bestMatch.postCount === undefined || candidate.postCount > bestMatch.postCount)
    ) {
      bestMatch = {
        tag: candidate.tag,
        score,
        postCount: candidate.postCount
      }
    }
  }

  return bestMatch
}
