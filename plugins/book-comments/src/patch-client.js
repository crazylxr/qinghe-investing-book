// Adapt the pinned Twikoo client to Quartz's SPA lifecycle in our hosted copy;
// keep the npm package and shared backend unchanged.
export function patchTwikooClient(source) {
  // An emoji request can finish after navigation has destroyed the Vue form.
  const original = 'case 3:n=t.sent,e.owo=new p["default"]('
  if (source.split(original).length !== 2) {
    throw new Error(
      "Twikoo emoji continuation changed; review the lifecycle patch before publishing",
    )
  }
  let patched = source.replace(
    original,
    'case 3:n=t.sent;if(e._isDestroyed||e._isBeingDestroyed)return t.abrupt("return");e.owo=new p["default"](',
  )
  // Quartz removes head elements without data-persist on navigation. Twikoo's
  // style loader runs only once, so its styles must live as long as its script.
  const styleFactory = 'var e=document.createElement("style");return e.type="text/css",'
  if (patched.split(styleFactory).length !== 2) {
    throw new Error("Twikoo style loader changed; review the persistence patch before publishing")
  }
  patched = patched.replace(styleFactory, `${styleFactory}e.setAttribute("data-persist",""),`)
  return `${patched}\n;window.twikoo.qinghePatch = 2;\n`
}
