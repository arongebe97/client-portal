# Instantly.ai Client Portal - Deployment Guide

## 1. Prerequisites
- **GitHub Repository**: Ensure all your code is pushed to your `client-portal` repository.
- **Vercel Account**: For hosting the Next.js application.
- **Supabase Account**: You already have this (PostgreSQL database).
- **Instantly.ai Account**: For API access.

## 2. Vercel Deployment

1.  **Import Project**: Go to Vercel dashboard > Add New > Project > Select `client-portal`.
2.  **Environment Variables**: You **MUST** add these variables in Vercel settings under "Environment Variables":

| Variable Name | Value Description |
| :--- | :--- |
| `DATABASE_URL` | Your Supabase connection string (Transaction Mode, port 6543 or 5432). |
| `NEXTAUTH_SECRET` | Generate a random string (e.g. `openssl rand -base64 32`). |
| `NEXTAUTH_URL` | Your Vercel URL (e.g. `https://your-project.vercel.app`). |
| `INSTANTLY_API_KEY` | Your Instantly V2 API Key. |
| `INSTANTLY_WEBHOOK_SECRET` | A secret string you will also put in Instantly settings. |

3.  **Deploy**: Click **Deploy**. Vercel will build your app.

## 3. Post-Deployment Setup

### A. Database Migration
Vercel deployment does not automatically push your database schema.
**If you haven't run `npx prisma db push` locally against the production DB, do it now:**
```bash
npx prisma db push
```
Or add `"postinstall": "prisma generate && prisma db push"` to `package.json` scripts (use with caution in prod).

### B. Create Admin User
If you haven't seeded the production DB yet:
1.  Run the seed script locally pointing to the prod DB:
    ```bash
    node seed_admin.js
    ```
2.  Login with `admin@example.com` / `password`.
3.  **Immediately change the password** (feature pending, or update directly in DB).

### C. Configure Webhooks in Instantly.ai
1.  Go to your Instantly.ai Campaign Settings > Webhooks.
2.  Add a new webhook:
    -   **URL**: `https://YOUR-VERCEL-DOMAIN.vercel.app/api/instantly/webhook/event`
    -   **Events**: Select `Email Sent`, `Email Opened`, `Reply Received`.
3.  Ensure the events start flowing to populate the graphs.

## 4. Verification
1.  Go to `https://YOUR-VERCEL-DOMAIN.vercel.app/admin`.
2.  Login.
3.  Add a Client (`/admin/clients/new`).
4.  Assign a Campaign (`/admin/clients/[id]`).
5.  Login as that Client and verify you see the stats!
