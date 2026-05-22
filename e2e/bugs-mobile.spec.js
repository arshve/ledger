import { test, expect } from '@playwright/test'

const MOBILE_VIEWPORT = { width: 390, height: 844 }

test.describe('Ledger App — Mobile Layout Bugs', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto('/')
    await page.waitForSelector('.app', { timeout: 15000 })
  })

  test('BUG-1: app fills full viewport at any height (simulating address bar hide)', async ({ page }) => {
    // The problem: 100dvh vs 100vh — address bar changes effective height
    // Test across multiple heights
    const heights = [700, 750, 800, 844, 900]
    for (const h of heights) {
      await page.setViewportSize({ width: 390, height: h })
      await page.waitForTimeout(300)
      // Re-render (force resize)
      await page.evaluate(() => window.dispatchEvent(new Event('resize')))
      await page.waitForTimeout(300)

      const appBox = await page.locator('.app').boundingBox()
      expect(appBox).not.toBeNull()
      // App must fill EXACTLY the viewport height with 1px tolerance
      expect(Math.abs(appBox.y + appBox.height - h)).toBeLessThanOrEqual(1)

      // Tab bar always at bottom
      const tabbarBox = await page.locator('.tabbar').boundingBox()
      expect(tabbarBox).not.toBeNull()
      expect(Math.abs(tabbarBox.y + tabbarBox.height - h)).toBeLessThanOrEqual(1)
    }
  })

  test('BUG-2: tab bar stays frozen when screen-body scrolls', async ({ page }) => {
    // Go to History tab (more content to scroll)
    await page.locator('.tabbar .tab', { hasText: /history/i }).click()
    await page.waitForTimeout(500)

    // Get tab bar position before scroll
    const tabbarBefore = await page.locator('.tabbar').boundingBox()
    expect(tabbarBefore).not.toBeNull()

    // Scroll the .screen-body inside History (not window)
    await page.evaluate(() => {
      const body = document.querySelector('.screen-body')
      if (body) body.scrollTo(0, 500)
    })
    await page.waitForTimeout(300)

    // Tab bar should NOT have moved
    const tabbarAfter = await page.locator('.tabbar').boundingBox()
    expect(tabbarAfter).not.toBeNull()
    expect(tabbarAfter.y).toBe(tabbarBefore.y)
    expect(tabbarAfter.y + tabbarAfter.height).toBe(MOBILE_VIEWPORT.height)

    // Window itself should NOT have scrolled
    const winScrollY = await page.evaluate(() => window.scrollY)
    expect(winScrollY).toBe(0)
  })

  test('BUG-2: tab bar does not move when content scrolls via touch momentum', async ({ page }) => {
    // Go to History
    await page.locator('.tabbar .tab', { hasText: /history/i }).click()
    await page.waitForTimeout(500)

    // Get tabbar position
    const tabbarBefore = await page.locator('.tabbar').boundingBox()

    // Scroll .screen-body aggressively via JS (simulating overscroll)
    await page.evaluate(() => {
      const body = document.querySelector('.screen-body')
      if (body) {
        body.scrollTo(0, body.scrollHeight)
      }
    })
    await page.waitForTimeout(300)

    const tabbarAfter = await page.locator('.tabbar').boundingBox()
    expect(tabbarAfter.y).toBe(tabbarBefore.y)

    // Screenshot for visual inspection
    await page.screenshot({ path: 'e2e/screenshots/history-scrolled.png', fullPage: false })
  })

  test('BUG-1: screenshot — initial load fullscreen', async ({ page }) => {
    // Force re-render by toggling theme (simulates mounting)
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'e2e/screenshots/initial-fullscreen.png', fullPage: false })

    // Check html/body/app boundaries
    const vp = page.viewportSize()
    const results = await page.evaluate(() => ({
      htmlH: document.documentElement.clientHeight,
      bodyH: document.body.clientHeight,
      rootH: document.getElementById('root')?.clientHeight,
      appH: document.querySelector('.app')?.clientHeight,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow,
      rootOverflow: getComputedStyle(document.getElementById('root')).overflow,
    }))
    console.log('Viewport:', vp)
    console.log('Client dimensions:', results)

    // Everything must match viewport height
    expect(results.htmlH).toBe(vp.height)
    expect(results.bodyH).toBe(vp.height)
    expect(results.rootH).toBe(vp.height)
    expect(results.appH).toBe(vp.height)
  })

  test('BUG-2: tab bar bottom edge flush with viewport in ALL tabs', async ({ page }) => {
    const tabs = ['inbox', 'history', 'insights', 'settings']
    for (const tabId of tabs) {
      await page.locator('.tabbar .tab', { hasText: new RegExp(tabId, 'i') }).click()
      await page.waitForTimeout(300)

      const vp = page.viewportSize()
      const tabbarBox = await page.locator('.tabbar').boundingBox()
      expect(tabbarBox).not.toBeNull()

      // Tab bar bottom = viewport bottom
      expect(Math.abs(tabbarBox.y + tabbarBox.height - vp.height)).toBeLessThanOrEqual(1)
      // Window didn't scroll
      const scrollY = await page.evaluate(() => window.scrollY)
      expect(scrollY).toBe(0)
    }
  })

  test('BUG-2: disable zoom on mobile — viewport meta', async ({ page }) => {
    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]')
      return meta?.getAttribute('content')
    })
    expect(viewport).toContain('maximum-scale=1.0')
    expect(viewport).toContain('user-scalable=no')
  })
})
