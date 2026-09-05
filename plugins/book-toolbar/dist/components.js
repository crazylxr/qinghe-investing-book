import { jsx, jsxs } from "preact/jsx-runtime"
import { readingProgress } from "./reading-progress.js"

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

function GitHubMark() {
  return jsx("svg", {
    class: "book-github-link__mark",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    "aria-hidden": "true",
    children: jsx("path", {
      d: "M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943",
    }),
  })
}

function GitHubLink() {
  return jsxs("a", {
    class: "book-github-link",
    href: "https://github.com/crazylxr/qinghe-investing-book",
    target: "_blank",
    rel: "noopener noreferrer",
    title: "在 GitHub 查看本书源码",
    "aria-label": "在 GitHub 查看本书源码（新窗口打开）",
    children: [jsx(GitHubMark, {}), jsx("span", { children: "GitHub" })],
  })
}

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
      jsx(GitHubLink, {}),
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
.book-github-link{position:fixed;z-index:70;top:38%;right:0;display:flex;width:44px;height:118px;box-sizing:border-box;align-items:center;justify-content:center;gap:8px;color:#fff;background:var(--tea-deep);border:1px solid rgba(255,255,255,.24);border-right:0;border-radius:14px 0 0 14px;box-shadow:0 14px 34px rgba(35,75,66,.22);font:700 10px/1 "Noto Sans SC","PingFang SC",sans-serif;letter-spacing:.08em;text-decoration:none;writing-mode:vertical-rl}.book-github-link:hover{color:#fff;background:var(--tea)}.book-github-link:focus-visible{outline:3px solid var(--gold);outline-offset:3px}.book-github-link__mark{width:24px;height:24px;flex:0 0 24px;fill:currentColor;writing-mode:horizontal-tb}
@media(max-width:800px){.book-toolbar{padding:0 18px}.book-toolbar__home,.book-toolbar__chapter{display:none}.reading-layout-control{top:14px;right:154px;left:auto;transform:none}.reading-layout-control__trigger{display:grid;width:42px;height:38px;place-items:center;padding:0;color:var(--tea-deep);background:rgba(255,255,255,.55);border:1px solid var(--line);border-radius:999px;font:700 10px/1 "Noto Sans SC","PingFang SC",sans-serif;cursor:pointer}.reading-layout-control__panel{position:fixed;z-index:90;top:60px;right:18px;display:none;width:236px;box-sizing:border-box;padding:12px;background:rgba(255,253,247,.98);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 50px rgba(35,75,66,.2)}.reading-layout-control[data-layout-open="true"] .reading-layout-control__panel{display:block}.reading-layout-control__options{flex-direction:column;gap:5px;padding:0;background:transparent;border:0;border-radius:0}.reading-layout-control__option{width:100%;height:44px;justify-content:flex-start;gap:8px;padding:0 12px;border-radius:9px;text-align:left}.reading-layout-control__copy{display:flex;flex-direction:column;gap:3px}.reading-layout-control__copy small{display:block;color:var(--muted);font-size:9px;font-weight:400}.reading-layout-control__option[aria-pressed="true"] .reading-layout-control__copy small{color:#d7e4df}.reading-layout-control__mobile-note{display:block;margin:5px 8px 0;color:var(--muted);font-size:9px;line-height:1.5}}
@media(max-width:800px){.book-github-link{top:50%;right:14px;width:48px;height:48px;border:0;border-radius:50%;box-shadow:0 12px 30px rgba(35,75,66,.3);transform:translateY(-50%);writing-mode:horizontal-tb}.book-github-link>span{display:none}}
`

BookToolbarComponent.afterDOMLoaded = `
(()=>{const layouts=[{key:"three",name:"三栏"},{key:"two",name:"两栏"},{key:"focus",name:"专注"}];const storageKey="qinghe-reading-layout";let activeLayout="two";const progress=()=>{const article=document.querySelector(".center > article");const end=article?article.getBoundingClientRect().bottom+scrollY:document.documentElement.scrollHeight;const percent=(${readingProgress.toString()})(scrollY,end,innerHeight);document.documentElement.style.setProperty("--reading-progress",percent*3.6+"deg");document.querySelectorAll(".reading-progress span").forEach(bar=>{bar.style.width=percent+"%"});document.querySelectorAll(".book-reading-meter__ring").forEach(ring=>{ring.textContent=Math.round(percent)+"%"})};const polishExplorer=()=>{const list=document.querySelector(".explorer-ul");if(!list)return;const labels={index:"完整目录",preface:"前言 · 老板开价80万，这家店你买吗？","chapter-00":"序章 · 如果我真的要买下一家奶茶店",conclusion:"结语 · 从买下一家店，到拥有一家公司的部分未来","appendix-a":"附录 A · 实地尽调清单","appendix-b":"附录 B · 核心指标与口径速查","appendix-c":"附录 C · 估值工具箱","appendix-d":"附录 D · 普通框架的边界","appendix-e":"附录 E · 财务与备忘录模板"};const items=[...list.querySelectorAll(":scope > li:has(a.nav-file-title)")];const slugOf=item=>{const path=new URL(item.querySelector("a").href,location.href).pathname;return path.split("/").filter(Boolean).at(-1)||"index"};const rank=slug=>slug==="index"?0:slug==="preface"?1:/^chapter-(\\d{2})$/.test(slug)?Number(slug.slice(-2))+2:slug==="conclusion"?14:/^appendix-[a-e]$/.test(slug)?15+slug.charCodeAt(slug.length-1)-97:999;for(const item of items){const link=item.querySelector("a");const slug=slugOf(item);let desired=labels[slug];if(!desired&&/^chapter-(\\d{2})$/.test(slug)){const prefix=slug.slice(-2)+" · ";desired=prefix+link.textContent.replace(/^(?:\\d{2} · )+/,"").replace(/^第.+?章[：:]?\\s*/,"")}if(desired&&link.textContent!==desired)link.textContent=desired}const sorted=[...items].sort((a,b)=>rank(slugOf(a))-rank(slugOf(b)));if(sorted.some((item,index)=>item!==items[index])){const end=list.querySelector(".overflow-end");for(const item of sorted)list.insertBefore(item,end);const active=list.querySelector("a.active");if(active)list.scrollTop=Math.max(0,active.parentElement.offsetTop-list.clientHeight/3)}};const closeControl=()=>{document.querySelectorAll(".reading-layout-control").forEach(control=>{control.dataset.layoutOpen="false";control.querySelector("[data-layout-trigger]")?.setAttribute("aria-expanded","false")})};const mountControl=()=>{const controls=[...document.querySelectorAll(".reading-layout-control")];const current=controls.at(-1);for(const stale of controls.slice(0,-1))stale.remove();if(current&&current.parentElement!==document.body)document.body.append(current);return current};const readStoredLayout=()=>{try{return localStorage.getItem(storageKey)}catch{return null}};const storeLayout=key=>{try{localStorage.setItem(storageKey,key)}catch{}};const collapseMobileExplorer=()=>{document.querySelectorAll(".explorer").forEach(explorer=>{explorer.classList.add("collapsed");explorer.setAttribute("aria-expanded","false")});document.documentElement.classList.remove("mobile-no-scroll")};const applyLayout=(key,{persist=false}={})=>{const selected=layouts.find(layout=>layout.key===key)??layouts[0];activeLayout=selected.key;document.documentElement.dataset.readingLayout=selected.key;if(selected.key==="focus")collapseMobileExplorer();document.querySelectorAll("[data-layout-choice]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.layoutChoice===selected.key)));document.querySelectorAll("[data-layout-trigger]").forEach(button=>button.setAttribute("aria-label","选择阅读布局，当前"+selected.name));closeControl();if(persist)storeLayout(selected.key);requestAnimationFrame(progress)};const syncLayout=()=>{mountControl();const stored=readStoredLayout();applyLayout(layouts.some(layout=>layout.key===stored)?stored:activeLayout)};if(!window.__qingheBookBound){window.__qingheBookBound=true;addEventListener("scroll",progress,{passive:true});addEventListener("resize",progress);document.addEventListener("load",progress,true);document.addEventListener("click",event=>{const layoutButton=event.target.closest("[data-layout-choice]");if(layoutButton){applyLayout(layoutButton.dataset.layoutChoice,{persist:true});return}const trigger=event.target.closest("[data-layout-trigger]");if(trigger){const control=trigger.closest(".reading-layout-control");const open=control.dataset.layoutOpen!=="true";closeControl();control.dataset.layoutOpen=String(open);trigger.setAttribute("aria-expanded",String(open));return}if(!event.target.closest(".reading-layout-control"))closeControl()});document.addEventListener("keydown",event=>{if(event.key==="Escape")closeControl()});document.addEventListener("nav",()=>{progress();setTimeout(polishExplorer);setTimeout(syncLayout)});const explorer=document.querySelector(".explorer-ul");if(explorer)new MutationObserver(polishExplorer).observe(explorer,{childList:true})}progress();setTimeout(polishExplorer);syncLayout()})()
`

BookToolbarComponent.afterDOMLoaded += `
;
(()=>{const mount=()=>{const links=[...document.querySelectorAll(".book-github-link")];const current=links.at(-1);for(const stale of links.slice(0,-1))stale.remove();if(current&&current.parentElement!==document.body)document.body.append(current)};if(!window.__qingheGithubLinkBound){window.__qingheGithubLinkBound=true;document.addEventListener("nav",()=>setTimeout(mount))}mount()})()
`

export const BookToolbar = () => BookToolbarComponent
