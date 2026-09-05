import assert from "node:assert/strict"
import http from "node:http"
import { once } from "node:events"
import { fileURLToPath } from "node:url"
import test from "node:test"
import handler from "serve-handler"
import { chromium } from "playwright"

const publicRoot = fileURLToPath(new URL("../../../public/", import.meta.url))

for (const navigate of [false, true]) {
  test(`delayed emoji response with ${navigate ? "chapter navigation" : "the original chapter"}`, async () => {
    const server = http.createServer((request, response) =>
      handler(request, response, { public: publicRoot, cleanUrls: true }),
    )
    server.listen(0, "127.0.0.1")
    await once(server, "listening")
    const origin = `http://127.0.0.1:${server.address().port}`
    let browser
    try {
      browser = await chromium.launch({ channel: "chrome", headless: true })
      const page = await browser.newPage()
      const errors = []
      let release, requested
      const responseGate = new Promise((resolve) => (release = resolve))
      const requestGate = new Promise((resolve) => (requested = resolve))
      page.on("pageerror", (error) => errors.push(error.message))
      await page.route("**/*", async (route) => {
        const url = route.request().url()
        if (url.startsWith(origin)) return route.continue()
        const headers = { "access-control-allow-origin": "*" }
        if (url === "https://comments-test.invalid/owo.json") {
          requested()
          await responseGate
          return route.fulfill({
            headers,
            json: { default: { type: "emoticon", container: [{ icon: "☕", text: "茶" }] } },
          })
        }
        if (url.includes("/.netlify/functions/twikoo")) {
          const body = route.request().postDataJSON()
          if (body.event === "GET_CONFIG") {
            return route.fulfill({
              headers,
              json: {
                config: {
                  VERSION: "1.6.44",
                  SHOW_EMOTION: "true",
                  EMOTION_CDN: "https://comments-test.invalid/owo.json",
                },
              },
            })
          }
          assert.equal(
            body.event,
            "COMMENT_GET",
            "This regression never writes to the live service",
          )
          return route.fulfill({ headers, json: { data: [], count: 0, more: false } })
        }
        return route.abort()
      })
      await page.goto(`${origin}/chapter-01`, { waitUntil: "domcontentloaded" })
      await page.waitForFunction(() => typeof window.spaNavigate === "function")
      await page.locator(".book-comments").scrollIntoViewIfNeeded()
      await Promise.race([
        requestGate,
        new Promise((_, reject) => {
          const timer = setTimeout(() => reject(new Error("Emoji request was not started")), 10000)
          timer.unref()
        }),
      ])
      if (navigate) {
        await page.evaluate(() => window.spaNavigate(new URL("/chapter-02", location.href)))
      }
      release()
      await page.waitForLoadState("networkidle")
      assert.deepEqual(errors, [], "Late emoji setup must not access a destroyed comment form")
      if (navigate) await page.locator(".book-comments").scrollIntoViewIfNeeded()
      await page.waitForSelector(".book-comments[data-state='ready']")
      await page.waitForSelector(".book-comments .OwO-logo")
      assert.equal(
        await page.locator(".book-comments").getAttribute("data-comment-path"),
        `/qinghe-book/chapter-0${navigate ? 2 : 1}`,
      )
    } finally {
      await browser?.close()
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  })
}
