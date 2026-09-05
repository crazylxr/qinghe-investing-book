// Serialized into Quartz's client bundle. Keep browser dependencies inside this function.
export function installBookToolbar(readingProgress, entries) {
  if (window.__qingheBookBound) return
  window.__qingheBookBound = true
  const storageKey = "qinghe-reading-layout"
  const layouts = { three: "三栏", two: "两栏", focus: "专注" }
  let activeLayout = "two"
  let observer
  let searchObserver
  const mobile = matchMedia("(max-width: 800px)")
  const progress = () => {
    const article = document.querySelector(".center > article")
    const end = article
      ? article.getBoundingClientRect().bottom + scrollY
      : document.documentElement.scrollHeight
    const percent = readingProgress(scrollY, end, innerHeight)
    document.documentElement.style.setProperty("--reading-progress", percent * 3.6 + "deg")
    document.querySelectorAll(".reading-progress span").forEach((bar) => {
      bar.style.width = percent + "%"
    })
    document.querySelectorAll(".book-reading-meter__ring").forEach((ring) => {
      ring.textContent = Math.round(percent) + "%"
    })
  }
  const closeControl = (restoreFocus = false) => {
    document.querySelectorAll(".reading-layout-control").forEach((control) => {
      const wasOpen = control.dataset.layoutOpen === "true"
      control.dataset.layoutOpen = "false"
      const trigger = control.querySelector("[data-layout-trigger]")
      trigger?.setAttribute("aria-expanded", "false")
      if (wasOpen && restoreFocus) trigger?.focus()
    })
  }
  const collapseExplorer = () => {
    document.querySelectorAll(".explorer").forEach((explorer) => {
      explorer.classList.add("collapsed")
      explorer.setAttribute("aria-expanded", "false")
    })
    document.documentElement.classList.remove("mobile-no-scroll")
  }
  const syncExplorerViewport = () => {
    if (mobile.matches) return collapseExplorer()
    document.querySelectorAll(".explorer").forEach((explorer) => {
      explorer.classList.remove("collapsed")
      explorer.setAttribute("aria-expanded", "true")
    })
    document.documentElement.classList.remove("mobile-no-scroll")
  }
  const applyLayout = (key, persist = false) => {
    activeLayout = Object.hasOwn(layouts, key) ? key : "two"
    document.documentElement.dataset.readingLayout = activeLayout
    if (activeLayout === "focus") collapseExplorer()
    else if (!mobile.matches) syncExplorerViewport()
    document.querySelectorAll("[data-layout-choice]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.layoutChoice === activeLayout))
    })
    document.querySelectorAll("[data-layout-trigger]").forEach((button) => {
      button.setAttribute("aria-label", "选择阅读布局，当前" + layouts[activeLayout])
    })
    closeControl(persist && mobile.matches)
    if (persist) {
      try {
        localStorage.setItem(storageKey, activeLayout)
      } catch {}
    }
    requestAnimationFrame(progress)
  }
  const mountPortal = (selector) => {
    const nodes = [...document.querySelectorAll(selector)]
    const current = nodes.at(-1)
    for (const stale of nodes.slice(0, -1)) stale.remove()
    if (current && current.parentElement !== document.body) document.body.append(current)
    return current
  }
  const slugOf = (href) =>
    new URL(href, location.href).pathname
      .replace(/\/$/, "")
      .split("/")
      .at(-1)
      ?.replace(/\.html$/, "") || "index"
  const polishExplorer = () => {
    const list = document.querySelector(".explorer-ul")
    if (!list) return
    const items = [...list.querySelectorAll(":scope > li:has(a.nav-file-title)")]
    const rank = (item) =>
      entries.findIndex((entry) => entry.slug === slugOf(item.querySelector("a").href))
    for (const item of items) {
      const link = item.querySelector("a.nav-file-title")
      const slug = slugOf(link.href)
      const entry = entries.find((entry) => entry.slug === slug)
      if (entry && link.textContent !== entry.label) link.textContent = entry.label
      const isCurrent = slug === slugOf(location.href)
      link.classList.toggle("active", isCurrent)
      if (isCurrent) link.setAttribute("aria-current", "page")
      else link.removeAttribute("aria-current")
    }
    const sorted = [...items].sort((a, b) => rank(a) - rank(b))
    if (sorted.some((item, index) => item !== items[index])) {
      const end = list.querySelector(":scope > .overflow-end")
      for (const item of sorted) list.insertBefore(item, end)
    }
    const currentSlug = slugOf(location.href)
    const active = list.querySelector('a[aria-current="page"]')
    if (active && list.dataset.bookActiveSlug !== currentSlug) {
      list.dataset.bookActiveSlug = currentSlug
      list.scrollTop = Math.max(
        0,
        active.getBoundingClientRect().top -
          list.getBoundingClientRect().top +
          list.scrollTop -
          list.clientHeight / 3,
      )
    }
  }
  const revealHash = () => {
    if (!location.hash) return
    let id
    try {
      id = decodeURIComponent(location.hash.slice(1))
    } catch {
      return
    }
    const target = document.getElementById(id)
    if (!target) return
    let parent = target.closest("details")
    let opened = false
    while (parent) {
      if (!parent.open) {
        parent.open = true
        opened = true
      }
      parent = parent.parentElement?.closest("details")
    }
    if (opened)
      requestAnimationFrame(() => target.scrollIntoView({ block: "start", behavior: "instant" }))
  }
  const mount = () => {
    mountPortal(".reading-layout-control")
    const search = mountPortal(".search")
    search?.classList.add("book-search")
    searchObserver?.disconnect()
    if (search) {
      const labelResults = () => {
        search.querySelectorAll(".result-card").forEach((result) => {
          const title = result.querySelector("h3")?.textContent?.trim()
          if (title) result.setAttribute("aria-label", title)
        })
      }
      labelResults()
      searchObserver = new MutationObserver(labelResults)
      searchObserver.observe(search, { childList: true, subtree: true })
    }
    const explorerButton = document.querySelector(".mobile-explorer")
    explorerButton?.setAttribute("aria-label", "全书目录")
    syncExplorerViewport()
    let stored
    try {
      stored = localStorage.getItem(storageKey)
    } catch {}
    applyLayout(Object.hasOwn(layouts, stored) ? stored : activeLayout)
    polishExplorer()
    observer?.disconnect()
    const list = document.querySelector(".explorer-ul")
    if (list) {
      observer = new MutationObserver(polishExplorer)
      observer.observe(list, { childList: true, subtree: true })
    }
    revealHash()
  }
  addEventListener("scroll", progress, { passive: true })
  addEventListener("resize", progress)
  mobile.addEventListener("change", syncExplorerViewport)
  document.addEventListener("load", progress, true)
  document.addEventListener("toggle", progress, true)
  addEventListener("hashchange", revealHash)
  document.addEventListener("nav", () => setTimeout(mount))
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return
    const choice = event.target.closest("[data-layout-choice]")
    if (choice) {
      applyLayout(choice.dataset.layoutChoice, true)
      return
    }
    const trigger = event.target.closest("[data-layout-trigger]")
    if (trigger) {
      const control = trigger.closest(".reading-layout-control")
      const open = control.dataset.layoutOpen !== "true"
      closeControl()
      control.dataset.layoutOpen = String(open)
      trigger.setAttribute("aria-expanded", String(open))
      return
    }
    if (!event.target.closest(".reading-layout-control")) closeControl()
    // Repeated clicks to the same fragment do not dispatch hashchange.
    if (event.target.closest('a[href*="#"]')) setTimeout(revealHash)
  })
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return
    closeControl(true)
    if (mobile.matches && document.querySelector(".explorer:not(.collapsed)")) {
      collapseExplorer()
      document.querySelector(".mobile-explorer")?.focus()
    }
  })
  mount()
}
