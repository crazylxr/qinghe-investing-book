import { build } from "esbuild"
import { copyFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const plugin = join(root, "plugins/book-comments")
const require = createRequire(import.meta.url)
const twikoo = require("twikoo/package.json")
if (twikoo.version !== "1.6.44")
  throw new Error("Review the Twikoo lifecycle bridge before upgrading")

const client = await build({
  entryPoints: [join(plugin, "src/browser.js")],
  bundle: true,
  format: "iife",
  target: "es2020",
  minify: true,
  write: false,
})
await build({
  entryPoints: [join(plugin, "src/index.js")],
  outfile: join(plugin, "dist/index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["preact/jsx-runtime"],
  loader: { ".css": "text" },
  define: { BOOK_COMMENTS_CLIENT: JSON.stringify(client.outputFiles[0].text) },
})
await copyFile(join(plugin, "index.d.ts"), join(plugin, "dist/index.d.ts"))

console.log("Book comments plugin prepared; Twikoo 1.6.44 assets will be emitted during build.")
