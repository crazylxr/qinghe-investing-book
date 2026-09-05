export function commentPath(entries, slug, prefix = "/qinghe-book") {
  const entry = entries.find(
    (entry) =>
      entry.status === "published" &&
      (entry.id === "preface" || /^chapter-(?:0[0-9]|1[01])$/.test(entry.id)) &&
      entry.output === `${slug}.md`,
  )
  return entry ? `${prefix.replace(/\/+$/, "")}/${entry.id}` : null
}
