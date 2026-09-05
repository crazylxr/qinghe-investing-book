import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { VFile } from "vfile"
import { fromHtml } from "hast-util-from-html"
import { ObsidianFlavoredMarkdown } from "@quartz-community/obsidian-flavored-markdown"
import { GitHubFlavoredMarkdown } from "@quartz-community/github-flavored-markdown"
import { presentBook } from "../plugins/book-toolbar/dist/presentation.js"
import manifest from "../book.manifest.json" with { type: "json" }

const walk = (node) => [node, ...(node.children ?? []).flatMap(walk)]
const elements = (tree, tag) => walk(tree).filter((node) => node.tagName === tag)
const hasClass = (node, name) => node.properties?.className?.includes(name)
const textNodes = (tree) =>
  walk(tree)
    .filter((node) => node.type === "text" && node.value.trim())
    .map((node) => node.value.trim())

async function homeTree() {
  const markdown = (
    await fs.readFile(new URL("../content/index.md", import.meta.url), "utf8")
  ).replace(/^---\n[\s\S]*?\n---\n/, "")
  const plugins = [ObsidianFlavoredMarkdown(), GitHubFlavoredMarkdown()]
  const processor = unified()
    .use(remarkParse)
    .use(plugins.flatMap((plugin) => plugin.markdownPlugins?.({}) ?? []))
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(plugins.flatMap((plugin) => plugin.htmlPlugins?.({}) ?? []))
  const file = new VFile({ value: markdown, data: { slug: "index", frontmatter: {} } })
  return processor.run(processor.parse(file), file)
}

test("real homepage preserves all prose, links, images and anchors in a static grouped directory", async () => {
  const tree = await homeTree()
  const before = structuredClone(tree)
  presentBook(tree, "index")
  const afterText = textNodes(tree)
  for (const value of new Set(textNodes(before))) {
    assert.ok(
      afterText.filter((text) => text === value).length >=
        textNodes(before).filter((text) => text === value).length,
      `lost content: ${value}`,
    )
  }
  const originalIds = walk(before).flatMap((node) =>
    node.properties?.id ? [node.properties.id] : [],
  )
  const ids = walk(tree).flatMap((node) => (node.properties?.id ? [node.properties.id] : []))
  for (const id of originalIds) assert.ok(ids.includes(id), `lost anchor: ${id}`)
  assert.equal(new Set(ids).size, ids.length, "anchor IDs remain unique")
  for (const link of elements(before, "a")) {
    assert.ok(
      elements(tree, "a").some((node) => node.properties.href === link.properties.href),
      `lost link: ${link.properties.href}`,
    )
  }
  assert.deepEqual(elements(tree, "img"), elements(before, "img"))
  const entries = manifest.entries.filter(
    (entry) => entry.status === "published" && entry.id !== "home",
  )
  const rows = walk(tree).filter((node) => hasClass(node, "book-directory-item"))
  assert.deepEqual(
    rows.map(
      (row) =>
        elements(row.children[0], "a").find((node) => node.properties.role !== "anchor").properties
          .href,
    ),
    entries.map((entry) => `.${entry.url}`),
  )
  assert.equal(elements(tree, "details").length, entries.length)
  assert.ok(elements(tree, "details").every((node) => !node.properties.open))
  assert.equal(elements(tree, "h1").length, 1)
  assert.ok(
    elements(tree, "a").some(
      (node) => hasClass(node, "book-start-reading") && node.properties.href === "./preface",
    ),
  )
  assert.ok(elements(tree, "a").some((node) => node.properties.href === "#book-directory"))
  const once = structuredClone(tree)
  presentBook(tree, "index")
  assert.deepEqual(tree, once, "repeated processing must not duplicate home content")
})

test("a missing published chapter stops the build instead of dropping content", async () => {
  const tree = await homeTree()
  assert.throws(
    () =>
      presentBook(tree, "index", {
        ...manifest,
        entries: [
          ...manifest.entries,
          { id: "missing", url: "/missing", part: "附录", status: "published" },
        ],
      }),
    /首页目录缺少公开章节：missing/,
  )
})

test("revision styling only marks the injected notice, leaving real warnings and chapter content intact", () => {
  const tree = fromHtml(
    '<h1 id="chapter">章节</h1><blockquote class="callout" data-callout="warning"><div class="callout-title"><div class="callout-title-inner">内容持续修订中</div></div><p>修订说明</p></blockquote><h2 id="risk">风险</h2><blockquote class="callout" data-callout="warning"><div class="callout-title-inner">债务风险</div><p>必须核验</p></blockquote>',
    { fragment: true },
  )
  const before = structuredClone(tree)
  presentBook(tree, "chapter-10")
  const notices = walk(tree).filter((node) => hasClass(node, "book-revision-notice"))
  assert.equal(notices.length, 1)
  assert.ok(textNodes(notices[0]).includes("内容持续修订中"))
  notices[0].properties.className = notices[0].properties.className.filter(
    (name) => name !== "book-revision-notice",
  )
  assert.deepEqual(tree, before)
})
