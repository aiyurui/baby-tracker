# 宝宝成长记录（Baby Tracker）

一个基于 Next.js App Router 的宝宝日常记录应用，支持多宝宝管理、记录追踪、可视化分析和基础后台管理。

## 功能特性

- 邮箱/密码登录与注册（NextAuth Credentials）
- 多宝宝管理
- 记录类型：
  - `FEEDING`（喂养）
  - `SLEEP`（睡眠）
  - `DIAPER`（尿布）
  - `BATH`（洗澡）
  - `MEDICAL`（医疗：就医/身高体重/疫苗）
- 数据看板与分析图表
- 管理后台（用户管理与统计）
- 中英文界面支持
- 响应式布局

## 技术栈

- Next.js 14（App Router）
- TypeScript
- Tailwind CSS + shadcn/ui + Radix UI
- Prisma + SQLite（本地开发）
- NextAuth.js v4（JWT Session）
- React Hook Form + Zod
- TanStack Query

## 运行环境

- Node.js 18+（建议 Node.js 20）
- npm 9+

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

编辑 `.env`：

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-a-secure-random-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_TRUST_HOST=true
```

### 3. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问：`http://localhost:3000`

## 常用脚本

```bash
npm run dev
npm run build
npm run start
npm test
npm run i18n:check
```

## 项目结构

```text
baby-tracker/
|-- prisma/
|   `-- schema.prisma
|-- src/
|   |-- app/
|   |-- components/
|   |-- db/
|   |-- hooks/
|   |-- i18n/
|   |-- lib/
|   |-- providers/
|   |-- types/
|   `-- validations/
|-- tests/
|-- middleware.ts
|-- package.json
`-- .env.example
```

## 数据模型（概要）

### User

- `email`（唯一）
- `password`（哈希存储）
- `name`
- `role`：`USER` / `ADMIN` / `SUPER_ADMIN`

### Baby

- `name`
- `birthDate`
- `gender`
- `userId`

### Record

- `type`：`FEEDING` / `SLEEP` / `DIAPER` / `BATH` / `MEDICAL`
- `babyId`
- `startTime` / `endTime`
- `medicalCategory`：`MEDICAL_VISIT` / `HEIGHT_WEIGHT` / `VACCINE`

## API 概览

### 认证

- `POST /api/users`
- `GET|POST /api/auth/[...nextauth]`
- `GET /api/auth/session`

### 宝宝

- `GET /api/babies`
- `POST /api/babies`
- `GET /api/babies/[id]`
- `PATCH /api/babies/[id]`
- `DELETE /api/babies/[id]`

### 记录

- `GET /api/records`
- `POST /api/records`
- `GET /api/records/[id]`
- `PATCH /api/records/[id]`
- `DELETE /api/records/[id]`

### 管理后台

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `PATCH /api/admin/users/[id]`
- `DELETE /api/admin/users/[id]`

## 上传 GitHub 前检查

- 不要提交 `.env`
- 不要提交本地数据库 `prisma/dev.db`
- 生产环境务必使用强随机 `NEXTAUTH_SECRET`
- 提交前建议执行：

```bash
npm run build
npm test
```

## License

MIT
