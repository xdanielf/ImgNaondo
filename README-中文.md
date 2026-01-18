# ImgNaondo

一款专为 Cloudflare Workers 设计的快速、精悍且功能强大的图床，现已支持 D1 数据库以获得极速的搜索与管理体验。

## 功能特性
- **存储**：使用 Cloudflare R2，享受超低成本甚至免费的对象存储。
- **数据库**：使用 Cloudflare D1 数据库，实现毫秒级的图片搜索、过滤与排序。
- **搜索**：支持按文件名、原始名称或标签实时检索。
- **标签系统**：支持为图片添加标签，方便分类管理。
- **安全性**：访问密码保护，防止未授权上传与管理。
- **一键部署**：全自动脚本，零基础轻松上手。

## 一键部署 (Windows)

1.  **准备环境**：确保电脑已安装 [Node.js](https://nodejs.org/)。
2.  **下载文件**：克隆本仓库或下载所有代码文件到本地文件夹。
3.  **运行脚本**：双击运行文件夹中的 **`deploy.bat`**。
    *   脚本会自动检查环境并安装必要插件。
    *   会自动弹出浏览器窗口请求登录 Cloudflare 账号。
    *   会自动创建 R2 存储桶 (`imgnaondo`) 和 D1 数据库 (`imgnaondo-db`)。
    *   **设置密码**：脚本会提示你输入一个访问密码，请务必牢记。
    *   脚本完成后，会直接给出部署成功的地址。

## 手动部署 (非 Windows)

1. 安装依赖：`npm install`
2. 创建 R2 存储桶：`npx wrangler r2 bucket create imgnaondo`
3. 创建 D1 数据库：`npx wrangler d1 create imgnaondo-db`
4. 获取数据库 ID 并填入 `wrangler.toml`（若无此文件，请参考 setup.js 中的模板创建）。
5. 初始化数据库表结构：`npx wrangler d1 execute imgnaondo-db --file=schema.sql --remote`
6. 部署到 Cloudflare：`npx wrangler deploy`

## 从旧版本迁移

如果你之前使用的是仅 R2 的旧版本：
1.  按照上述“一键部署”流程部署新版本。
2.  访问新部署的图床网页并登录。
3.  点击页面右上角的 **“↻ Sync (同步)”** 按钮。
4.  程序会自动扫描 R2 中已有的所有图片，并将它们的元数据同步到 D1 数据库中。同步完成后，即可正常搜索和排序。

## 赞赏与支持

如果你觉得这个项目对你有帮助，欢迎请我喝杯咖啡：

- **Bitcoin:** bc1qls4n5ttjwn6c6fqp5pqp4pelcn6tzqyva9v4lg
- **Ethereum:** 0x734fb2a5a12a6e50cac346a2850b47b9ec690ba6
- **Solana:** 7QZLPZhTVxxtRpRYXxRTcZQoqtNkbP2tAeB6J41NS3BJ
- **BNB Smart Chain:** 0x734fb2a5a12a6e50cac346a2850b47b9ec690ba6