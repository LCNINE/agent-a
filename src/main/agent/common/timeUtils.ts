export function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function waitRandom(ms: number, randomFactor: number) {
  if (randomFactor < 0 || randomFactor > 1)
    throw Error('waitRandom의 randomFactor는 0 이상 1 이하여야 함')
  const randomRangeMs = ms * randomFactor
  const randomDelta = randomRangeMs * (2 * Math.random() - 1)
  await wait(ms + randomDelta)
}

// 게시물 상호작용(좋아요, 댓글) 사이의 대기 시간
export const postInteractionDelays = [
  { delayMs: 3000, frequency: 10 },
  { delayMs: 5000, frequency: 5 },
  { delayMs: 15000, frequency: 2 }
]

// 해시태그 검색과 같은 큰 동작 사이의 대기 시간
export const majorActionDelays = [
  { delayMs: 30000, frequency: 8 },
  { delayMs: 60000, frequency: 4 },
  { delayMs: 120000, frequency: 1 }
]

// 페이지 스크롤 사이의 대기 시간
export const scrollDelays = [
  { delayMs: 3000, frequency: 10 },
  { delayMs: 8000, frequency: 5 },
  { delayMs: 15000, frequency: 2 }
]

export async function chooseRandomSleep(
  sleepEntries: { delayMs: number; frequency: number }[]
): Promise<void> {
  const totalFrequency = sleepEntries.reduce((acc, cur) => acc + cur.frequency, 0)
  let randomStop = totalFrequency * Math.random()

  for (const sleepEntry of sleepEntries) {
    randomStop -= sleepEntry.frequency
    if (randomStop <= 0) {
      await randomSleep(sleepEntry.delayMs)
      return
    }
  }
}

export function sleepDelayExpectation(
  sleepEntries: { delayMs: number; frequency: number }[]
): number {
  return (
    sleepEntries.reduce((acc, cur) => acc + cur.frequency * cur.delayMs, 0) /
    sleepEntries.reduce((acc, cur) => acc + cur.frequency, 0)
  )
}

export async function randomSleep(averageDelayMs: number, randomness: number = 0.3): Promise<void> {
  const factor = Math.random() * 2 - 1
  return new Promise((resolve) =>
    setTimeout(resolve, averageDelayMs + randomness * factor * averageDelayMs)
  )
}
