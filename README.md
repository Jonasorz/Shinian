# Shinian (拾年)

Shinian 是一个部署在 Vercel、使用 Neon PostgreSQL 与私有 Vercel Blob 的个人卡片笔记与轻量任务系统。打造“打开即写、时间线整理、随心管理待办、数据可导出可恢复”的个人知识与任务随手记工具。

## 当前版本

MVP Phase 1 已完成功能：

- **卡片笔记 (Notes)**：无标题快速记录、时间线按日分组、卡片编辑/二次确认删除与 8 秒撤销、`#标签` 自动高亮与提取、草稿本地自动暂存。
- **任务管理 (Tasks)**：收件箱 / 今天 / 近期 / 清单多视图、优先级设置、起止日期、提醒时间、循环重复规则、卡片一键转任务。
- **全局搜索 (Search)**：支持卡片内容与任务标题/描述的全文检索，支持 `#标签` 聚合筛选。
- **每日回顾 (Daily Review)**：浏览历史今日卡片与已完成任务的回顾复盘。
- **数据导入与导出 (Import & Export)**：支持一键导出为 Obsidian Markdown (.zip) 格式；支持导入 flomo (HTML/ZIP) 卡片与滴答清单 (CSV) 任务。
- **系统与安全**：单用户登录与 7 天安全 Session、PWA 离线提示、PostgreSQL 持久化、桌面/移动端响应式界面。
- **移动端与提醒**：Android/iOS 窄屏底部导航、PC 任务页内提醒、重复任务自动生成下一实例。
- **图片与备份**：Memo 图片附件、私有 Vercel Blob、Neon 时间点恢复及每日完整 ZIP 归档。

*暂不包含：团队协作、习惯打卡、四象限视图、甘特图、日历订阅、Notion 实时同步。*

产品需求见 [PRD v0.2](output/doc/Shinian_PRD_v0.2.md)，视觉规范见 [DESIGN.md](DESIGN.md)。

## 使用说明

### 1. 快捷记录卡片 (Notes)
- **快速提交**：在主页输入框直接输入想法、随笔或 Markdown 内容，快捷键 `Command + Enter` (Mac) 或 `Ctrl + Enter` (Windows) 快速提交保存。
- **草稿防丢失**：输入框中未提交的内容会自动暂存在浏览器本地，意外刷新或关闭页面不会丢失。
- **标签归类**：输入框内编写 `#标签名`（如 `#灵感` `#工作`），发送后系统会自动识别高亮，点击标签可快速筛选。
- **卡片管理**：悬停卡片可进行编辑或删除。删除卡片支持 **8 秒内一键撤销**。
- **卡片转任务**：在卡片操作菜单中选择“转为任务”，可将卡片内容直接转换为待办事项。

### 2. 轻量任务管理 (Tasks)
- **视图切换**：在任务页面侧边/顶部切换“收件箱”、“今天”、“近期”或自定义“清单”。
- **任务属性**：新建或编辑任务时，可指定优先级（低/中/高/紧急）、起始日期、截止日期、提醒时间以及循环重复规则（每天/每周/每月/每年等）。
- **状态管理**：点击复选框标记完成/恢复任务，轻松掌握待办进度。

### 3. 全局搜索与标签 (Search)
- **全文检索**：在搜索页面实时匹配卡片正文、任务标题与详细描述。
- **热门标签云**：聚合展示所有已使用的 `#标签`，点击即可过滤出关联的卡片与任务。

### 4. 每日回顾 (Review)
- 在“回顾”页面，系统会自动呈现历史同日记录的卡片笔记以及近期已完成的任务，方便定期温故知新与个人复盘。

### 5. 数据导入与导出 (Import & Export)
- **导出至 Obsidian**：进入“设置 -> 数据导出”，点击“导出为 Obsidian Markdown”。下载的 `.zip` 压缩包解压后可直接用作 Obsidian 知识库，每篇 Markdown 均附带 YAML Frontmatter 元数据。
- **flomo 数据导入**：在设置页面上传 flomo 导出的 `HTML` 文件或 `.zip` 压缩包，自动解析卡片内容与 `#标签` 并批量导入。
- **滴答清单 (TickTick) 导入**：在设置页面上传滴答清单导出的 `CSV` 文件，自动解析任务标题、描述、优先级与完成状态并批量导入。

### 6. PWA 离线体验
- 支持在 Chrome / Safari 等浏览器中选择“添加到主屏幕”或“安装应用”，提供原生 App 体验及网络离线状态提示。
- Android 等窄屏设备使用固定底部导航，可进入记录、任务、搜索、回顾和设置。
- PC 浏览器在任务页面保持打开时，每 15 秒检查一次到期提醒，并在页面内显示提示。
- 关闭页面后不会继续提醒；未来 Android App 将使用系统原生本地通知。

## 本地启动与调试

要求：
- Node.js 22 或更高版本
- npm
- Docker / OrbStack 或 本机 PostgreSQL 服务

### 1. 首次环境初始化
```bash
npm install
npm run setup:local -- owner "请换成至少12位的本地密码"
```

### 2. 数据库准备与迁移
若使用 Docker 启动数据库：
```bash
docker compose up -d db
```
若使用本机已有 PostgreSQL 服务，请确保 `.env` 中的 `DATABASE_URL` 配置正确。

随后运行数据库迁移：
```bash
npm run db:migrate
```

### 3. 启动开发服务
```bash
npm run dev
```
在浏览器中打开 `http://localhost:3210`，使用账号 `owner` 及刚才配置的密码登录。

### 常用检查命令
```bash
npm run lint    # 代码规范检查
npm test        # 单元测试 (Vitest)
npm run build   # 构建测试
```

## Vercel + Neon 部署

1. 在 Neon 创建 PostgreSQL 项目，复制 pooled connection string 作为 Vercel 的 `DATABASE_URL`。
2. 在 Vercel 导入本仓库，并连接一个 Private Vercel Blob Store。
3. 在 Vercel Production 环境配置：

   - `DATABASE_URL`
   - `SHINIAN_USERNAME`
   - `SHINIAN_PASSWORD_HASH_B64`
   - `AUTH_SECRET`
   - `CRON_SECRET`
   - `BLOB_READ_WRITE_TOKEN`（连接 Blob Store 后通常自动注入）
   - `BACKUP_RETENTION_DAYS`（默认 30）

4. 部署时构建脚本会对 Neon 自动执行幂等数据库迁移。
5. 部署完成后，在 PC 浏览器验证页面内提醒，并上传一张测试图片。

`vercel.json` 只配置每日完整归档，符合 Vercel Hobby 的 Cron 限制。任务提醒不依赖 Vercel Cron。

## 未来 Android App

- App 从现有 Task API 同步 `reminderAt`、完成状态和重复规则。
- 使用 Android 原生本地通知调度准时提醒，即使网页没有打开也能工作。
- 任务修改、完成或删除时同步更新或取消系统通知。
- 若未来需要服务器主动推送或多设备即时同步，再独立接入 Firebase Cloud Messaging（FCM）。

## 数据与备份

- Neon 保存 PostgreSQL 数据历史。误操作时在 Neon Console 使用 Restore／时间点恢复，将数据库恢复到目标时间。
- 图片保存在 Private Vercel Blob，不依赖 Vercel Function 的临时文件系统。
- Vercel Cron 每天 16:00 UTC（北京时间次日 00:00）生成包含 JSON、Markdown 和附件的完整 ZIP，保存在 Blob 的 `backups/` 目录，默认保留 30 天。
- 设置页仍可随时手动下载 Obsidian ZIP 和 JSON。

数据库恢复会恢复附件的 Blob 路径；Blob 对象本身独立保存在对象存储中。上线后应分别验证 Neon 时间点恢复和完整 ZIP 下载。

## 验收

```bash
npm run lint
npm test
npm run build
npm run test:performance
```

性能检查会在事务中临时生成 10,000 条记录，完成查询计时后自动回滚，不会保留测试数据。

## 技术栈

- **框架与语言**：Next.js 16 (App Router)、React 19、TypeScript
- **设计与样式**：CSS Modules (Vanilla CSS 设计系统)
- **数据库**：Neon PostgreSQL (postgres.js)
- **附件存储**：Private Vercel Blob
- **测试框架**：Vitest
- **生产部署**：Vercel Functions + Vercel Cron
