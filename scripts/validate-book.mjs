import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const contentRoot = path.join(projectRoot, "content")
const publicRoot = path.join(projectRoot, "public")
const manifest = JSON.parse(await fs.readFile(path.join(projectRoot, "book.manifest.json"), "utf8"))
const published = manifest.entries.filter((entry) => entry.status === "published")
const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(absolute)))
    else files.push(absolute)
  }
  return files
}

const markdownPaths = published.map((entry) => path.join(contentRoot, entry.output))
const markdown = await Promise.all(markdownPaths.map((file) => fs.readFile(file, "utf8")))
const combined = markdown.join("\n")
const imageFiles = (await fs.readdir(path.join(contentRoot, "assets"))).filter((name) =>
  /\.(png|jpe?g|webp|gif|svg)$/i.test(name),
)

assert(published.length === 14, `manifest 公开页应为14篇，实际${published.length}篇`)
assert(markdown.length === 14, `内容快照应为14篇，实际${markdown.length}篇`)
assert(imageFiles.length === 16, `公开插图应为16张，实际${imageFiles.length}张`)
assert((combined.match(/内容持续修订中/g) ?? []).length === 14, "每篇公开页都应显示修订提示")
assert(/\[\^[^\]]+\]:/.test(combined), "应保留脚注")
assert(/^\|.+\|$/m.test(combined), "应保留表格")
assert(/\$\$[\s\S]+?\$\$/.test(combined), "应保留块级公式")
assert(/> \[![^\]]+\]-/.test(combined), "应保留可折叠 callout")
assert(!/!\[\]\(/.test(combined), "所有公开图片都必须有替代文本")
assert(!/\[\[[^\]]+\]\]/.test(combined), "同步快照中不应残留未处理的 Obsidian 内链")

const forbidden = [
  { pattern: /\/Users\//, label: "本机绝对路径" },
  { pattern: /资料\//, label: "资料目录" },
  { pattern: /source_notes/, label: "source_notes" },
  { pattern: /\d+\s+第[^\n|]*案例核验/, label: "案例核验文件名" },
  { pattern: /\.xlsx\b/i, label: "Excel 文件名" },
]
for (const item of forbidden) {
  assert(!item.pattern.test(combined), `公开 Markdown 出现禁止内容：${item.label}`)
}

for (const [index, entry] of published.entries()) {
  const page = markdown[index]
  assert(
    entry.output === (entry.url === "/" ? "index.md" : `${entry.url.slice(1)}.md`),
    `${entry.id} 的输出文件与稳定 URL 不一致`,
  )
  if (entry.id !== "home") {
    assert(page.includes('class="book-pagination"'), `${entry.output} 缺少章节导航`)
    assert(page.includes("返回完整目录"), `${entry.output} 缺少返回目录链接`)
  }
}

const homeMarkdown = markdown[published.findIndex((entry) => entry.id === "home")]
for (const entry of manifest.entries.filter((candidate) => candidate.status === "coming-soon")) {
  assert(
    homeMarkdown.includes(`${entry.label}（即将补充）`),
    `首页目录缺少 manifest 中的待补内容：${entry.label}`,
  )
}

try {
  const publicFiles = await walk(publicRoot)
  const readableTextFiles = publicFiles.filter((file) =>
    /\.(html|json|xml|js|css|txt)$/i.test(file),
  )
  const publicText = (
    await Promise.all(readableTextFiles.map((file) => fs.readFile(file, "utf8")))
  ).join("\n")
  for (const item of forbidden) {
    assert(!item.pattern.test(publicText), `构建产物出现禁止内容：${item.label}`)
  }
  assert(publicText.includes("一杯奶茶，是怎样变成一门生意"), "中文全文搜索索引缺少第一章")
  assert(/id="[^\"]+"/.test(publicText), "构建页面缺少目录锚点")
  assert(publicText.includes('data-book-theme-choice="paper"'), "构建页面缺少纸本主题切换")
  assert(publicText.includes('data-book-theme-choice="research"'), "构建页面缺少研究主题切换")

  for (const entry of published) {
    const htmlName = entry.id === "home" ? "index.html" : `${entry.id}.html`
    const htmlPath = path.join(publicRoot, htmlName)
    const stat = await fs.stat(htmlPath)
    assert(stat.size > 10_000, `${htmlName} 不是完整内容页或发生了重定向循环`)
  }

  for (const htmlPath of publicFiles.filter((file) => file.endsWith(".html"))) {
    const html = await fs.readFile(htmlPath, "utf8")
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
    for (const href of hrefs) {
      if (/^(?:https?:|mailto:|tel:|javascript:|#)/.test(href)) continue
      let withoutQuery = decodeURI(href.split(/[?#]/, 1)[0])
      const sitePrefix = "/qinghe-investing-book"
      if (withoutQuery.startsWith(sitePrefix)) withoutQuery = withoutQuery.slice(sitePrefix.length)
      const resolved = withoutQuery.startsWith("/")
        ? path.join(publicRoot, withoutQuery.slice(1))
        : path.resolve(path.dirname(htmlPath), withoutQuery || ".")
      const candidates = [resolved, `${resolved}.html`, path.join(resolved, "index.html")]
      const exists = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            await fs.access(candidate)
            return true
          } catch {
            return false
          }
        }),
      )
      assert(exists.some(Boolean), `${path.basename(htmlPath)} 存在断链：${href}`)
    }
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error
  console.warn("public/ 尚未生成，已跳过构建产物检查。")
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"))
  process.exitCode = 1
} else {
  console.log("书站内容与构建产物验证通过。")
}
