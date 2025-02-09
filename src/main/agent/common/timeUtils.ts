export function wait(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

export async function waitRandom(ms: number, randomFactor: number) {
  if (randomFactor < 0 || randomFactor > 1 )
    throw Error("waitRandom의 randomFactor는 0 이상 1 이하여야 함")
  const randomRangeMs = ms * randomFactor
  const randomDelta = randomRangeMs * (2 * Math.random() - 1)
  await wait(ms + randomDelta)
}