import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { commentPath } from "../src/paths.js"
import { createCommentSession } from "../src/lifecycle.js"
import { readingProgress } from "../../book-toolbar/dist/reading-progress.js"

const manifest = JSON.parse(await readFile(new URL("../../../book.manifest.json", import.meta.url)))
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test("only the 13 published reading pages have unique namespaced comment keys", () => {
  const paths = manifest.entries
    .map((entry) => commentPath(manifest.entries, entry.output?.replace(/\.md$/, "")))
    .filter(Boolean)
  assert.equal(paths.length, 13)
  assert.equal(new Set(paths).size, 13)
  assert.equal(commentPath(manifest.entries, "chapter-01"), "/qinghe-book/chapter-01")
  for (const slug of ["index", "404", "conclusion", "appendix-a", "chapter-12"]) {
    assert.equal(commentPath(manifest.entries, slug), null)
  }
})

test("keys follow manifest IDs, independently of titles and public URLs", () => {
  const renamed = [
    { id: "chapter-01", status: "published", output: "new-title.md", url: "/new-url" },
  ]
  assert.equal(commentPath(renamed, "new-title"), "/qinghe-book/chapter-01")
  assert.equal(commentPath(renamed, "new-title", "/another-book/"), "/another-book/chapter-01")
  assert.equal(commentPath([{ ...renamed[0], status: "coming-soon" }], "new-title"), null)
})

test("a slow library load cannot mount the departed chapter", async () => {
  const library = deferred()
  const mounted = []
  const oldPage = createCommentSession(
    () => library.promise,
    () => mounted.push("chapter-01"),
    assert.fail,
  )
  const newPage = createCommentSession(
    () => library.promise,
    () => mounted.push("chapter-02"),
    assert.fail,
  )
  const oldLoad = oldPage.start()
  oldPage.dispose()
  const newLoad = newPage.start()
  library.resolve({})
  await Promise.all([oldLoad, newLoad])
  assert.deepEqual(mounted, ["chapter-02"])
})

test("loading and mounted sessions deduplicate starts and dispose exactly once", async () => {
  const library = deferred()
  let mounts = 0,
    cleanups = 0
  const page = createCommentSession(
    () => library.promise,
    () => {
      mounts++
      return () => cleanups++
    },
    assert.fail,
  )
  const loading = page.start()
  await page.start()
  library.resolve({})
  await loading
  await page.start()
  page.dispose()
  page.dispose()
  assert.equal(mounts, 1)
  assert.equal(cleanups, 1)
})

test("failed loads can retry, and failures after leaving the page are ignored", async () => {
  let errors = 0,
    mounts = 0,
    attempts = 0
  const page = createCommentSession(
    async () => {
      if (++attempts === 1) throw new Error("offline")
      return {}
    },
    () => {
      mounts++
      return () => {}
    },
    () => errors++,
  )
  await page.start()
  await page.start()
  assert.equal(errors, 1)
  assert.equal(mounts, 1)
  const delayed = deferred()
  const abandoned = createCommentSession(
    () => delayed.promise,
    assert.fail,
    () => errors++,
  )
  const loading = abandoned.start()
  abandoned.dispose()
  delayed.reject(new Error("offline"))
  await loading
  assert.equal(errors, 1)
})

test("reading progress ends at the article, including short pages and scroll boundaries", () => {
  assert.equal(readingProgress(500, 2000, 1000), 50)
  assert.equal(readingProgress(1000, 2000, 1000), 100)
  assert.equal(readingProgress(3500, 2000, 1000), 100)
  assert.equal(readingProgress(-100, 2000, 1000), 0)
  assert.equal(readingProgress(0, 600, 1000), 100)
})
