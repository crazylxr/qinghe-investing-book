import { jsx, jsxs } from "preact/jsx-runtime"

function chapterProgress(slug) {
  if (slug === "index") return "完整目录"
  if (slug === "preface") return "阅读进度 1 / 13"
  const match = /^chapter-(\d{2})$/.exec(slug ?? "")
  return match ? `阅读进度 ${Number(match[1]) + 2} / 13` : "在线修订稿"
}

function BookToolbarComponent({ fileData }) {
  return jsxs("section", {
    class: "book-toolbar",
    "aria-label": "阅读设置",
    children: [
      jsx("div", {
        class: "reading-progress",
        "aria-hidden": "true",
        children: jsx("span", {}),
      }),
      jsxs("div", {
        class: "book-toolbar__meta",
        children: [
          jsx("a", { class: "book-toolbar__home", href: "./", children: "青禾投资课" }),
          jsx("span", { children: chapterProgress(fileData.slug) }),
        ],
      }),
      jsxs("fieldset", {
        class: "theme-switcher",
        children: [
          jsx("legend", { children: "阅读主题" }),
          jsx("button", {
            type: "button",
            "data-book-theme-choice": "paper",
            "aria-pressed": "false",
            children: "A 纸本",
          }),
          jsx("button", {
            type: "button",
            "data-book-theme-choice": "research",
            "aria-pressed": "false",
            children: "C 研究",
          }),
        ],
      }),
    ],
  })
}

BookToolbarComponent.css = `
.book-toolbar{position:relative;display:flex;align-items:center;justify-content:space-between;gap:1rem;margin:0 0 1.5rem;padding:.75rem 0;border-bottom:1px solid var(--lightgray);color:var(--darkgray);font-family:var(--bodyFont);font-size:.85rem}.book-toolbar__meta{display:flex;align-items:baseline;gap:.8rem}.book-toolbar__home{color:var(--dark);font-family:var(--headerFont);font-weight:700;letter-spacing:.04em}.theme-switcher{display:flex;gap:.35rem;margin:0;padding:0;border:0}.theme-switcher legend{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.theme-switcher button{border:1px solid var(--lightgray);border-radius:999px;padding:.32rem .7rem;background:transparent;color:var(--darkgray);cursor:pointer;font:inherit}.theme-switcher button[aria-pressed="true"]{border-color:var(--secondary);background:var(--highlight);color:var(--secondary);font-weight:700}.reading-progress{position:fixed;z-index:1000;inset:0 0 auto;height:3px;background:transparent}.reading-progress span{display:block;width:0;height:100%;background:var(--secondary);transition:width 80ms linear}@media(max-width:600px){.book-toolbar{align-items:flex-start;flex-direction:column}.book-toolbar__meta{width:100%;justify-content:space-between}}
`

BookToolbarComponent.beforeDOMLoaded = `
(()=>{const key="qinghe-book-theme";const valid=new Set(["paper","research"]);const requested=new URLSearchParams(location.search).get("theme");let saved=null;try{saved=localStorage.getItem(key)}catch{}const theme=valid.has(requested)?requested:valid.has(saved)?saved:"paper";document.documentElement.dataset.bookTheme=theme;if(valid.has(requested)){try{localStorage.setItem(key,theme)}catch{}}})()
`

BookToolbarComponent.afterDOMLoaded = `
(()=>{const key="qinghe-book-theme";const valid=new Set(["paper","research"]);const controls=()=>{const active=document.documentElement.dataset.bookTheme||"paper";document.querySelectorAll("[data-book-theme-choice]").forEach(button=>{button.setAttribute("aria-pressed",String(button.dataset.bookThemeChoice===active));if(button.dataset.bookThemeBound==="true")return;button.dataset.bookThemeBound="true";button.addEventListener("click",()=>{const choice=button.dataset.bookThemeChoice;if(!valid.has(choice))return;document.documentElement.dataset.bookTheme=choice;try{localStorage.setItem(key,choice)}catch{}const url=new URL(location.href);url.searchParams.set("theme",choice);history.replaceState({},"",url);controls()})})};const progress=()=>{const current=scrollY;const available=document.documentElement.scrollHeight-innerHeight;const percent=available<=0?0:Math.min(100,Math.max(0,current/available*100));document.querySelectorAll(".reading-progress span").forEach(bar=>{bar.style.width=percent+"%"})};if(!window.__qingheBookBound){window.__qingheBookBound=true;addEventListener("scroll",progress,{passive:true});document.addEventListener("nav",()=>{controls();progress()})}controls();progress()})()
`

export const BookToolbar = () => BookToolbarComponent
