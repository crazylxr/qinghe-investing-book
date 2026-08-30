# 用一家奶茶店学会股票投资

《用一家奶茶店学会股票投资》的在线书站，基于 Quartz 5 构建并发布到 GitHub Pages。

## 本地开发

```bash
npm ci
npx quartz plugin install
npm run sync:book -- --source "/path/to/Obsidian/用一家奶茶店学会股票投资"
npm run check
npm run build
```

本地预览：

```bash
npm run dev
```

## 内容边界

- `book.manifest.json` 是网站章节顺序、公开状态和稳定 URL 的唯一配置。
- `scripts/sync-book.mjs` 只同步清单内正文与正文引用的图片。
- Obsidian 书稿仍是正文唯一来源；仓库内 `content/` 是可独立构建、可提交的发布快照。
- 数据底稿、案例核验、财务模型和其他 Vault 内容不会进入公开站点。

在线阅读：<https://crazylxr.github.io/qinghe-investing-book/>
