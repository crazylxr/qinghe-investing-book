import { jsx, jsxs } from "preact/jsx-runtime"
import { readingProgress } from "./reading-progress.js"
import { installBookToolbar } from "./browser.js"
import manifest from "../../../book.manifest.json" with { type: "json" }

function chapterProgress(slug) {
  if (slug === "index") return "完整目录"
  if (slug === "preface") return "前言 · 全书导读"
  if (slug === "conclusion") return "结语 · 全书回顾"
  if (/^appendix-[a-e]$/.test(slug ?? "")) return `附录 ${slug.slice(-1).toUpperCase()} · 查阅工具`
  const match = /^chapter-(\d{2})$/.exec(slug ?? "")
  if (match?.[1] === "00") return "序章 · 全书导读"
  return match ? `第 ${Number(match[1])} / 11 章` : "在线修订稿"
}

const readingLayouts = [
  { key: "three", label: "三栏", icon: "▥", description: "全书目录、正文、章内目录" },
  { key: "two", label: "两栏", icon: "◫", description: "全书目录与更宽正文" },
  { key: "focus", label: "专注", icon: "▭", description: "只保留正文阅读" },
]

function ReadingLayoutControl() {
  return jsxs("div", {
    class: "reading-layout-control",
    "data-layout-open": "false",
    children: [
      jsx("button", {
        type: "button",
        class: "reading-layout-control__trigger",
        "data-layout-trigger": "",
        "aria-expanded": "false",
        "aria-label": "选择阅读布局，当前两栏",
        children: "布局",
      }),
      jsx("div", {
        class: "reading-layout-control__panel",
        role: "group",
        "aria-label": "阅读布局",
        children: jsxs("div", {
          class: "reading-layout-control__options",
          children: [
            ...readingLayouts.map((layout) =>
              jsxs("button", {
                type: "button",
                class: "reading-layout-control__option",
                "data-layout-choice": layout.key,
                "aria-pressed": layout.key === "two" ? "true" : "false",
                children: [
                  jsx("span", {
                    class: "reading-layout-control__icon",
                    "aria-hidden": "true",
                    children: layout.icon,
                  }),
                  jsxs("span", {
                    class: "reading-layout-control__copy",
                    children: [
                      jsx("strong", { children: layout.label }),
                      jsx("small", { children: layout.description }),
                    ],
                  }),
                ],
              }),
            ),
            jsx("small", {
              class: "reading-layout-control__mobile-note",
              children: "小屏幕自动使用单栏正文，目录、搜索与布局入口始终可用。",
            }),
          ],
        }),
      }),
    ],
  })
}

function BookToolbarComponent({ fileData }) {
  return jsxs("section", {
    class: "book-toolbar",
    "aria-label": "书站导航",
    children: [
      jsx("div", {
        class: "reading-progress",
        "aria-hidden": "true",
        children: jsx("span", {}),
      }),
      jsxs("div", {
        class: "book-toolbar__brand",
        children: [
          jsx("a", {
            class: "book-toolbar__leaf",
            href: "./",
            "aria-label": "返回完整目录",
            children: "叶",
          }),
          jsx("a", {
            class: "book-toolbar__home",
            href: "./",
            children: "用一家奶茶店学会股票投资",
          }),
        ],
      }),
      jsx("span", { class: "book-toolbar__chapter", children: chapterProgress(fileData.slug) }),
      jsxs("aside", {
        class: "book-reading-meter",
        "aria-label": "本页阅读进度",
        children: [
          jsx("strong", { children: "本页进度" }),
          jsx("span", { class: "book-reading-meter__ring", children: "0%" }),
          jsx("small", { children: "向下阅读，进度会自动更新。" }),
        ],
      }),
      jsx(ReadingLayoutControl, {}),
    ],
  })
}

const navigationEntries = manifest.entries
  .filter((entry) => entry.status === "published")
  .map((entry) => ({
    slug: entry.output.replace(/\.md$/, ""),
    label:
      entry.id === "home"
        ? "完整目录"
        : entry.id === "preface"
          ? "前言 · 老板开价80万，这家店你买吗？"
          : /^chapter-(0[1-9]|1[01])$/.test(entry.id)
            ? entry.id.slice(-2) + " · " + entry.label.replace(/^第.+?章[：:]?\s*/, "")
            : entry.label.replace("：", " · "),
  }))
// Explorer's initial scrollIntoView also scrolls the document. Its existing saved
// offset branch avoids that; the book client then scrolls only the directory.
BookToolbarComponent.beforeDOMLoaded = `try{if(sessionStorage.getItem("explorerScrollTop")===null)sessionStorage.setItem("explorerScrollTop","0")}catch{}`
BookToolbarComponent.afterDOMLoaded = `(${installBookToolbar.toString()})(${readingProgress.toString()},${JSON.stringify(navigationEntries)})`

export const BookToolbar = () => BookToolbarComponent
