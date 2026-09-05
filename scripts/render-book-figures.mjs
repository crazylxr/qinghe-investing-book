// Deterministic SVG authoring and PNG export. All numeric charts read the recalculated model JSON.
import fs from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"
const arg = (name) => process.argv[process.argv.indexOf(name) + 1]
if (!process.argv.includes("--data") || !process.argv.includes("--output"))
  throw new Error("Use --data model-results.json --output attachment-directory")
const data = JSON.parse(await fs.readFile(arg("--data"), "utf8"))
const output = path.resolve(arg("--output"))
const source = path.join(output, "图表源")
await fs.mkdir(source, { recursive: true })
const h = data.sheets["历史经营"],
  batch = data.sheets["门店批次"],
  base = data.scenarios["基准"]
const C = {
  bg: "#f7f1e4",
  ink: "#233f38",
  green: "#3a7463",
  pale: "#e9eee4",
  amber: "#896020",
  red: "#a54c3c",
  line: "#cdc9bb",
  white: "#fffdf8",
  grey: "#4e5b55",
}
const W = 720
const esc = (x) =>
  String(x).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;")
const num = (v, n = 1) =>
  (Math.abs(v) < 1e-8 ? 0 : v).toLocaleString("en-US", {
    minimumFractionDigits: n,
    maximumFractionDigits: n,
  })
const pct = (v) => `${Number((v * 100).toFixed(2))}%`
const text = (x, y, t, size = 32, color = C.ink, weight = 400, anchor = "start") =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${esc(t)}</text>`
function wrap(t, units = 19) {
  const lines = []
  let tokens = [],
    width = 0
  const size = (token) => [...token].reduce((n, ch) => n + (/[\x00-\x7f]/.test(ch) ? 0.57 : 1), 0)
  for (const token of String(t).match(/[A-Za-z0-9][A-Za-z0-9.,/%—–+-]*|[\s\S]/gu) ?? []) {
    if (token === "\n") {
      lines.push(tokens.join(""))
      tokens = []
      width = 0
      continue
    }
    const cw = size(token)
    if (width + cw > units && tokens.length) {
      const carry = /^[，。；：、！？）》]/.test(token) ? tokens.pop() : ""
      lines.push(tokens.join(""))
      tokens = carry ? [carry] : []
      width = size(carry)
    }
    tokens.push(token)
    width += cw
  }
  if (tokens.length) lines.push(tokens.join(""))
  return lines
}
const rect = (x, y, w, height, fill = C.white, stroke = C.line, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${height}" rx="14" fill="${fill}" stroke="${stroke}" ${extra}/>`
const line = (x1, y1, x2, y2, color = C.line, dash = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`
const arrow = (y) =>
  line(360, y, 360, y + 22, C.green) +
  `<path d="M350 ${y + 14} L360 ${y + 25} L370 ${y + 14}" fill="none" stroke="${C.green}" stroke-width="3"/>`
function header(title, subtitle) {
  let svg = text(36, 66, title, 40, C.ink, 700),
    y = 116
  for (const t of wrap(subtitle, 20)) {
    svg += text(36, y, t, 32, C.grey)
    y += 44
  }
  return { svg, y: y + 10 }
}
function finish(title, inner, height, width = W) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><rect width="100%" height="100%" fill="${C.bg}"/><g font-family="PingFang SC, Noto Sans CJK SC, sans-serif">${inner}</g></svg>`
}
const charts = []
function cards(name, title, subtitle, items, footer, arrows = true) {
  let { svg, y } = header(title, subtitle)
  items.forEach((item, i) => {
    const lines = item.lines.flatMap((t) => wrap(t, 18.7))
    const titleLines = wrap(item.title, 17)
    const height = 34 + titleLines.length * 48 + lines.length * 46 + 14
    const color = item.color ?? C.green
    svg += rect(
      32,
      y,
      656,
      height,
      item.fill ?? C.white,
      color,
      item.dashed ? 'stroke-dasharray="10 7"' : "",
    )
    let ty = y + 48
    for (const t of titleLines) {
      svg += text(58, ty, t, 36, color, 650)
      ty += 48
    }
    for (const t of lines) {
      svg += text(58, ty, t)
      ty += 46
    }
    y += height
    if (i < items.length - 1) {
      if (arrows) svg += arrow(y + 8)
      y += 44
    }
  })
  y += 52
  for (const t of wrap(footer, 20)) {
    svg += text(36, y, t, 32, C.grey)
    y += 44
  }
  charts.push({ name, svg: finish(title, svg, y + 20), width: W, height: y + 20, minFont: 32 })
}
cards(
  "08-数据时间线",
  "先排时间，再回看判断",
  "青禾故事全景 · 结语查阅",
  [
    {
      title: "2024 · 单店经营数据",
      lines: ["收入120万元；老板声称利润15万元。随后调查形成正常化分析。"],
    },
    {
      title: "2025年初 · 80万元报价",
      lines: ["依据2024年数据调查，未成交。老板原计划离开，后来决定留下。"],
    },
    {
      title: "2025—2030 · 扩张与融资",
      lines: ["从1家直营店走到60家直营、80家加盟；2029—2030批次成熟回报仍为预测。"],
    },
    {
      title: "2030年末 · 45元",
      lines: ["先研究经营与市场预期，继续观察。这一天也是DCF估值基准日。"],
    },
    { title: "2031年3月31日 · 约30元", lines: ["沿用年末模型作教学比较，仍然观察，没有成交。"] },
    {
      title: "之后 · 条件性持仓练习",
      lines: ["日期与滚动价值待填写。只有经营、治理、价值与价格同时满足条件，才假设建仓。"],
      dashed: true,
      color: C.amber,
    },
  ],
  "实线：已设定教学历史；虚线：条件练习。2031—2042年现金路径另属预测。",
)
cards(
  "09-2024利润到现金瀑布",
  "利润到现金：两条路径",
  "2024年单店正常化分析 · 单位万元",
  [
    {
      title: `共同起点：净利润 ${num(h.B17)}`,
      lines: ["已做工资、折旧等正常化调整；不是未经调整的报告利润。"],
    },
    {
      title: "路径一 · 当年投入强度",
      lines: [
        `${num(h.B17)} ＋ 折旧 ${num(h.B12)}`,
        `− 全部营运资本增加 ${num(h.B34)}`,
        `＝ 正常化经营现金代理 ${num(h.B42)}`,
        `再减总Capex ${num(h.B43)}`,
        `＝ FCF代理 ${num(h.B46)}`,
      ],
    },
    {
      title: "路径二 · 维持现有单店",
      lines: [
        `${num(h.B17)} ＋ 折旧 ${num(h.B12)}`,
        `− 维持性营运资本增加 ${num(-data.sheets["单店估值"].C17)}`,
        `再减维持性Capex ${num(h.B44)}`,
        `＝ 正常化所有者现金 ${num(data.sheets["单店估值"].C19)}`,
      ],
      color: C.amber,
    },
  ],
  "两条路径分别从净利润出发。8.1不是历史报告CFO；7.1也不是8.1再减4。",
  false,
)
cards(
  "10-三张表关系",
  "三张表：时点与期间",
  "一张看存量，两张看期间变化",
  [
    {
      title: "期初 · 资产负债表",
      lines: ["这一刻有什么、欠什么？记录现金、库存、设备、债务与权益。"],
    },
    {
      title: "这一年 · 利润表",
      lines: ["赚了多少？收入减成本费用得到利润，赊销与折旧使它不同于现金。"],
    },
    {
      title: "同一年 · 现金流量表",
      lines: ["现金怎样进出？经营、投资、筹资三类现金流共同解释现金净变化。"],
    },
    {
      title: "期末 · 资产负债表",
      lines: [
        "期初现金＋三类现金净变化＝期末现金。",
        "利润还要经过分红、增资等变化，才能解释期末权益。",
      ],
    },
  ],
  "中间两张表是同期的两种视角，不能把净利润直接当成现金净增加。",
  false,
)
// ROIC curve: full y-axis units, realized solid segment and forecast dashed segment.
{
  let { svg, y } = header("同样55万元，回报在下降", "各开店批次成熟增量ROIC · 年回报")
  const top = y + 50,
    bottom = y + 420,
    left = 94,
    right = 646,
    x = (i) => left + (i * (right - left)) / 5,
    yy = (v) => bottom - (v / 0.3) * (bottom - top)
  for (const v of [0, 0.1, 0.2, 0.3]) {
    svg += line(left, yy(v), right, yy(v))
    svg += text(74, yy(v) + 10, pct(v), 30, C.grey, 400, "end")
  }
  const values = "BCDEFG".split("").map((c) => batch[c + "18"])
  for (let i = 0; i < 5; i++)
    svg += line(
      x(i),
      yy(values[i]),
      x(i + 1),
      yy(values[i + 1]),
      i >= 3 ? C.amber : C.green,
      i >= 3 ? "10 7" : "",
    )
  values.forEach((v, i) => {
    svg += `<circle cx="${x(i)}" cy="${yy(v)}" r="7" fill="${i >= 4 ? C.amber : C.green}"/>`
    svg += text(
      i === 0 ? x(i) + 15 : x(i),
      yy(v) - 22,
      pct(v),
      32,
      i >= 4 ? C.amber : C.green,
      650,
      i === 0 ? "start" : "middle",
    )
    svg += text(x(i), bottom + 48, String(2025 + i), 28, C.ink, 400, "middle")
  })
  svg +=
    line(left, yy(0.09), right, yy(0.09), C.red, "5 7") +
    text(left, yy(0.09) + 42, "9%：公司基准资金成本参考", 30, C.red)
  y = bottom + 108
  svg += text(36, y, "实线：2025—2028已成熟批次", 32, C.green)
  svg += text(36, y + 48, "虚线：2029—2030预计成熟值", 32, C.amber)
  svg += text(36, y + 104, "不是同一批店历年收益；不是因果证明。", 32, C.grey)
  charts.push({
    name: "11-增量ROIC曲线",
    svg: finish("各批次成熟增量ROIC", svg, y + 148),
    width: W,
    height: y + 148,
    minFont: 28,
  })
}
cards(
  "12-资本配置流程",
  "钱该留给哪一种用途？",
  "有条件的选择，没有固定排名",
  [
    {
      title: "先保住经营与偿付",
      lines: ["核对最低现金、到期本金与不可取消的承诺；只比较剩余可用资金。"],
    },
    {
      title: "开店或并购？",
      lines: ["回报是否超过资金成本？是否看过爬坡、失败损失与管理能力？"],
      color: C.green,
    },
    {
      title: "回购？",
      lines: ["资金确有余裕，价格低于审慎价值，且没有更好的资金用途。"],
      color: C.green,
    },
    {
      title: "分红、偿债或暂留？",
      lines: ["比较合同风险、其他机会与现金需求；暂留也要有用途和复核期限。"],
      color: C.amber,
    },
    { title: "交代每股结果", lines: ["看净股数与兑现结果，保留原承诺；不只奖励规模或授权额度。"] },
  ],
  "每个分支都须通过同样的资金约束。符合条件也不等于自动执行。",
  false,
)
cards(
  "13-EV到股权每股桥接",
  "从经营价值走到一股",
  "基准DCF · 金额万元，股数万股",
  [
    { title: `经营价值EV ${num(base.EV)}`, lines: ["全部FCFF与终值折回2030年末。"] },
    { title: `− 有息负债 ${num(h.H30)}`, lines: ["债权人的索取先于普通股。"] },
    { title: `＋ 超额现金 ${num(h.H21 - 168)}`, lines: [`${num(h.H21)}总现金 − 168.0经营储备`] },
    { title: `＝ 股权价值 ${num(base.equity)}`, lines: ["属于普通股股东的估计价值。"] },
    {
      title: `÷ 300万股 ＝ ${num(base.price, 2)}元`,
      lines: ["用估值日完全摊薄股数，不能用262.5万股期间加权分母。"],
      color: C.amber,
    },
  ],
  "各行保留精度计算后展示；现金与债务口径仍需核查。",
)
cards(
  "14-三情景DCF价值",
  "三种未来，三种估值",
  "每股价值 · 教学假设，不是目标价",
  Object.entries(data.scenarios)
    .map(([name, v]) => ({
      title: `${name} ${num(v.price, 2)}元／股`,
      lines: [
        `WACC ${pct(v.wacc)}；长期g ${pct(v.g)}`,
        `长期增量ROIC ${pct(v.terminalROIC)}`,
        `终值现值占EV ${num(v.terminalShare * 100, 1)}%`,
      ],
      color: name === "悲观" ? C.red : name === "乐观" ? C.amber : C.green,
    }))
    .concat([
      {
        title: "45元和约30元：均观察",
        lines: ["30元介于悲观与基准之间，低于基准不自动构成足够缓冲。"],
        color: C.grey,
      },
    ]),
  "现金、增长、回报和风险成组设定。未给三情景指定发生概率。",
  false,
)
// Full reference matrix is intentionally wide and supports zoom.
{
  const width = 1160,
    cell = 132,
    x0 = 200,
    y0 = 246,
    rh = 88
  let svg =
    text(36, 66, "长期增长与折现率：42格敏感性", 42, C.ink, 700) +
    text(36, 124, "每股价值／元 · 基准经营路径，稳定ROIC固定9%", 32, C.grey)
  svg += text(36, y0 - 22, "g ↓", 28) + text(x0, y0 - 66, "WACC →", 30)
  data.sensitivity.wacc.forEach(
    (v, i) => (svg += text(x0 + i * cell + cell / 2, y0 - 22, pct(v), 30, C.ink, 650, "middle")),
  )
  const all = data.sensitivity.rows.flatMap((r) => r.values),
    lo = Math.min(...all),
    hi = Math.max(...all)
  data.sensitivity.rows.forEach((row, j) => {
    svg += text(130, y0 + j * rh + 54, pct(row.g), 32, C.ink, 650, "end")
    row.values.forEach((v, i) => {
      const t = (v - lo) / (hi - lo)
      const fill = `rgb(${Math.round(246 - 86 * t)},${Math.round(241 - 42 * t)},${Math.round(225 - 43 * t)})`
      svg += rect(x0 + i * cell, y0 + j * rh, cell - 5, rh - 5, fill, C.line)
      svg += text(x0 + i * cell + cell / 2, y0 + j * rh + 54, num(v, 2), 32, C.ink, 650, "middle")
    })
  })
  const y = y0 + 6 * rh + 48
  svg += text(36, y, "WACC=ROIC=9%：新增增长的价值与投入成本相抵。", 32, C.ink)
  svg += text(36, y + 48, "WACC高于9%时，更高g可能减值；每格同时调整衔接投入。", 32, C.grey)
  charts.push({
    name: "15-WACC与g敏感性热图",
    svg: finish("42格敏感性", svg, y + 88, width),
    width,
    height: y + 88,
    minFont: 28,
    reference: true,
  })
}
cards(
  "16-卖出决策树",
  "新消息来了，怎样行动？",
  "条件性持仓 · 每次独立测试一个事件",
  [
    { title: "暂时扰动", lines: ["需求与长期能力未变：设复核期限，继续持有并验证。"] },
    {
      title: "成熟回报持续低于资金成本",
      lines: ["复核后重算；若管理层仍拒绝调整，核心逻辑失效，可卖出。"],
      color: C.red,
    },
    {
      title: "重大隐瞒或治理破坏",
      lines: ["先核实重大性与纠正情况。问题重大且未纠正，卖出。"],
      color: C.red,
    },
    {
      title: "报价提高，或出现更好机会",
      lines: ["比较滚动价值、集中度、税费与替代选择，可能减仓或换仓。"],
      color: C.amber,
    },
  ],
  "买入成本、涨跌百分比和旧估值，都不能单独命令卖出。",
  false,
)
cards(
  "17-新店三年爬坡",
  "先看同一批三家店",
  "2025批次 · 成熟收入每店100万元",
  [
    { title: "开业第1年 · 2025", lines: [`3家 × 100 × 60% ＝ ${num(batch.I40, 0)}万元`] },
    { title: "开业第2年 · 2026", lines: [`3家 × 100 × 80% ＝ ${num(batch.J40, 0)}万元`] },
    { title: "第3年起 · 2027起", lines: [`3家 × 100 × 100% ＝ ${num(batch.K40, 0)}万元`] },
  ],
  "收入按60%→80%→100%爬坡；不是全公司收入，更不是行业统一规律。",
)
const severeEBIT = h.H8 * 0.8 - h.H9 * 0.85 - h.H11 * 0.96 - h.H12
const operating = severeEBIT - h.H16 * 1.2 + h.H12 - 80 * 0.06
const opening = h.H21 - data.sheets["假设"].B33
cards(
  "18-现金日历",
  "净流出，不等于资金缺口",
  "严重压力还款年度 · 单位万元",
  [
    {
      title: `期初可动用现金 ${num(opening)}`,
      lines: ["以2030年末现金为起点，已预留168万元运营储备。"],
    },
    {
      title: `＋ 经营现金 ${num(operating)}`,
      lines: ["代理值，已扣新旧利息。租金等费用不再重复扣。"],
    },
    {
      title: `− 总Capex ${num(h.H43)}`,
      lines: ["本路径仍维持增长投入；若暂停增长，改为100万元。"],
    },
    {
      title: "− 拟议贷款本金 80.0",
      lines: ["从贷款已到账并投入后的还款年度开始，不再加一次借款。"],
    },
    {
      title: `已知项目余额 ${num(opening + operating - h.H43 - 80)}`,
      lines: [
        `年度净流出 ${num(h.H43 + 80 - operating)}，余额仍为正；但现有500万元债务到期等项目尚缺。`,
      ],
      color: C.amber,
    },
  ],
  "最终按月补齐合同和付款时差。任何一期余额低于零，才出现对应资金缺口。",
)
cards(
  "19-提价实验",
  "先让顾客的反应说话",
  "拟议实验 · 20家直营店，尚未执行",
  [
    {
      title: "选店：10家＋10家",
      lines: ["10家调价店，10家可比观察店。匹配店龄、商圈与原有客流。"],
    },
    {
      title: "记录：调价前8周到后6个月",
      lines: ["同店成交价、杯量、复购、促销、成本与利润；两组都记录。"],
    },
    { title: "先排除假提价", lines: ["菜单20→21元，优惠券2→3元；券后仍是18元，并未涨价。"] },
    {
      title: "再比较两组变化",
      lines: ["同期天气、节日和竞品也影响销量。调价店比自己过去好还不够。"],
    },
    {
      title: "最后更新判断",
      lines: ["实际价格提高，销量与复购仍有韧性，单位利润改善，才提高持续性信心。"],
      color: C.amber,
    },
  ],
  "老店与新商圈分开看；不能把一次短期恢复写成永久增长。",
)
// Twelve dated points, displayed as a vertical bar chart for mobile reading.
{
  let { svg, y } = header("利润增长，现金何时释放？", "基准FCFF预测 · 前向再投资，万元")
  const zero = 214,
    max = 1120,
    scale = 320 / max,
    rowH = 72
  svg += text(zero, y + 30, "0", 30, C.grey)
  svg += text(zero + 320, y + 30, "1,120", 30, C.grey, 400, "end")
  y += 64
  const start = y
  base.series.forEach((r, i) => {
    const yy = y + i * rowH,
      v = Math.abs(r.fcff) < 1e-7 ? 0 : r.fcff,
      w = Math.abs(v) * scale
    svg += text(36, yy + 30, String(r.year), 32)
    svg += `<rect x="${v < 0 ? zero - w : zero}" y="${yy}" width="${Math.max(w, 2)}" height="38" rx="3" fill="${v < 0 ? C.red : C.green}"/>`
    svg += text(672, yy + 30, num(v), 30, v < 0 ? C.red : C.ink, 650, "end")
  })
  svg += line(zero, start - 15, zero, start + rowH * 12 - 20, C.grey)
  y += rowH * 12 + 24
  svg += text(36, y, `2031：${num(base.series[0].fcff)}；2032：约零。`, 32, C.ink)
  svg += text(36, y + 48, "2033转正，增长放慢后投入比例下降。", 32, C.grey)
  charts.push({
    name: "20-预测期FCFF变化",
    svg: finish("基准FCFF预测", svg, y + 90),
    width: W,
    height: y + 90,
    minFont: 30,
  })
}
const browser = await chromium.launch({ channel: "chrome", headless: true })
const page = await browser.newPage({ deviceScaleFactor: 2 })
const manifest = []
for (const chart of charts) {
  const svgPath = path.join(source, chart.name + ".svg"),
    pngPath = path.join(output, chart.name + ".png")
  await fs.writeFile(svgPath, chart.svg)
  await page.setViewportSize({ width: chart.width, height: chart.height })
  await page.setContent(`<style>html,body{margin:0;background:${C.bg}}</style>${chart.svg}`)
  await page.evaluate(() => document.fonts.ready)
  const clipping = await page.locator("svg text").evaluateAll((nodes) =>
    nodes
      .filter((n) => {
        const b = n.getBBox()
        const s = n.ownerSVGElement.viewBox.baseVal
        return b.x < 0 || b.y < 0 || b.x + b.width > s.width + 1 || b.y + b.height > s.height + 1
      })
      .map((n) => n.textContent),
  )
  if (clipping.length) throw new Error(`${chart.name} clipped text: ${clipping.join(" / ")}`)
  await page.locator("svg").screenshot({ path: pngPath })
  manifest.push({
    name: chart.name,
    width: chart.width,
    height: chart.height,
    minFont: chart.minFont,
    reference: chart.reference ?? false,
    svg: path.basename(svgPath),
    png: path.basename(pngPath),
  })
}
await browser.close()
await fs.writeFile(path.join(source, "figures.json"), JSON.stringify(manifest, null, 2) + "\n")
console.log(`Generated ${charts.length} SVG sources and PNG exports; no text outside canvas.`)
