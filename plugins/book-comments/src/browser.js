import { createCommentSession } from "./lifecycle.js"

let libraryPromise
function loadLibrary(src) {
  if (window.twikoo?.version === "1.6.44") return Promise.resolve(window.twikoo)
  if (!libraryPromise) {
    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script")
      const finish = (error) => {
        clearTimeout(timer)
        script.onload = script.onerror = null
        if (error) {
          script.remove()
          reject(error)
        } else resolve(window.twikoo)
      }
      const timer = setTimeout(() => finish(new Error("Script timeout")), 15000)
      script.src = src
      script.async = true
      script.dataset.persist = ""
      script.onload = () =>
        finish(window.twikoo?.version === "1.6.44" ? null : new Error("Unexpected Twikoo version"))
      script.onerror = () => finish(new Error("Script unavailable"))
      document.head.append(script)
    }).catch((error) => {
      libraryPromise = undefined
      throw error
    })
  }
  return libraryPromise
}

// Twikoo 1.6.44 mounts a Vue 2 root but has no public destroy API. Keep this
// version-specific bridge here, and destroy it before Quartz morphs the DOM.
function mountedRoot(host) {
  return host.firstElementChild?.__vue__?.$root
}

function pinPageOptions(vm, options) {
  vm.$twikoo = options
  for (const child of vm.$children) pinPageOptions(child, options)
}

let cleanupPage = () => {}
function mountPage() {
  cleanupPage()
  const section = document.querySelector(".book-comments")
  if (!section) return
  const status = section.querySelector(".book-comments__status")
  const retry = section.querySelector(".book-comments__retry")
  const host = section.querySelector(".book-comments__mount")
  let disposed = false
  let session
  let observer
  let visibilityObserver
  const setState = (state) => {
    if (disposed) return
    section.dataset.state = state
    status.hidden = state === "ready"
    status.textContent = state === "error" ? "评论暂时无法加载，你可以稍后重试。" : "正在加载讨论…"
    retry.hidden = state !== "error"
    host.hidden = state !== "ready"
    host.setAttribute("aria-busy", String(state === "loading"))
  }
  const fail = () => {
    if (disposed) return
    session?.dispose()
    setState("error")
  }
  const start = () => {
    if (disposed || section.dataset.state === "loading" || section.dataset.state === "ready") return
    observer?.disconnect()
    setState("loading")
    session = createCommentSession(
      () => loadLibrary(section.dataset.scriptSrc),
      (twikoo) => {
        let active = true
        const target = document.createElement("div")
        host.replaceChildren(target)
        const timer = setTimeout(fail, 15000)
        const options = {
          envId: section.dataset.envId,
          el: target,
          path: section.dataset.commentPath,
          // Store the real chapter URL in notifications, independently of its comment key.
          href: section.dataset.pageUrl,
          lang: "zh-CN",
          onCommentLoaded() {
            if (active && !disposed) {
              clearTimeout(timer)
              setState("ready")
            }
          },
        }
        // HTTPS backends mount synchronously; only comment/config requests continue asynchronously.
        const initialized = twikoo.init(options)
        const root = mountedRoot(host)
        if (!root) {
          clearTimeout(timer)
          throw new Error("Twikoo root not mounted")
        }
        // Old requests must retain their page options when a new init updates Vue.prototype.
        pinPageOptions(root, options)
        initialized.catch(() => {
          if (active) fail()
        })
        return () => {
          active = false
          clearTimeout(timer)
          root.$destroy()
          host.replaceChildren()
        }
      },
      fail,
    )
    void session.start()
  }
  retry.addEventListener("click", start)
  cleanupPage = () => {
    disposed = true
    observer?.disconnect()
    session?.dispose()
    visibilityObserver?.disconnect()
    section.removeAttribute("data-visible")
    retry.removeEventListener("click", start)
    cleanupPage = () => {}
  }
  if ("IntersectionObserver" in window) {
    visibilityObserver = new IntersectionObserver((entries) => {
      section.toggleAttribute(
        "data-visible",
        entries.some((entry) => entry.isIntersecting),
      )
    })
    visibilityObserver.observe(section)
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start()
      },
      { rootMargin: "300px" },
    )
    observer.observe(section)
  } else start()
}

document.addEventListener("prenav", () => cleanupPage())
document.addEventListener("nav", mountPage)
