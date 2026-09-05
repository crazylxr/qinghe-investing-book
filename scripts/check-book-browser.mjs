import fs from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"
const root = process.cwd()
const out = path.join(root, "review/2026-09-05-implementation-evidence/browser")
await fs.mkdir(out, { recursive: true })
const manifest = JSON.parse(await fs.readFile(path.join(root, "book.manifest.json"), "utf8"))
const entries = manifest.entries.filter((entry) => entry.status === "published")
const base = "http://127.0.0.1:4173"
const browser = await chromium.launch({ channel: "chrome", headless: true })
const records = []
const failures = []
for (const width of [375, 390, 1440]) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
  })
  await context.route("**/*", (route) =>
    route.request().url().startsWith(base) ||
    route.request().url().startsWith("data:") ||
    [
      "fonts.googleapis.com",
      "fonts.gstatic.com",
      "cdn.jsdelivr.net",
      "cdnjs.cloudflare.com",
    ].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  )
  const page = await context.newPage()
  for (const entry of entries) {
    const response = await page.goto(base + entry.url, { waitUntil: "networkidle" })
    await page.evaluate(() => document.fonts.ready)
    await page.locator(".center > article").waitFor()
    const images = page.locator(".center > article img")
    for (let index = 0; index < (await images.count()); index++) {
      const img = images.nth(index)
      await img.scrollIntoViewIfNeeded()
      await img.evaluate(async (el) => {
        if (!el.complete)
          await new Promise((resolve) => {
            el.onload = resolve
            el.onerror = resolve
          })
        if (el.decode) await el.decode().catch(() => {})
      })
      if (width === 390)
        await img.screenshot({
          path: path.join(
            out,
            `figure-${decodeURI((await img.getAttribute("src")).split("/").at(-1))}`,
          ),
        })
    }
    const geometry = await page.evaluate(() => {
      const article = document.querySelector(".center > article")
      const unstyledFractions = [...article.querySelectorAll(".katex .frac-line")].filter(
        (el) => parseFloat(getComputedStyle(el).borderBottomWidth) === 0,
      ).length
      const imgs = [...article.querySelectorAll("img")].map((el) => ({
        src: decodeURI(el.getAttribute("src")),
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        naturalWidth: el.naturalWidth,
        naturalHeight: el.naturalHeight,
        maxHeight: getComputedStyle(el).maxHeight,
        alt: el.alt,
        knowledge: el.classList.contains("book-knowledge-figure"),
      }))
      const tables = [...article.querySelectorAll("table")].map((el) => ({
        width: el.clientWidth,
        scrollWidth: el.scrollWidth,
        overflow: getComputedStyle(el).overflowX,
      }))
      const math = [...article.querySelectorAll(".katex-display")].map((el) => ({
        width: el.clientWidth,
        scrollWidth: el.scrollWidth,
        overflow: getComputedStyle(el).overflowX,
      }))
      return {
        unstyledFractions,
        floatingGithub: [...document.querySelectorAll(".book-github-link")].some(
          (el) => getComputedStyle(el).display !== "none",
        ),
        title: document.querySelector("h1")?.textContent,
        toolbar: document.querySelector(".book-toolbar__chapter")?.textContent,
        pageWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        articleWidth: article.clientWidth,
        imgs,
        tables,
        math,
        answerCount: article.querySelectorAll('.callout[data-callout="answer"]').length,
        pagination: [...article.querySelectorAll(".book-pagination a")].map((el) => ({
          text: el.textContent,
          href: el.getAttribute("href"),
        })),
        sidebar: [...document.querySelectorAll(".explorer-ul > li a.nav-file-title")].map(
          (el) => el.textContent,
        ),
      }
    })
    if (width < 800 && geometry.floatingGithub)
      failures.push(`${width}/${entry.id}: floating GitHub may cover content`)
    if (geometry.unstyledFractions) failures.push(`${width}/${entry.id}: missing fraction styles`)
    for (const formula of geometry.math)
      if (formula.scrollWidth > formula.width + 1 && !["auto", "scroll"].includes(formula.overflow))
        failures.push(`${width}/${entry.id}: inaccessible wide formula`)
    if (response.status() !== 200) failures.push(`${width}/${entry.id}: HTTP ${response.status()}`)
    if (geometry.scrollWidth > width + 2)
      failures.push(`${width}/${entry.id}: page horizontal overflow ${geometry.scrollWidth}`)
    for (const img of geometry.imgs) {
      if (!img.naturalWidth || !img.alt) failures.push(`${entry.id}: broken image/alt ${img.src}`)
      if (
        img.knowledge &&
        (img.maxHeight !== "none" ||
          Math.abs(img.width / img.height - img.naturalWidth / img.naturalHeight) > 0.01)
      )
        failures.push(`${width}/${entry.id}: compressed chart ${img.src}`)
    }
    for (const table of geometry.tables)
      if (table.scrollWidth > table.width + 1 && !["auto", "scroll"].includes(table.overflow))
        failures.push(`${width}/${entry.id}: inaccessible wide table`)
    if (/^chapter-(0[1-9]|1[01])$/.test(entry.id) && geometry.answerCount !== 2)
      failures.push(`${entry.id}: expected two answer callouts, got ${geometry.answerCount}`)
    const answer = page
      .locator('.center > article .callout[data-callout="answer"] .callout-title')
      .first()
    if (await answer.count()) {
      await answer.click()
      const answerState = await answer.locator("..").getAttribute("class")
      if (answerState.includes("is-collapsed"))
        failures.push(`${width}/${entry.id}: answer failed to expand`)
    }
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({ path: path.join(out, `${width}-${entry.id}.png`) })
    if (width === 390 && entry.id !== "home") {
      await page.locator(".book-pagination").scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(out, `footer-${entry.id}.png`) })
    }
    records.push({ viewport: width, id: entry.id, ...geometry })
  }
  await context.close()
}
await browser.close()
await fs.writeFile(
  path.join(out, "coverage.json"),
  JSON.stringify({ records, failures }, null, 2) + "\n",
)
console.log(
  JSON.stringify(
    { pageViewports: records.length, distinctPages: entries.length, failures },
    null,
    2,
  ),
)
if (failures.length) process.exitCode = 1
