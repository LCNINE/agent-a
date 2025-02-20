export const SLEEP_ENTRIES = [
  { delayMs: 10000, frequency: 8 },
  { delayMs: 30000, frequency: 3 },
  { delayMs: 50000, frequency: 1 }
]

export async function randomSleep(averageDelayMs: number, randomness?: number) {
  const factor = Math.random() * 2 - 1 // [-1, 1)
  return new Promise((resolve) =>
    setTimeout(resolve, averageDelayMs + (randomness ?? 0.3) * factor)
  )
}

export async function chooseRandomSleep(sleepEntries: { delayMs: number; frequency: number }[]) {
  const totalFrequency = sleepEntries.reduce((acc, cur) => acc + cur.frequency, 0)

  let randomStop = totalFrequency * Math.random() // [0, totalFrequency)
  for (const sleepEntry of sleepEntries) {
    randomStop -= sleepEntry.frequency
    if (randomStop <= 0) {
      await randomSleep(sleepEntry.delayMs)
      return
    }
  }
}
export function sleepDelayExpectation(sleepEntries: { delayMs: number; frequency: number }[]) {
  return (
    sleepEntries.reduce((acc, cur) => acc + cur.frequency * cur.delayMs, 0) /
    sleepEntries.reduce((acc, cur) => acc + cur.frequency, 0)
  )
}
