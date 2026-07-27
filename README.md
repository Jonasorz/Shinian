# Shinian

Shinian 是一个部署在个人 VPS 上的自托管卡片笔记与轻量任务系统。第一阶段先把记录做顺手：打开即写、时间线整理、随时编辑，并把数据掌握在自己手里。

## 当前版本

MVP v0.1 已实现：

- 单用户登录与 7 天安全会话
- 无标题快速记录，支持 `Command/Ctrl + Enter` 保存
- 按日期分组的卡片时间线
- 卡片编辑、二次确认删除、8 秒撤销
- `#标签` 自动高亮
- 未提交内容保存在当前浏览器
- 可安装 PWA，提供离线提示页
- PostgreSQL 持久化、Docker 容器和 VPS 部署基础
- 桌面端与手机端响应式界面

产品需求见 [PRD v0.2](output/doc/Shinian_PRD_v0.2.md)，视觉规范见 [DESIGN.md](DESIGN.md)。

暂不包含团队协作、习惯打卡、四象限、甘特图、日历订阅、Notion 同步和 Obsidian 双向同步。轻量任务、提醒、回顾、Markdown 导出及手机原生分享收件箱将在后续版本开发。

## 本地启动

要求：

- Node.js 22 或更高版本
- npm
- Docker 或 OrbStack

首次初始化：

```bash
npm install
npm run setup:local -- owner "请换成至少12位的本地密码"
docker compose up -d db
npm run db:migrate
npm run dev
```

如果本机 Docker 不支持 `docker compose` 子命令，可将上面的命令替换为 `docker-compose`。

浏览器打开 `http://localhost:3210`，用户名为初始化时设置的 `owner`，密码为同一条命令中的密码。

常用检查：

```bash
npm run lint
npm test
npm run build
```

## VPS 部署

1. 在 VPS 安装 Docker、Compose 和 Git。
2. 克隆私有仓库。
3. 运行 `npm run setup:local -- <用户名> "<强密码>"` 创建 `.env`。
4. 运行 `docker compose up -d --build`。
5. 用 Caddy 或 Nginx 将域名反向代理到 `127.0.0.1:3210`，并启用 HTTPS。

生产环境不要复用本地 `.env`。`.env`、数据库卷和备份文件均不会提交到 Git。

## 数据与备份

GitHub 只备份源代码，不包含 PostgreSQL 中的私人笔记。正式上线时应另行配置：

- 每日执行 `pg_dump`
- 加密保存数据库备份
- 定期复制到 VPS 之外的位置
- 定期演练恢复

## 技术栈

- Next.js、React、TypeScript
- PostgreSQL
- Docker Compose
- CSS Modules
