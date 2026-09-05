import { jsx, jsxs } from "preact/jsx-runtime"
import manifest from "../../../book.manifest.json"
import { commentPath } from "./paths.js"
import styles from "./styles.css"
export { BookCommentsAssets, BookCommentsAssets as default } from "./assets.js"

export function BookComments({ envId, pathPrefix = "/qinghe-book" }) {
  if (!envId?.startsWith("https://")) throw new Error("Book comments requires an HTTPS envId")
  if (!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(pathPrefix)) {
    throw new Error("Book comments requires a stable, non-empty pathPrefix")
  }
  const Comments = ({ fileData, cfg, ctx }) => {
    const path = commentPath(manifest.entries, fileData.slug, pathPrefix)
    if (!path) return null
    const entry = manifest.entries.find((entry) => entry.output === `${fileData.slug}.md`)
    const pageUrl = new URL(
      entry.url.replace(/^\//, ""),
      `https://${cfg.baseUrl.replace(/\/$/, "")}/`,
    ).href
    const base = ctx.argv.serve ? "" : new URL(`https://${cfg.baseUrl}`).pathname.replace(/\/$/, "")
    return jsxs("section", {
      class: "book-comments",
      "aria-labelledby": "reader-discussion-title",
      "data-comment-path": path,
      "data-env-id": envId,
      "data-page-url": pageUrl,
      "data-script-src": `${base}/static/twikoo/twikoo-1.6.44-qinghe.1.min.js`,
      children: [
        jsx("h2", { id: "reader-discussion-title", children: "读者讨论" }),
        jsx("p", {
          class: "book-comments__intro",
          children: "哪里没看懂，或发现了错误？欢迎留言。",
        }),
        jsx("p", {
          class: "book-comments__status",
          role: "status",
          "aria-live": "polite",
          children: "滚动到这里时加载讨论。",
        }),
        jsx("button", {
          class: "book-comments__retry",
          type: "button",
          hidden: true,
          children: "重新加载评论",
        }),
        jsx("div", { class: "book-comments__mount", hidden: true }),
        jsx("noscript", { children: "开启 JavaScript 后即可查看讨论和留言。" }),
      ],
    })
  }
  Comments.css = styles
  Comments.afterDOMLoaded = BOOK_COMMENTS_CLIENT
  return Comments
}
