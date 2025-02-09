export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));


export async function waitRandomTime(average: number, randomness: number): Promise<void> {
  const range = average * randomness
  const coefficient = Math.random() * 2 - 1
  const delay = Math.floor(average + coefficient*range);
  await new Promise(resolve => setTimeout(resolve, delay));
}