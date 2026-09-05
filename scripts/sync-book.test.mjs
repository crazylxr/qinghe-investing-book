import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { syncBook } from "./sync-book.mjs"
import { commentPath } from "../plugins/book-comments/src/paths.js"

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "qinghe-sync-test-"))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const sourceRoot = path.join(root, "source"),
    attachmentRoot = path.join(root, "images")
  await fs.mkdir(sourceRoot)
  await fs.mkdir(attachmentRoot)
  const entries = [
    "home",
    "chapter-11",
    "conclusion",
    "appendix-a",
    "appendix-b",
    "appendix-c",
    "appendix-d",
    "appendix-e",
  ].map((id, i) => ({
    id,
    source: `${id}.md`,
    output: id === "home" ? "index.md" : `${id}.md`,
    url: id === "home" ? "/" : `/${id}`,
    label: `页面 ${i}`,
    part: "教学",
    status: "published",
  }))
  await fs.writeFile(
    path.join(root, "book.manifest.json"),
    JSON.stringify({ title: "test", revisionNotice: "内容持续修订中", entries }),
  )
  for (const entry of entries)
    await fs.writeFile(
      path.join(sourceRoot, entry.source),
      `---\ntitle: ${entry.label}\n---\n# ${entry.label}\n\n上一页：[[home]] ｜ 返回：[[home]]\n\n[[appendix-c|估值工具箱]]\n\n![[17-测试.png|完整替代文本]]\n`,
    )
  await fs.writeFile(
    path.join(attachmentRoot, "17-测试.png"),
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  )
  return { sourceRoot, attachmentRoot, projectRoot: root, entries }
}

test("derive counts and navigate through conclusion and all appendices", async (t) => {
  const f = await fixture(t)
  const result = await syncBook(f)
  assert.equal(result.pageCount, f.entries.length)
  assert.equal(result.imageCount, 1)
  const conclusion = await fs.readFile(path.join(f.projectRoot, "content/conclusion.md"), "utf8")
  assert.match(conclusion, /href="\.\/appendix-a"/)
  assert.match(conclusion, /class="book-knowledge-figure"/)
  assert.doesNotMatch(conclusion, /上一页：|\[\[/)
  const last = await fs.readFile(path.join(f.projectRoot, "content/appendix-e.md"), "utf8")
  assert.match(last, /全书读毕 · 回到目录/)
  assert.doesNotMatch(last, /即将补充/)
})

for (const missing of ["source", "image"])
  test(`missing ${missing} leaves previous snapshot and assets intact`, async (t) => {
    const f = await fixture(t)
    await syncBook(f)
    const paths = ["index.md", "appendix-e.md", "book.snapshot.json", "assets/17-测试.png"].map(
      (p) => path.join(f.projectRoot, "content", p),
    )
    const before = await Promise.all(paths.map((p) => fs.readFile(p)))
    await fs.rm(
      missing === "source"
        ? path.join(f.sourceRoot, "appendix-e.md")
        : path.join(f.attachmentRoot, "17-测试.png"),
    )
    await assert.rejects(syncBook(f), /ENOENT/)
    const after = await Promise.all(paths.map((p) => fs.readFile(p)))
    assert.deepEqual(after, before)
  })

test("unmapped book links fail before snapshot overwrite", async (t) => {
  const f = await fixture(t)
  await syncBook(f)
  await fs.appendFile(path.join(f.sourceRoot, "appendix-e.md"), "\n[[不存在的附录]]\n")
  await assert.rejects(syncBook(f), /未映射的页面/)
})

test("new published appendices and conclusion keep existing comment scope", async (t) => {
  const f = await fixture(t)
  assert.equal(commentPath(f.entries, "chapter-11"), "/qinghe-book/chapter-11")
  for (const slug of ["home", "conclusion", "appendix-a", "appendix-e"])
    assert.equal(commentPath(f.entries, slug), null)
})
