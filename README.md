# 宝宝成长记录

一个基于 Next.js App Router 的宝宝日常记录应用。

## 功能特性

- 🔐 邮箱/密码注册登录 (NextAuth.js)
- 👶 多宝宝管理
- 📝 活动记录（喂奶、睡眠、尿布、洗澡）
- 📊 数据分析与可视化 (Recharts)
- 📱 响应式设计
- 🌙 暗色/亮色主题

## 技术栈

- **框架**: Next.js 14 App Router
- **语言**: TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **数据库**: SQLite（开发）+ Prisma
- **认证**: NextAuth.js v4（JWT Session）
- **表单验证**: Zod + React Hook Form
- **图表**: Recharts
- **状态管理**: TanStack Query

## 快速开始

### 1. 安装依赖

\u0060\u0060\u0060bash
npm install
\u0060\u0060\u0060

### 2. 配置环境变量

\u0060\u0060\u0060bash
cp .env.example .env
\u0060\u0060\u0060

编辑 `.env` 文件，配置数据库连接和认证密钥：

\u0060\u0060\u0060env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="change-me-in-production"
NEXTAUTH_URL="http://localhost:3000"
\u0060\u0060\u0060

### 3. 初始化数据库

\u0060\u0060\u0060bash
npx prisma generate
npx prisma db push
\u0060\u0060\u0060

### 4. 启动开发服务器

\u0060\u0060\u0060bash
npm run dev
\u0060\u0060\u0060

打开 http://localhost:3000

## 项目结构

\u0060\u0060\u0060
baby-tracker/
├── prisma/
│   └── schema.prisma    # 数据库模型
├── src/
│   ├── app/             # Next.js App Router 页面
│   ├── components/       # React 组件
│   ├── hooks/           # 自定义 hooks
│   ├── lib/             # 工具函数
│   ├── providers/       # React providers
│   ├── types/           # TypeScript 类型定义
│   ├── validations/     # Zod 验证 schema
│   └── db/              # Prisma 客户端
├── auth.ts              # NextAuth 配置
└── package.json
\u0060\u0060\u0060

## 数据库模型

### User
- `id`: 用户 ID
- `email`: 邮箱（唯一）
- `password`: 密码（加密存储）
- `name`: 姓名
- `role`: 角色 (USER/ADMIN)

### Baby
- `id`: 宝宝 ID
- `name`: 姓名
- `birthDate`: 出生日期
- `gender`: 性别
- `userId`: 所属用户

### Record
- `id`: 记录 ID
- `type`: 类型 (FEEDING/SLEEP/DIAPER/BATH)
- `babyId`: 所属宝宝
- `startTime`: 开始时间
- `endTime`: 结束时间（睡眠用）
- `amount`: 数量（奶量）
- `feedingType`: 喂奶类型
- `diaperStatus`: 尿布状态
- `note`: 备注

## API 接口

### 认证
- `POST /api/users` - 注册
- `POST /api/auth/[...nextauth]` - 登录/登出

### 宝宝
- `GET /api/babies` - 获取宝宝列表
- `POST /api/babies` - 添加宝宝
- `PATCH /api/babies/[id]` - 更新宝宝
- `DELETE /api/babies/[id]` - 删除宝宝

### 记录
- `GET /api/records` - 获取记录列表
- `POST /api/records` - 创建记录
- `DELETE /api/records/[id]` - 删除记录

### 管理后台 (仅 ADMIN)
- `GET /api/admin/stats` - 平台统计
- `GET /api/admin/users` - 用户列表

## License

MIT
