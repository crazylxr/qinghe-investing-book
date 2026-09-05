import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath, pathToFileURL } from "node:url"
import YAML from "yaml"
import sharp from "sharp"

const defaultProjectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function normalizeTarget(target) {
  return path.posix.basename(target.split("#", 1)[0].replaceAll("\\", "/")).replace(/\.md$/i, "")
}

function splitFrontmatter(markdown, sourceName) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) throw new Error(`${sourceName} 缺少 YAML frontmatter`)
  return { data: YAML.parse(match[1]) ?? {}, body: markdown.slice(match[0].length) }
}

function injectRevisionNotice(body, notice) {
  const match = body.match(/^#\s+.+$/m)
  const insertionPoint = match ? match.index + match[0].length : 0
  const banner = `\n\n> [!warning] ${notice}\n> 本站公开的是可完整阅读的修订稿，概念、案例与数据表达仍会继续校订。\n`
  return insertionPoint === 0
    ? `${banner.trimStart()}\n${body}`
    : `${body.slice(0, insertionPoint)}${banner}${body.slice(insertionPoint).replace(/^\s+/, "\n\n")}`
}

function removeSourceNavigation(body) {
  return body
    .split(/\r?\n/)
    .filter((line) => !/^(?:上一[章节页]|下一[章节页]|返回)[：:]/.test(line.trim()))
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

export function buildNavigation(entry, published) {
  if (entry.id === "home") return ""
  const index = published.findIndex((candidate) => candidate.id === entry.id)
  const previous = published[index - 1]
  const next = published[index + 1]
  const previousLink = previous
    ? `<a href="${publicHref(previous)}">← ${escapeHtml(previous.label)}</a>`
    : ""
  const nextLink = next
    ? `<a href="${publicHref(next)}">${escapeHtml(next.label)} →</a>`
    : '<a href="./">全书读毕 · 回到目录 →</a>'
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

export async function syncBook({ sourceRoot, projectRoot = defaultProjectRoot, attachmentRoot }) {
  const manifest = JSON.parse(
    await fs.readFile(path.join(projectRoot, "book.manifest.json"), "utf8"),
  )
  const published = manifest.entries.filter((entry) => entry.status === "published")
  const contentRoot = path.join(projectRoot, "content")
  if (!published.length) throw new Error("manifest 没有公开页")
  for (const field of ["id", "source", "output", "url"]) {
    if (new Set(published.map((entry) => entry[field])).size !== published.length)
      throw new Error(`manifest ${field} 缺失或重复`)
  }
  for (const entry of published) {
    if (
      !entry.source ||
      !entry.output ||
      path.basename(entry.source) !== entry.source ||
      path.basename(entry.output) !== entry.output
    )
      throw new Error(`非法正文路径：${entry.id}`)
    if (entry.output !== (entry.url === "/" ? "index.md" : `${entry.url.slice(1)}.md`))
      throw new Error(`输出与 URL 不一致：${entry.id}`)
  }
  const attachments = attachmentRoot ?? (await locateAttachmentRoot(sourceRoot))
  const sourceMap = new Map(published.map((entry) => [path.basename(entry.source, ".md"), entry]))
  const comingSoon = new Map(
    manifest.entries
      .filter((entry) => entry.status === "coming-soon" && entry.source)
      .map((entry) => [normalizeTarget(entry.source), entry]),
  )
  const privatePatterns = [
    /青禾茶铺设定与数据圣经/,
    /术语归属与口径/,
    /案例核验/,
    /财务模型\.xlsx/i,
    /从营收到自由现金流/,
    /假如你开一家奶茶店/,
  ]
  const referencedImages = new Map()
  const outputs = new Map()

  // Prepare every source and resource before touching the previous snapshot.
  for (const [order, entry] of published.entries()) {
    const raw = await fs.readFile(path.join(sourceRoot, entry.source), "utf8")
    const { data, body: originalBody } = splitFrontmatter(raw, entry.source)
    delete data.source_notes
    delete data.permalink
    data.title ??= entry.label
    data.status = "draft"
    data.draft = false
    data.bookOrder = order
    data.bookPart = entry.part
    data.description = data.subtitle ?? `${entry.label}｜《${manifest.title}》在线修订稿`
    let body = removeSourceNavigation(originalBody)
    body = body.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, display) => {
      const filename = path.posix.basename(target.replaceAll("\\", "/"))
      const alt = (display ?? filename.replace(/\.[^.]+$/, "")).trim()
      if (!alt) throw new Error(`${entry.source} 图片缺少替代文本：${filename}`)
      if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(filename))
        throw new Error(`不支持的嵌入资源：${filename}`)
      referencedImages.set(filename, alt)
      const knowledge = /^(?:0[89]|1\d|20)-/.test(filename)
      return knowledge
        ? `<img class="book-knowledge-figure" src="assets/${encodeURI(filename)}" alt="${escapeHtml(alt)}" loading="lazy" />`
        : `![${alt}](assets/${encodeURI(filename)})`
    })
    body = body.replace(
      /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
      (_match, target, label) => {
        const normalized = normalizeTarget(target.trim())
        const display = (label ?? normalized).trim()
        const publicEntry = sourceMap.get(normalized)
        if (publicEntry) return `[${display}](${publicHref(publicEntry)})`
        const pending = comingSoon.get(normalized)
        if (pending) return `${pending.label}（即将补充）`
        if (privatePatterns.some((pattern) => pattern.test(normalized))) {
          if (/案例核验/.test(normalized)) return "作者核验底稿（不公开）"
          if (/财务模型/.test(normalized)) return "配套教学模型（作者底稿）"
          return "全书统一资料口径（作者底稿）"
        }
        throw new Error(`${entry.source} 引用了未映射的页面：${normalized}`)
      },
    )
    body =
      injectRevisionNotice(body.trim(), manifest.revisionNotice) + buildNavigation(entry, published)
    outputs.set(
      entry.output,
      `---\n${YAML.stringify(data, { lineWidth: 0 }).trimEnd()}\n---\n\n${body.trim()}\n`,
    )
  }
  const imageBuffers = new Map()
  for (const filename of referencedImages.keys()) {
    imageBuffers.set(filename, await fs.readFile(path.join(attachments, filename)))
  }
  for (const [filename, buffer] of imageBuffers) {
    const { width, height } = await sharp(buffer).metadata()
    if (!width || !height) throw new Error(`无法读取图片尺寸：${filename}`)
    const src = `src="assets/${encodeURI(filename)}"`
    for (const [name, body] of outputs)
      outputs.set(name, body.replaceAll(src, `${src} width="${width}" height="${height}"`))
  }
  const snapshot = {
    generatedAt: new Date().toISOString(),
    pageCount: published.length,
    imageCount: referencedImages.size,
    sourceFiles: published.map((entry) => entry.source),
    imageFiles: [...referencedImages.keys()].sort(),
  }
  const stage = await fs.mkdtemp(path.join(projectRoot, ".book-stage-"))
  try {
    await fs.mkdir(path.join(stage, "assets"))
    for (const [name, body] of outputs) await fs.writeFile(path.join(stage, name), body)
    for (const [name, buffer] of imageBuffers)
      await fs.writeFile(path.join(stage, "assets", name), buffer)
    await fs.writeFile(
      path.join(stage, "book.snapshot.json"),
      `${JSON.stringify(snapshot, null, 2)}\n`,
    )
    await fs.mkdir(contentRoot, { recursive: true })
    // Remove only files belonging to the previous generated snapshot.
    const expectedOutputs = new Set(outputs.keys())
    // Existing book pages use these stable names. Other content is not owned by this sync.
    for (const entry of manifest.entries) {
      if (
        entry.output &&
        !expectedOutputs.has(entry.output) &&
        path.basename(entry.output) === entry.output
      )
        await fs.rm(path.join(contentRoot, entry.output), { force: true })
    }
    for (const name of outputs.keys())
      await fs.rename(path.join(stage, name), path.join(contentRoot, name))
    await fs.rm(path.join(contentRoot, "assets"), { recursive: true, force: true })
    await fs.rename(path.join(stage, "assets"), path.join(contentRoot, "assets"))
    await fs.rename(
      path.join(stage, "book.snapshot.json"),
      path.join(contentRoot, "book.snapshot.json"),
    )
    await fs.rm(path.join(contentRoot, ".gitkeep"), { force: true })
  } finally {
    await fs.rm(stage, { recursive: true, force: true })
  }
  return snapshot
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const index = process.argv.indexOf("--source")
  const sourceRoot = index === -1 ? undefined : process.argv[index + 1]
  if (!sourceRoot) {
    console.error('用法：npm run sync:book -- --source "/path/to/书稿目录"')
    process.exitCode = 1
  } else {
    syncBook({ sourceRoot: path.resolve(sourceRoot) })
      .then((snapshot) =>
        console.log(`已同步 ${snapshot.pageCount} 篇正文和 ${snapshot.imageCount} 张插图。`),
      )
      .catch((error) => {
        console.error(error.message)
        process.exitCode = 1
      })
  }
}
