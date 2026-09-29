# DAMP — DTT Asset & Inventory Management Platform

**KNET Ghana — Internal Operations System**

DAMP is a full-stack web application built for KNET Ghana to manage broadcast site assets, warehouse inventory, equipment tracking, and operational reporting across all DTT sites.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database ORM | Prisma 6 (binary engine) |
| Database | PostgreSQL 16 (self-hosted on Ubuntu) |
| Auth | NextAuth.js — Microsoft Entra ID (OIDC) + Email/Password |
| Email | Microsoft Graph API |
| Deployment | Vercel |
| Styling | Tailwind CSS |
| Document Generation | docx (Word), jsPDF |
| MQTT | HiveMQ Cloud (fuel level monitoring) |

---

## System Architecture

```
User Browser
    ↓
domain.com  (DNS → Vercel)
    ↓
Vercel  (hosts Next.js application)
    ↓                        ↓
Ubuntu Server           Microsoft Entra ID
(PostgreSQL 16)         (Auth + Email via Graph API)
    ↓
pgAdmin4  (http://server-ip/pgadmin4)
```

---

## Key Features

- **Inventory Management** — Track items across 3 warehouse sites (Kanda, Baatsona, Tse Addo)
- **Equipment Tracking** — Serial/entity code tracking per unit with condition history
- **Issue & Return System** — Waybill generation, return receipts, trip grouping
- **Restock Logging** — Full restock history with supplier tracking
- **Activity Audit Trail** — Every action logged with actor, timestamp, and entity
- **Activity Reports** — Downloadable Word reports by period and site
- **Broadcast Site Monitoring** — 42 DTT sites with GPS, tower height, asset registry
- **Fuel Monitoring** — Live fuel levels via HiveMQ MQTT (42 sites)
- **Data Backup & Recovery** — One-click export/import via admin panel
- **User Access Control** — Role-based (ADMIN / EDITOR / VIEWER), whitelist-only access

---

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Protected app routes
│   │   ├── admin/          # Admin panel (users, backup, MQTT)
│   │   ├── activity/       # Audit trail
│   │   ├── assets/         # Asset management
│   │   ├── dashboard/      # Main dashboard
│   │   ├── inventory/      # Inventory management
│   │   ├── sites/          # Broadcast sites
│   │   └── store/          # Warehouse store
│   ├── (auth)/             # Auth routes
│   │   └── auth/
│   │       ├── login/      # Login page (email/password + Microsoft SSO)
│   │       ├── set-password/ # External user password setup
│   │       └── error/      # Auth error page
│   └── api/                # API routes
│       ├── auth/           # NextAuth + set-password
│       ├── admin/          # Backup export/import, MQTT test
│       ├── activity/       # Report generation
│       └── store/          # Waybill, return receipt, bulk delete
├── lib/
│   ├── auth.ts             # getCurrentProfile(), requireCurrentProfile()
│   ├── prisma.ts           # Prisma client singleton
│   ├── mailer.ts           # Microsoft Graph API email
│   ├── activity.ts         # logActivity() helper
│   ├── inventory-status.ts # Stock status calculation
│   └── inventory-upload.ts # Bulk upload helpers
├── context/
│   └── ThemeContext.tsx    # Dark/light mode
└── middleware.ts           # Route protection (NextAuth)
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# ── Database (PostgreSQL on Ubuntu server) ─────────────────────────
DATABASE_URL="postgresql://dampuser:PASSWORD@SERVER_IP:5432/damp_production?sslmode=prefer"
DIRECT_URL="postgresql://dampuser:PASSWORD@SERVER_IP:5432/damp_production?sslmode=prefer"

# ── NextAuth ────────────────────────────────────────────────────────
NEXTAUTH_URL="https://localhost:3000"
NEXTAUTH_SECRET=""           # Generate: openssl rand -base64 32

# ── Microsoft Entra ID (from Azure Portal) ──────────────────────────
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID=""

# ── Microsoft Graph API (email) ─────────────────────────────────────
GRAPH_SENDER_EMAIL="Company sending mail"

# ── Company domain (for SSO detection) ─────────────────────────────
COMPANY_EMAIL_DOMAIN="company email domain"
```

---

## Getting Started (Development)

```bash
# 1. Clone the repo
git clone https://github.com/dampknet/damp.git
cd damp

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your values

# 4. Push database schema
npx prisma db push

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Database Setup (Production — Ubuntu Server)

See `docs/server-setup-guide.md` for the complete step-by-step guide.

**Quick summary:**
1. Install PostgreSQL 16 on Ubuntu
2. Create database `damp_production` and user `dampuser`
3. Open port 5432 with UFW (Vercel IP ranges + office IP)
4. Install pgAdmin4 for browser-based DB management
5. Run `npx prisma db push` from your PC to create all tables
6. Restore data via `/admin/backup` in the app

---

## Authentication

DAMP uses a **whitelist-only** access model:

- Only users added via `/admin/users` can sign in
- **Company accounts** (`@company email domain`) — sign in with Microsoft (OIDC via Entra ID)
- **External accounts** (Gmail, etc.) — receive a set-password email, then sign in with email/password
- Uninvited users see an "Access Denied" page

**To add a user:**
1. Go to `/admin/users`
2. Click **Invite Member**
3. Enter email and assign role (ADMIN / EDITOR / VIEWER)
4. System automatically sends the right email type

---

## User Roles

| Role | Access |
|------|--------|
| **ADMIN** | Full access — users, backup, all inventory operations |
| **EDITOR** | Can create, edit, issue, restock inventory. Cannot manage users or backup |
| **VIEWER** | Read-only — can view everything but cannot make changes |

---

## Deployment

The app deploys automatically to Vercel on every push to `main`.

**Required Vercel environment variables** — same as `.env` above, set in:
Vercel Dashboard → Project → Settings → Environment Variables

**Azure AD Redirect URI** (must be set in Azure Portal):
```
https://damp.knet.com/api/auth/callback/azure-ad
```

---

## Data Backup

- **Manual:** Go to `/admin/backup` → Download Full Backup (.json)
- **Automatic:** PostgreSQL `pg_dump` runs daily at 2am on the server (see server setup guide)
- **Restore:** Upload backup JSON at `/admin/backup` → Restore from Backup

---

## MQTT Fuel Monitoring

HiveMQ Cloud credentials are configured at `/admin/mqtt`.

Topic format: `{siteName}/fuel` (e.g. `adjangotey/fuel`)
Payload: plain number (e.g. `67.5`)

The MQTT subscriber service (`mqtt-subscriber.js`) runs on a separate server:
```bash
npm install mqtt @prisma/client dotenv
node mqtt-subscriber.js
# Or with PM2 (keep running permanently):
pm2 start mqtt-subscriber.js --name "damp-fuel"
```

---

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open Prisma database browser
npx prisma generate  # Regenerate Prisma client after schema change
```

---

## Contact

Built and maintained by **David Kwesi Sam**
© 2026 DTT Asset Management Platform. All rights reserved.
