import { jsx, jsxs } from "preact/jsx-runtime"

function chapterProgress(slug) {
  if (slug === "index") return "完整目录"
  if (slug === "preface") return "前言 · 全书导读"
  const match = /^chapter-(\d{2})$/.exec(slug ?? "")
  if (match?.[1] === "00") return "序章 · 全书导读"
  return match ? `第 ${Number(match[1])} / 11 章` : "在线修订稿"
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
    ],
  })
}

BookToolbarComponent.css = `
.book-toolbar{position:fixed;z-index:50;top:0;left:0;right:0;height:66px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 5vw;color:var(--tea-deep);background:rgba(247,241,228,.92);border-bottom:1px solid var(--line);font-family:"Noto Sans SC","PingFang SC",sans-serif;backdrop-filter:blur(14px)}.book-toolbar__brand{display:flex;align-items:center;gap:12px;min-width:0}.book-toolbar__leaf{width:32px;height:32px;display:grid;flex:0 0 32px;place-items:center;color:#fff;background:var(--tea);border-radius:50% 50% 50% 12%;transform:rotate(-8deg);font-weight:700;font-size:15px;line-height:1}.book-toolbar__home{overflow:hidden;color:var(--tea-deep);font-size:14px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.book-toolbar__home:hover{color:var(--tea)}.book-toolbar__chapter{margin-right:112px;color:var(--muted);font-size:11px}.reading-progress{position:fixed;z-index:1000;inset:0 0 auto;height:3px;background:transparent}.reading-progress span{display:block;width:0;height:100%;background:var(--gold);transition:width 80ms linear}@media(max-width:800px){.book-toolbar{padding:0 18px}.book-toolbar__home{display:none}.book-toolbar__chapter{display:none}}
`

BookToolbarComponent.afterDOMLoaded = `
(()=>{const progress=()=>{const current=scrollY;const available=document.documentElement.scrollHeight-innerHeight;const percent=available<=0?0:Math.min(100,Math.max(0,current/available*100));document.documentElement.style.setProperty("--reading-progress",percent*3.6+"deg");document.querySelectorAll(".reading-progress span").forEach(bar=>{bar.style.width=percent+"%"});document.querySelectorAll(".book-reading-meter__ring").forEach(ring=>{ring.textContent=Math.round(percent)+"%"})};const polishExplorer=()=>{const list=document.querySelector(".explorer-ul");if(!list)return;const labels={index:"完整目录",preface:"前言 · 老板开价80万，这家店你买吗？","chapter-00":"序章 · 如果我真的要买下一家奶茶店"};const items=[...list.querySelectorAll(":scope > li:has(a.nav-file-title)")];const slugOf=item=>{const path=new URL(item.querySelector("a").href,location.href).pathname;return path.split("/").filter(Boolean).at(-1)||"index"};const rank=slug=>slug==="index"?0:slug==="preface"?1:/^chapter-(\\d{2})$/.test(slug)?Number(slug.slice(-2))+2:999;for(const item of items){const link=item.querySelector("a");const slug=slugOf(item);let desired=labels[slug];if(!desired&&/^chapter-(\\d{2})$/.test(slug)){const prefix=slug.slice(-2)+" · ";desired=prefix+link.textContent.replace(/^(?:\\d{2} · )+/,"").replace(/^第.+?章[：:]?\\s*/,"")}if(desired&&link.textContent!==desired)link.textContent=desired}const sorted=[...items].sort((a,b)=>rank(slugOf(a))-rank(slugOf(b)));if(sorted.some((item,index)=>item!==items[index])){const end=list.querySelector(".overflow-end");for(const item of sorted)list.insertBefore(item,end);const active=list.querySelector("a.active");if(active)list.scrollTop=Math.max(0,active.parentElement.offsetTop-list.clientHeight/3)}};if(!window.__qingheBookBound){window.__qingheBookBound=true;addEventListener("scroll",progress,{passive:true});document.addEventListener("nav",()=>{progress();setTimeout(polishExplorer)});const explorer=document.querySelector(".explorer-ul");if(explorer)new MutationObserver(polishExplorer).observe(explorer,{childList:true})}progress();setTimeout(polishExplorer)})()
`

export const BookToolbar = () => BookToolbarComponent
