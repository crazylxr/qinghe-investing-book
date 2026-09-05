import { copyFile, mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

export const BookCommentsAssets = () => ({
  name: "BookCommentsAssets",
  async *emit({ argv }) {
    const require = createRequire(import.meta.url)
    const source = dirname(require.resolve("twikoo/package.json"))
    const destination = join(argv.output, "static/twikoo")
    await mkdir(destination, { recursive: true })
    for (const [input, output] of [
      ["dist/twikoo.min.js", "twikoo-1.6.44.min.js"],
      ["dist/twikoo.min.js.LICENSE.txt", "twikoo-1.6.44.min.js.LICENSE.txt"],
      ["LICENSE", "LICENSE"],
    ]) {
      const target = join(destination, output)
      await copyFile(join(source, input), target)
      yield target
    }
  },
  async *partialEmit() {},
})
