// Cancelling a page invalidates pending loads before they can mount into the next page.
export function createCommentSession(loadLibrary, mount, reportError) {
  let disposed = false
  let pending = false
  let cleanup
  return {
    async start() {
      if (disposed || pending || cleanup) return
      pending = true
      try {
        const library = await loadLibrary()
        if (!disposed) cleanup = mount(library)
      } catch (error) {
        if (!disposed) reportError(error)
      } finally {
        pending = false
      }
    },
    dispose() {
      disposed = true
      cleanup?.()
      cleanup = undefined
    },
  }
}
