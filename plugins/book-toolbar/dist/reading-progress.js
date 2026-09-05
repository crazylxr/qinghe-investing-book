export function readingProgress(scrollTop, articleBottom, viewportHeight) {
  const distance = articleBottom - viewportHeight
  return distance <= 0 ? 100 : Math.min(100, Math.max(0, (scrollTop / distance) * 100))
}
