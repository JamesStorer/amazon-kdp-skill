import { chromium } from 'playwright'
import { ensureSessionDir, sessionFilePath } from './session.js'
import { checkSession } from './kdpClient.js'

let loginInProgress = false
let loginError: string | null = null

export function getLoginState(): {
  loginInProgress: boolean
  loginError: string | null
} {
  return { loginInProgress, loginError }
}

/** Open a visible browser so the user can sign in to Amazon KDP (incl. MFA). */
export async function startInteractiveLogin(): Promise<void> {
  if (loginInProgress) {
    throw new Error('Login already in progress.')
  }

  loginInProgress = true
  loginError = null

  void (async () => {
    let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
    try {
      await ensureSessionDir()
      browser = await chromium.launch({
    channel: process.env.KDP_BROWSER_CHANNEL || 'chrome',
        headless: false,
        args: ['--disable-blink-features=AutomationControlled'],
      })
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.goto('https://kdp.amazon.com/en_US/bookshelf', { waitUntil: 'domcontentloaded' });
      await page.bringToFront()

      const deadline = Date.now() + 10 * 60 * 1000
      while (Date.now() < deadline) {
        const url = page.url()
        if (url.includes('kdp.amazon.com/') && url.includes('/bookshelf') &&
            await page.getByRole('link', {name: 'Sign out', exact: true}).isVisible().catch(() => false)) {
          await context.storageState({path: sessionFilePath()})
          loginError = null
          break
        }
        await page.waitForTimeout(1500)
      }

      if (!(await checkSession()).connected) {
        loginError =
          loginError ??
          'Sign-in timed out or was not completed. Try again and finish Amazon login in the browser window.'
      }
    } catch (e) {
      loginError =
        'The Amazon browser could not stay open. Check that Google Chrome is installed, then try signing in again.'
    } finally {
      loginInProgress = false
      await browser?.close().catch(() => {})
    }
  })()
}
