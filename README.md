# Parent Survey System

This is a complete, production-ready web application built with **Next.js (App Router)**, **Supabase Postgres**, **Prisma**, **Tailwind CSS**, and **NextAuth**.

## Stack
- Frontend: Next.js + Tailwind CSS + shadcn/ui
- Backend: Next.js Route Handlers + Server Actions + Service Layer
- Database: Supabase Postgres + Prisma ORM
- Authentication: NextAuth.js (Credentials Provider with bcrypt)

## Setup Instructions

1. **Environment Variables**:
   Copy `.env.example` to `.env` and populate your Supabase PostgreSQL credentials. Do not use connection pooling URL for DIRECT_URL. Use the standard session mode.

   ```env
   DATABASE_URL="postgresql://postgres.[ref]:[pass]@[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[ref]:[pass]@[region].pooler.supabase.com:5432/postgres"
   NEXTAUTH_SECRET="your-super-secret-string-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

2. **Initialize Database**
   Generate the Prisma Client and run migrations:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push  # Or npx prisma migrate dev
   ```

3. **Seed the Database**
   Seed the app with dummy data required to view dashboards:
   ```bash
   npx ts-node prisma/seed.ts
   ```

4. **Run Locally**
   Start the application:
   ```bash
   npm run build
   npm run start
   ```

## Demo Accounts
Once the database is seeded, you can log in with:
- **Admin**: admin@skyline.edu
- **Teacher**: teacher1@skyline.edu
- **Parent**: parent1@skyline.edu
*(Password for all accounts is: `password123`)*

## Architecture

- **Auth**: Protected routes are handled deeply within `src/middleware.ts` intercepting every route dynamically according to the user's fetched role in the NextAuth JWT.
- **Scoring Logic**: Dashboard metrics (NPS calculations and Summary updates) are structurally mapped out in `src/services/dashboard.ts`.

