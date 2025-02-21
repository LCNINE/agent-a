import { Page, ElementHandle } from 'playwright'


export async function smoothScrollToElement(
  page: Page, 
  element: ElementHandle
): Promise<void> {
  const viewportSize = page.viewportSize()
  if (!viewportSize) return

  const elementPosition = await element.evaluate((el: Element) => {
    const rect = el.getBoundingClientRect()
    return {
      top: rect.top,
      absoluteTop: rect.top + window.scrollY,
      height: rect.height
    }
  })

  await page.evaluate(
    ({ absoluteTop, viewportHeight }) => {
      return new Promise<void>((resolve) => {
        const targetY = Math.max(0, absoluteTop - (viewportHeight * 0.2))
        const startY = window.scrollY
        const distance = targetY - startY

        if (Math.abs(distance) < 10) {
          resolve()
          return
        }

        const duration = 800
        const steps = 40
        const stepDuration = duration / steps
        let currentStep = 0

        const tick = () => {
          currentStep++
          
          if (currentStep >= steps) {
            window.scrollTo(0, targetY)
            resolve()
            return
          }

          const progress = currentStep / steps
          const easing = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2

          window.scrollTo(0, startY + (distance * easing))
          setTimeout(tick, stepDuration)
        }

        tick()
      })
    },
    { 
      absoluteTop: elementPosition.absoluteTop,
      viewportHeight: viewportSize.height 
    }
  )

  await page.waitForTimeout(100)
}