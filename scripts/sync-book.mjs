import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import YAML from "yaml"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const manifestPath = path.join(projectRoot, "book.manifest.json")
const contentRoot = path.join(projectRoot, "content")

function getArgument(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function normalizeTarget(target) {
  const withoutHeading = target.split("#", 1)[0]
  return path.posix.basename(withoutHeading.replaceAll("\\", "/")).replace(/\.md$/i, "")
}

function splitFrontmatter(markdown, sourceName) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) throw new Error(`${sourceName} 缺少 YAML frontmatter`)
  return { data: YAML.parse(match[1]) ?? {}, body: markdown.slice(match[0].length) }
}

function findFirstHeading(body) {
  const match = body.match(/^#\s+.+$/m)
  return match ? match.index + match[0].length : 0
}

function injectRevisionNotice(body, notice) {
  const insertionPoint = findFirstHeading(body)
  const banner = `\n\n> [!warning] ${notice}\n> 本站公开的是可完整阅读的修订稿，概念、案例与数据表达仍会继续校订。\n`
  return insertionPoint === 0
    ? `${banner.trimStart()}\n${body}`
    : `${body.slice(0, insertionPoint)}${banner}${body.slice(insertionPoint).replace(/^\s+/, "\n\n")}`
}

function removeSourceNavigation(body) {
  return body
    .split(/\r?\n/)
    .filter((line) => !(line.includes("上一章：") && line.includes("返回：")))
    .join("\n")
}

function publicHref(entry) {
  return entry.url === "/" ? "./" : `./${entry.url.slice(1)}`
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function buildNavigation(entry, published) {
  if (entry.id === "home") return ""
  const index = published.findIndex((candidate) => candidate.id === entry.id)
  const previous = published[index - 1]
  const next = published[index + 1]
  const previousLink = previous
    ? `<a href="${publicHref(previous)}">← ${escapeHtml(previous.label)}</a>`
    : ""
  const nextLink = next
    ? `<a href="${publicHref(next)}">${escapeHtml(next.label)} →</a>`
    : "结语 · 即将补充"

  return `\n\n---\n\n<nav class="book-pagination" aria-label="章节导航">\n<span>${previousLink}</span>\n<a href="./">返回完整目录</a>\n<span>${nextLink}</span>\n</nav>\n`
}

async function locateAttachmentRoot(sourceRoot) {
  let cursor = sourceRoot
  while (true) {
    const candidate = path.join(cursor, "4-Obsidian", "010 附件", "用一家奶茶店学会股票投资")
    try {
      if ((await fs.stat(candidate)).isDirectory()) return candidate
    } catch {}
    const parent = path.dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }
  throw new Error("无法从 --source 向上定位书稿附件目录")
}

async function main() {
  const sourceArgument = getArgument("--source")
  if (!sourceArgument) {
    throw new Error('用法：npm run sync:book -- --source "/path/to/书稿目录"')
  }

  const sourceRoot = path.resolve(sourceArgument)
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"))
  const published = manifest.entries.filter((entry) => entry.status === "published")
  const attachmentRoot = await locateAttachmentRoot(sourceRoot)
  const sourceMap = new Map(published.map((entry) => [path.basename(entry.source, ".md"), entry]))
  const comingSoonEntries = manifest.entries.filter((entry) => entry.status === "coming-soon")
  const comingSoonTargetNames = [
    "99 结语 从买下一家店，到拥有一家公司的部分未来",
    "附录A 青禾茶铺关键数据总表",
    "附录B 投资备忘录模板",
    "附录C 常用财务指标速查",
    "附录D 估值模型使用说明",
    "附录E 全书问题清单",
  ]
  const comingSoonTargets = new Map(
    comingSoonTargetNames.map((target, index) => [target, comingSoonEntries[index]]),
  )
  const privateTargetPatterns = [
    /青禾茶铺设定与数据圣经/,
    /术语归属与口径/,
    /案例核验/,
    /财务模型\.xlsx/i,
    /从营收到自由现金流/,
    /假如你开一家奶茶店/,
  ]
  const referencedImages = new Map()

  await fs.mkdir(contentRoot, { recursive: true })
  await Promise.all(
    published.map(async (entry) => {
      await fs.rm(path.join(contentRoot, entry.output), { force: true })
    }),
  )
  await fs.rm(path.join(contentRoot, "assets"), { recursive: true, force: true })
  await fs.mkdir(path.join(contentRoot, "assets"), { recursive: true })

  for (const [order, entry] of published.entries()) {
    const sourcePath = path.join(sourceRoot, entry.source)
    const raw = await fs.readFile(sourcePath, "utf8")
    const { data, body: originalBody } = splitFrontmatter(raw, entry.source)
    delete data.source_notes
    data.title = data.title ?? entry.label
    data.status = "draft"
    data.draft = false
    delete data.permalink
    data.bookOrder = order
    data.bookPart = entry.part
    data.description = data.subtitle ?? `${entry.label}｜《${manifest.title}》在线修订稿`

    let body = removeSourceNavigation(originalBody)
    body = body.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, display) => {
      const filename = path.posix.basename(target.replaceAll("\\", "/"))
      const alt = (display ?? filename.replace(/\.[^.]+$/, "")).trim()
      referencedImages.set(filename, alt)
      return `![${alt}](assets/${encodeURI(filename)})`
    })
    body = body.replace(
      /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
      (_match, target, label) => {
        const normalized = normalizeTarget(target.trim())
        const display = (label ?? normalized).trim()
        const publicEntry = sourceMap.get(normalized)
        if (publicEntry) return `[${display}](${publicHref(publicEntry)})`
        const comingSoonEntry = comingSoonTargets.get(normalized)
        if (comingSoonEntry || /^(99 结语|附录[A-E])/.test(normalized)) {
          return `${comingSoonEntry?.label ?? display}（即将补充）`
        }
        if (privateTargetPatterns.some((pattern) => pattern.test(normalized))) {
          if (/案例核验/.test(normalized)) return "作者核验底稿（不公开）"
          if (/财务模型/.test(normalized)) return "配套教学模型（暂不公开）"
          return "全书统一资料口径（作者底稿）"
        }
        return display
      },
    )
    body = injectRevisionNotice(body.trim(), manifest.revisionNotice)
    body += buildNavigation(entry, published)

    const frontmatter = YAML.stringify(data, { lineWidth: 0 }).trimEnd()
    await fs.writeFile(
      path.join(contentRoot, entry.output),
      `---\n${frontmatter}\n---\n\n${body.trim()}\n`,
      "utf8",
    )
  }

  for (const [filename] of referencedImages) {
    await fs.copyFile(
      path.join(attachmentRoot, filename),
      path.join(contentRoot, "assets", filename),
    )
  }

  if (published.length !== 14) throw new Error(`公开正文应为14篇，实际为${published.length}篇`)
  if (referencedImages.size !== 16) {
    throw new Error(`公开插图应为16张，实际引用${referencedImages.size}张`)
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    pageCount: published.length,
    imageCount: referencedImages.size,
    sourceFiles: published.map((entry) => entry.source),
    imageFiles: [...referencedImages.keys()].sort(),
  }
  await fs.writeFile(
    path.join(contentRoot, "book.snapshot.json"),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  )
  await fs.rm(path.join(contentRoot, ".gitkeep"), { force: true })
  console.log(`已同步 ${published.length} 篇正文和 ${referencedImages.size} 张插图。`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
