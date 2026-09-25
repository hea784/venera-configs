# venera-configs (hea784 fork)

[venera-app/venera-configs](https://github.com/venera-app/venera-configs) 的扩展列表：
**上游全部源 + 经过安全审计的额外免费源**。

在 Venera（含 [hea784/venera_0](https://github.com/hea784/venera_0) fork）的
「漫画源 → 仓库 URL」中填入：

```
https://cdn.jsdelivr.net/gh/hea784/venera-configs@main/index.json
```

## 工作方式

- **上游源**（拷贝漫画、MangaDex、comick 等）：`index.json` 中带有指向
  上游 jsdelivr 的 `url` 直链，永远跟随上游最新版本；本仓库另有快照兜底。
  每周一由 [sync-upstream workflow](.github/workflows/sync-upstream.yml)
  自动拉取上游 index.json 重新生成列表，版本号自动跟进。
- **额外源**（见 `_extra_sources.json`）：文件存放在本仓库，逐个人工审计后加入。

## 额外源清单与审计记录

| 源 | 文件 | 审计日期 | 结论 |
|---|---|---|---|
| 动漫屋 | dm5.js | 2026-09-25 | 仅连接 m.dm5.com；eval 用于站点 p.a.c.k.e.r 解包（与上游 hitomi/manhuaren 同手法） |
| Mangabz | mangabz.js | 2026-09-25 | 仅连接 www.mangabz.com；同上 |
| 极速漫画 | one_kkk.js | 2026-09-25 | 仅连接 m.1kkk.com；同上 |
| 野蛮漫画 | yemancomic.js | 2026-09-25 | 仅连接 yemancomic.com；无 eval |

审计方法：`node --check` 语法校验、提取全部 URL 域名核对、扫描 eval/atob/WebSocket/
localStorage/document.cookie 等模式、人工阅读网络调用。新源入库前必须过一遍。

## Create a new configuration

1. Download `_template_.js`, `_venera_.js`, put them in the same directory
2. Rename `_template_.js` to `your_config_name.js`
3. Edit `your_config_name.js` to your needs. 
   - The `_template_.js` file contains comments to help you with that. 
   - The `_venera_.js` is used for code completion in your IDE.
