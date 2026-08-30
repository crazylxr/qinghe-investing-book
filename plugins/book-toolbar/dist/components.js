import { jsx, jsxs } from "preact/jsx-runtime"

function chapterProgress(slug) {
  if (slug === "index") return "完整目录"
  if (slug === "preface") return "前言 · 全书导读"
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
              children: "小屏幕会自动使用单栏正文；专注模式同时隐藏目录与搜索。",
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

BookToolbarComponent.css = `
.book-toolbar{position:fixed;z-index:50;top:0;left:0;right:0;height:66px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 5vw;color:var(--tea-deep);background:rgba(247,241,228,.92);border-bottom:1px solid var(--line);font-family:"Noto Sans SC","PingFang SC",sans-serif;backdrop-filter:blur(14px)}.book-toolbar__brand{display:flex;align-items:center;gap:12px;min-width:0}.book-toolbar__leaf{width:32px;height:32px;display:grid;flex:0 0 32px;place-items:center;color:#fff;background:var(--tea);border-radius:50% 50% 50% 12%;transform:rotate(-8deg);font-weight:700;font-size:15px;line-height:1}.book-toolbar__home{overflow:hidden;color:var(--tea-deep);font-size:14px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.book-toolbar__home:hover{color:var(--tea)}.book-toolbar__chapter{margin-right:112px;color:var(--muted);font-size:11px}.reading-progress{position:fixed;z-index:1000;inset:0 0 auto;height:3px;background:transparent}.reading-progress span{display:block;width:0;height:100%;background:var(--gold);transition:width 80ms linear}
.reading-layout-control{position:fixed;z-index:80;top:13px;left:50%;font-family:"Noto Sans SC","PingFang SC",sans-serif;transform:translateX(-50%)}.reading-layout-control__trigger{display:none}.reading-layout-control__panel{display:block}.reading-layout-control__options{display:flex;gap:2px;padding:3px;background:rgba(35,75,66,.08);border:1px solid rgba(35,75,66,.12);border-radius:999px}.reading-layout-control__option{display:flex;min-width:64px;height:34px;align-items:center;justify-content:center;gap:5px;padding:0 11px;color:var(--muted);background:transparent;border:0;border-radius:999px;font:600 11px/1 "Noto Sans SC","PingFang SC",sans-serif;cursor:pointer}.reading-layout-control__option[aria-pressed="true"]{color:#fff;background:var(--tea-deep);box-shadow:0 4px 12px rgba(35,75,66,.2)}.reading-layout-control__icon{font-size:14px}.reading-layout-control__copy small,.reading-layout-control__mobile-note{display:none}.reading-layout-control__option:focus-visible,.reading-layout-control__trigger:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
@media(max-width:800px){.book-toolbar{padding:0 18px}.book-toolbar__home,.book-toolbar__chapter{display:none}.reading-layout-control{top:14px;right:154px;left:auto;transform:none}.reading-layout-control__trigger{display:grid;width:42px;height:38px;place-items:center;padding:0;color:var(--tea-deep);background:rgba(255,255,255,.55);border:1px solid var(--line);border-radius:999px;font:700 10px/1 "Noto Sans SC","PingFang SC",sans-serif;cursor:pointer}.reading-layout-control__panel{position:fixed;z-index:90;top:60px;right:18px;display:none;width:236px;box-sizing:border-box;padding:12px;background:rgba(255,253,247,.98);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 50px rgba(35,75,66,.2)}.reading-layout-control[data-layout-open="true"] .reading-layout-control__panel{display:block}.reading-layout-control__options{flex-direction:column;gap:5px;padding:0;background:transparent;border:0;border-radius:0}.reading-layout-control__option{width:100%;height:44px;justify-content:flex-start;gap:8px;padding:0 12px;border-radius:9px;text-align:left}.reading-layout-control__copy{display:flex;flex-direction:column;gap:3px}.reading-layout-control__copy small{display:block;color:var(--muted);font-size:9px;font-weight:400}.reading-layout-control__option[aria-pressed="true"] .reading-layout-control__copy small{color:#d7e4df}.reading-layout-control__mobile-note{display:block;margin:5px 8px 0;color:var(--muted);font-size:9px;line-height:1.5}}
`

BookToolbarComponent.afterDOMLoaded = `
(()=>{const layouts=[{key:"three",name:"三栏"},{key:"two",name:"两栏"},{key:"focus",name:"专注"}];const storageKey="qinghe-reading-layout";let activeLayout="two";const progress=()=>{const current=scrollY;const available=document.documentElement.scrollHeight-innerHeight;const percent=available<=0?0:Math.min(100,Math.max(0,current/available*100));document.documentElement.style.setProperty("--reading-progress",percent*3.6+"deg");document.querySelectorAll(".reading-progress span").forEach(bar=>{bar.style.width=percent+"%"});document.querySelectorAll(".book-reading-meter__ring").forEach(ring=>{ring.textContent=Math.round(percent)+"%"})};const polishExplorer=()=>{const list=document.querySelector(".explorer-ul");if(!list)return;const labels={index:"完整目录",preface:"前言 · 老板开价80万，这家店你买吗？","chapter-00":"序章 · 如果我真的要买下一家奶茶店"};const items=[...list.querySelectorAll(":scope > li:has(a.nav-file-title)")];const slugOf=item=>{const path=new URL(item.querySelector("a").href,location.href).pathname;return path.split("/").filter(Boolean).at(-1)||"index"};const rank=slug=>slug==="index"?0:slug==="preface"?1:/^chapter-(\\d{2})$/.test(slug)?Number(slug.slice(-2))+2:999;for(const item of items){const link=item.querySelector("a");const slug=slugOf(item);let desired=labels[slug];if(!desired&&/^chapter-(\\d{2})$/.test(slug)){const prefix=slug.slice(-2)+" · ";desired=prefix+link.textContent.replace(/^(?:\\d{2} · )+/,"").replace(/^第.+?章[：:]?\\s*/,"")}if(desired&&link.textContent!==desired)link.textContent=desired}const sorted=[...items].sort((a,b)=>rank(slugOf(a))-rank(slugOf(b)));if(sorted.some((item,index)=>item!==items[index])){const end=list.querySelector(".overflow-end");for(const item of sorted)list.insertBefore(item,end);const active=list.querySelector("a.active");if(active)list.scrollTop=Math.max(0,active.parentElement.offsetTop-list.clientHeight/3)}};const closeControl=()=>{document.querySelectorAll(".reading-layout-control").forEach(control=>{control.dataset.layoutOpen="false";control.querySelector("[data-layout-trigger]")?.setAttribute("aria-expanded","false")})};const mountControl=()=>{const controls=[...document.querySelectorAll(".reading-layout-control")];const current=controls.at(-1);for(const stale of controls.slice(0,-1))stale.remove();if(current&&current.parentElement!==document.body)document.body.append(current);return current};const readStoredLayout=()=>{try{return localStorage.getItem(storageKey)}catch{return null}};const storeLayout=key=>{try{localStorage.setItem(storageKey,key)}catch{}};const collapseMobileExplorer=()=>{document.querySelectorAll(".explorer").forEach(explorer=>{explorer.classList.add("collapsed");explorer.setAttribute("aria-expanded","false")});document.documentElement.classList.remove("mobile-no-scroll")};const applyLayout=(key,{persist=false}={})=>{const selected=layouts.find(layout=>layout.key===key)??layouts[0];activeLayout=selected.key;document.documentElement.dataset.readingLayout=selected.key;if(selected.key==="focus")collapseMobileExplorer();document.querySelectorAll("[data-layout-choice]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.layoutChoice===selected.key)));document.querySelectorAll("[data-layout-trigger]").forEach(button=>button.setAttribute("aria-label","选择阅读布局，当前"+selected.name));closeControl();if(persist)storeLayout(selected.key)};const syncLayout=()=>{mountControl();const stored=readStoredLayout();applyLayout(layouts.some(layout=>layout.key===stored)?stored:activeLayout)};if(!window.__qingheBookBound){window.__qingheBookBound=true;addEventListener("scroll",progress,{passive:true});document.addEventListener("click",event=>{const layoutButton=event.target.closest("[data-layout-choice]");if(layoutButton){applyLayout(layoutButton.dataset.layoutChoice,{persist:true});return}const trigger=event.target.closest("[data-layout-trigger]");if(trigger){const control=trigger.closest(".reading-layout-control");const open=control.dataset.layoutOpen!=="true";closeControl();control.dataset.layoutOpen=String(open);trigger.setAttribute("aria-expanded",String(open));return}if(!event.target.closest(".reading-layout-control"))closeControl()});document.addEventListener("keydown",event=>{if(event.key==="Escape")closeControl()});document.addEventListener("nav",()=>{progress();setTimeout(polishExplorer);setTimeout(syncLayout)});const explorer=document.querySelector(".explorer-ul");if(explorer)new MutationObserver(polishExplorer).observe(explorer,{childList:true})}progress();setTimeout(polishExplorer);syncLayout()})()
`

export const BookToolbar = () => BookToolbarComponent
