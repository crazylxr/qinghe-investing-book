// Twikoo 1.6.44 awaits emoji data before reading Vue refs. A SPA navigation can
// destroy the form during that await. Guard that continuation in our hosted
// copy; keep the npm package and shared backend unchanged.
export function patchTwikooClient(source) {
  const original = 'case 3:n=t.sent,e.owo=new p["default"]('
  if (source.split(original).length !== 2) {
    throw new Error(
      "Twikoo emoji continuation changed; review the lifecycle patch before publishing",
    )
  }
  const patched = source.replace(
    original,
    'case 3:n=t.sent;if(e._isDestroyed||e._isBeingDestroyed)return t.abrupt("return");e.owo=new p["default"](',
  )
  return `${patched}\n;window.twikoo.qinghePatch = 1;\n`
}
