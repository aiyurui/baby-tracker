# Baby Tracker

A baby daily-tracking app built with Next.js App Router, Prisma, and NextAuth.

## Features

- Email/password authentication
- Multi-baby management
- Record tracking:
  - `FEEDING`
  - `SLEEP`
  - `DIAPER`
  - `BATH`
  - `MEDICAL` (visit, height/weight, vaccine)
- Dashboard and analytics
- Admin user/stats APIs
- i18n-ready UI (Chinese/English)
- Responsive layout

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui + Radix UI
- Prisma + SQLite (local development)
- NextAuth.js v4 (JWT session)
- React Hook Form + Zod
- TanStack Query

## Requirements

- Node.js 18+ (recommended: 20)
- npm 9+

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then edit `.env`:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-a-secure-random-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_TRUST_HOST=true
```

### 3. Initialize database

```bash
npx prisma generate
npx prisma db push
```

### 4. Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful Scripts

```bash
npm run dev
npm run build
npm run start
npm test
npm run i18n:check
```

## Project Structure

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

## Data Model (Overview)

### User

- `email` (unique)
- `password` (hashed)
- `name`
- `role`: `USER` / `ADMIN` / `SUPER_ADMIN`

### Baby

- `name`
- `birthDate`
- `gender`
- `userId`

### Record

- `type`: `FEEDING` / `SLEEP` / `DIAPER` / `BATH` / `MEDICAL`
- `babyId`
- `startTime` / `endTime`
- `medicalCategory`: `MEDICAL_VISIT` / `HEIGHT_WEIGHT` / `VACCINE`

## API Overview

### Auth

- `POST /api/users`
- `GET|POST /api/auth/[...nextauth]`
- `GET /api/auth/session`

### Babies

- `GET /api/babies`
- `POST /api/babies`
- `GET /api/babies/[id]`
- `PATCH /api/babies/[id]`
- `DELETE /api/babies/[id]`

### Records

- `GET /api/records`
- `POST /api/records`
- `GET /api/records/[id]`
- `PATCH /api/records/[id]`
- `DELETE /api/records/[id]`

### Admin

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `PATCH /api/admin/users/[id]`
- `DELETE /api/admin/users/[id]`

## Before Publishing to GitHub

- Do not commit `.env`
- Do not commit local DB files like `prisma/dev.db`
- Use a strong random `NEXTAUTH_SECRET` in production
- Recommended checks:

```bash
npm run build
npm test
```

## License

MIT
