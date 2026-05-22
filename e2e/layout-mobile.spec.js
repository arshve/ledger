import { test, expect } from '@playwright/test'

const MOBILE_VIEWPORT = { width: 390, height: 844 }

test.describe('Ledger App — Mobile Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto('/')
    // wait for app to load (spinner disappears)
    await page.waitForSelector('.app', { timeout: 15000 })
  })

  test('app fills full viewport height — no bottom gap', async ({ page }) => {
    const viewport = page.viewportSize()
    const appBox = await page.locator('.app').boundingBox()
    expect(appBox).not.toBeNull()
    // app height should equal viewport height
    expect(appBox.height).toBe(viewport.height)
    // app should start at y=0
    expect(appBox.y).toBe(0)
    // app width matches viewport
    expect(appBox.width).toBe(viewport.width)
    expect(appBox.x).toBe(0)
  })

  test('tab bar is visible and at the bottom of the viewport', async ({ page }) => {
    const viewport = page.viewportSize()
    const tabbar = page.locator('.tabbar')
    await expect(tabbar).toBeVisible()

    const appBox = await page.locator('.app').boundingBox()
    const tabbarBox = await tabbar.boundingBox()
    expect(tabbarBox).not.toBeNull()
    // tab bar bottom should be at viewport bottom (full screen)
    expect(tabbarBox.y + tabbarBox.height).toBe(viewport.height)
    // no gap between app bottom and tab bar bottom
    expect(appBox.y + appBox.height).toBe(viewport.height)
  })

  test('tab bar does NOT scroll with page content', async ({ page }) => {
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500))
    await page.waitForTimeout(200)

    const vp = page.viewportSize()

    // Tab bar should still be at the bottom
    const tabbar = page.locator('.tabbar')
    const tabbarBox = await tabbar.boundingBox()
    expect(tabbarBox).not.toBeNull()
    expect(tabbarBox.y + tabbarBox.height).toBe(vp.height)

    // Tab bar top should be within viewport
    expect(tabbarBox.y).toBeGreaterThanOrEqual(vp.height - tabbarBox.height - 20)
    expect(tabbarBox.y).toBeLessThanOrEqual(vp.height)

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(200)

    const afterScrollBox = await tabbar.boundingBox()
    expect(afterScrollBox).not.toBeNull()
    expect(afterScrollBox.y + afterScrollBox.height).toBe(vp.height)
  })

  test('screen does not overflow — no scrollbar on root', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => {
      const html = document.documentElement
      return html.scrollHeight - html.clientHeight
    })
    // There should be no vertical scroll on html (it's overflow: hidden)
    const htmlOverflowY = await page.evaluate(() =>
      getComputedStyle(document.documentElement).overflowY
    )
    expect(htmlOverflowY).toBe('hidden')
    expect(scrollWidth).toBeLessThanOrEqual(20) // at most a tiny bounce
  })

  test('app overflow is hidden at every level', async ({ page }) => {
    const stack = await page.evaluate(() => {
      const els = ['.app', '#root', 'body', 'html']
      return els.map(sel => {
        const el = document.querySelector(sel)
        if (!el) return { sel, overflow: 'NOT_FOUND' }
        const s = getComputedStyle(el)
        return {
          sel,
          overflow: s.overflow,
          overflowX: s.overflowX,
          overflowY: s.overflowY,
          height: s.height,
        }
      })
    })
    console.table(stack)

    // All should be overflow hidden
    for (const item of stack) {
      if (item.overflow === 'NOT_FOUND') continue
      expect(item.overflow).toBe('hidden')
    }
  })

  test('switching tabs does not cause overflow', async ({ page }) => {
    const tabs = ['inbox', 'history', 'insights', 'settings']
    for (const tabId of tabs) {
      // Click tab button
      await page.locator('.tabbar .tab', { hasText: new RegExp(tabId, 'i') }).click()
      await page.waitForTimeout(300)

      const scrollH = await page.evaluate(() =>
        document.documentElement.scrollHeight - document.documentElement.clientHeight
      )
      expect(scrollH).toBeLessThanOrEqual(5)

      // App still fills viewport
      const appBox = await page.locator('.app').boundingBox()
      const vp = page.viewportSize()
      expect(appBox.y + appBox.height).toBe(vp.height)

      // Tab bar still at bottom
      const tabbarBox = await page.locator('.tabbar').boundingBox()
      expect(tabbarBox.y + tabbarBox.height).toBe(vp.height)
    }
  })
})
