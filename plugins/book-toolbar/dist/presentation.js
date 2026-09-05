import manifest from "../../../book.manifest.json" with { type: "json" }

const element = (tagName, properties, children) => ({
  type: "element",
  tagName,
  properties,
  children,
})
const text = (value) => ({ type: "text", value })
const contentText = (node) =>
  node.type === "text" ? node.value : (node.children ?? []).map(contentText).join("")
const hasClass = (node, name) => node.properties?.className?.includes(name)
const find = (node, predicate) =>
  predicate(node) ? node : node.children?.map((child) => find(child, predicate)).find(Boolean)

function markRevisionNotice(tree, book) {
  const firstHeading = tree.children.findIndex((node) => node.tagName === "h1")
  const notice = tree.children.slice(firstHeading + 1).find((node) => node.type === "element")
  const title = notice && find(notice, (node) => hasClass(node, "callout-title-inner"))
  if (
    notice?.properties?.dataCallout === "warning" &&
    contentText(title ?? notice).trim() === book.revisionNotice
  ) {
    notice.properties.className = [...(notice.properties.className ?? []), "book-revision-notice"]
  }
}

function chapterSlug(heading) {
  if (heading.tagName !== "h2") return null
  const link = find(
    heading,
    (node) => node.tagName === "a" && node.properties?.href && node.properties?.role !== "anchor",
  )
  return link?.properties.href.replace(/^(?:\.\/|\/)/, "").replace(/(?:\.html)?(?:#.*)?$/, "")
}

/** Rearrange existing HAST nodes, so prose, links, images and anchor IDs survive intact. */
export function presentBook(tree, slug, book = manifest) {
  if (tree.children.some((node) => hasClass(node, "book-home"))) return
  markRevisionNotice(tree, book)
  if (slug !== "index") return

  const entries = book.entries.filter(
    (entry) => entry.status === "published" && entry.id !== "home",
  )
  const bySlug = new Map(entries.map((entry) => [entry.url.slice(1), entry]))
  const records = new Map()
  const partNotes = new Map()
  const introduction = []
  let current = null
  let pendingPart = []
  for (const node of tree.children) {
    const entry = bySlug.get(chapterSlug(node))
    if (entry) {
      if (records.has(entry.id)) throw new Error(`首页目录重复章节：${entry.id}`)
      current = { heading: node, body: [] }
      records.set(entry.id, current)
      if (pendingPart.length) {
        partNotes.set(entry.part, [...(partNotes.get(entry.part) ?? []), ...pendingPart])
        pendingPart = []
      }
    } else if (current && node.tagName === "h1") {
      node.tagName = "p"
      node.properties.className = [...(node.properties.className ?? []), "book-part-description"]
      pendingPart.push(node)
    } else if (pendingPart.length) {
      pendingPart.push(node)
    } else if (current) {
      current.body.push(node)
    } else {
      introduction.push(node)
    }
  }
  for (const entry of entries) {
    if (!records.has(entry.id)) throw new Error(`首页目录缺少公开章节：${entry.id}`)
  }

  const title = introduction.find((node) => node.tagName === "h1")
  const subtitle = introduction.find(
    (node) => node.tagName === "blockquote" && !hasClass(node, "callout"),
  )
  const coverIndex = introduction.findIndex((node) =>
    find(node, (child) => child.tagName === "img"),
  )
  if (!title || !subtitle || coverIndex === -1) throw new Error("首页缺少书名、副标题或封面")
  const cover = introduction[coverIndex]
  const caption = introduction.slice(coverIndex + 1).find((node) => node.type === "element")
  const coverCaption =
    caption?.tagName === "p" && caption.children.some((node) => node.tagName === "em")
      ? caption
      : null
  const notice = introduction.find((node) => hasClass(node, "book-revision-notice"))
  subtitle.tagName = "div"
  subtitle.properties.className = ["book-home-subtitle"]
  const used = new Set([title, subtitle, cover, coverCaption, notice])
  const remaining = introduction.filter((node) => !used.has(node))
  const groups = new Map()
  for (const entry of entries) {
    if (!groups.has(entry.part)) groups.set(entry.part, [])
    const record = records.get(entry.id)
    record.heading.tagName = "h3"
    groups
      .get(entry.part)
      .push(
        element("div", { className: ["book-directory-item"] }, [
          record.heading,
          element("details", { className: ["book-outline"] }, [
            element("summary", { ariaLabel: `${entry.label}：本章纲要` }, [text("本章纲要")]),
            element("div", { className: ["book-outline-body"] }, record.body),
          ]),
        ]),
      )
  }
  const firstPage = entries.find((entry) => entry.id === "preface") ?? entries[0]
  const startLabel = firstPage.id === "preface" ? "从前言开始" : "开始阅读"
  const hero = element("section", { className: ["book-home-hero"], ariaLabel: "本书导读" }, [
    element("div", { className: ["book-home-copy"] }, [
      element("p", { className: ["book-home-eyebrow"] }, [text("青禾茶铺 · 投资入门")]),
      title,
      subtitle,
      element("nav", { className: ["book-home-actions"], ariaLabel: "开始阅读" }, [
        element("a", { href: `.${firstPage.url}`, className: ["book-start-reading"] }, [
          text(startLabel),
        ]),
        element("a", { href: "#book-directory", className: ["book-browse-directory"] }, [
          text("浏览目录"),
        ]),
      ]),
    ]),
    element("figure", { className: ["book-home-cover"] }, [
      cover,
      ...(coverCaption ? [element("figcaption", {}, coverCaption.children)] : []),
    ]),
  ])
  const directory = element(
    "section",
    { id: "book-directory", className: ["book-directory"], ariaLabel: "全书目录" },
    [
      element("h2", {}, [text("全书目录")]),
      ...[...groups].map(([part, chapters], index) =>
        element("section", { className: ["book-directory-part"], ariaLabel: part }, [
          element("div", { className: ["book-part-heading"] }, [
            element("span", { className: ["book-part-number"], ariaHidden: "true" }, [
              text(String(index + 1).padStart(2, "0")),
            ]),
            element("h2", {}, [text(part)]),
          ]),
          ...(partNotes.get(part) ?? []),
          ...chapters,
        ]),
      ),
      ...pendingPart,
    ],
  )
  tree.children = [
    element("div", { className: ["book-home"] }, [
      hero,
      element("div", { className: ["book-home-introduction"] }, [
        ...(notice ? [notice] : []),
        ...remaining,
      ]),
      directory,
    ]),
  ]
}

export const BookPresentation = () => ({
  name: "BookPresentation",
  htmlPlugins() {
    return [() => (tree, file) => presentBook(tree, file.data.slug)]
  },
})
