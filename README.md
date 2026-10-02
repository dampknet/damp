# DAMP — DTT Asset & Inventory Management Platform

**KNET Ghana — Internal Operations System**

DAMP is a full-stack web application built for KNET Ghana to manage broadcast site assets, warehouse inventory, equipment tracking, and operational reporting across all DTT sites.

> ⚠️ **Before anything else:** read [Encryption Key](#encryption-key-critical). If `CONFIG_ENCRYPTION_KEY` is lost or changed, every secret saved in the app has to be re-entered.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database ORM | Prisma 6 (binary engine) |
| Database | PostgreSQL 16 (self-hosted on Ubuntu) |
| Auth | NextAuth.js — Email/Password + Microsoft Entra ID, Google, Generic OIDC (toggled in the app) |
| Email | Microsoft Graph API (configured in the app) |
| Secrets | AES encryption with `CONFIG_ENCRYPTION_KEY` |
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
Ubuntu Server           Identity providers (Entra ID / Google / OIDC)
(PostgreSQL 16)         + Microsoft Graph API (email)
    ↓
pgAdmin4  (http://server-ip/pgadmin4)

MQTT server (mqtt-subscriber.js) → HiveMQ Cloud → PostgreSQL
```

---

## Key Features

- **Inventory Management** — Track items across 3 warehouse sites (Kanda, Baatsona, Tse Addo)
- **Equipment Tracking** — Item-level condition (NEW / UNUSED / USED / FAULTY) plus optional per-unit entity codes
- **Issue & Return System** — Waybill generation, return receipts, trip grouping
- **Restock Logging** — Full restock history with supplier tracking
- **Activity Audit Trail** — Every action logged with actor, timestamp, and entity
- **Security Log** — Every sign-in/out with method, IP, OS, browser and device (master admin only)
- **Activity Reports** — Downloadable Word reports by period and site
- **Broadcast Site Monitoring** — 42 DTT sites with GPS, tower height, asset registry
- **Fuel Monitoring** — Live fuel levels via HiveMQ MQTT (42 sites)
- **Data Backup & Recovery** — One-click export/import via admin panel
- **User Access Control** — Whitelist-only; roles, master admins, lockout, suspension, expiry, emergency accounts
- **Configurable Sign-in** — Turn Microsoft / Google / OIDC on and off from the admin panel, no redeploy

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                  # Protected app routes
│   │   ├── admin/              # Admin panel
│   │   │   ├── users/          # User management (master admin)
│   │   │   ├── mqtt/           # HiveMQ settings (master admin)
│   │   │   ├── sign-in-settings/ # Providers + email settings (master admin)
│   │   │   └── backup/         # Backup & restore
│   │   ├── activity/           # Audit trail + Security tab
│   │   ├── assets/             # Asset management
│   │   ├── dashboard/          # Main dashboard
│   │   ├── inventory/          # Inventory management
│   │   ├── sites/              # Broadcast sites
│   │   └── store/              # Warehouse store
│   ├── (auth)/
│   │   └── auth/
│   │       ├── login/          # Login page (password + enabled providers)
│   │       ├── set-password/   # External user password setup
│   │       ├── change-password/ # Forced / voluntary password change
│   │       └── error/          # Auth error page (suspended, expired, ...)
│   └── api/
│       ├── auth/               # NextAuth + set-password
│       ├── admin/              # Backup export/import, MQTT test
│       ├── activity/           # Report generation
│       └── store/              # Search, waybill, return receipt, bulk delete
├── lib/
│   ├── auth.ts                 # getCurrentProfile(), requireCurrentProfile()
│   ├── prisma.ts               # Prisma client singleton
│   ├── mailer.ts               # Microsoft Graph API email
│   ├── secrets.ts              # Encrypt/decrypt saved secrets (CONFIG_ENCRYPTION_KEY)
│   ├── system-config.ts        # Loads provider + email settings (DB first, .env fallback)
│   ├── passwords.ts            # Password rules / generation
│   ├── request-info.ts         # IP, OS, browser, device for the Security log
│   ├── security-events.ts      # Security event helpers
│   ├── activity.ts             # logActivity() helper
│   ├── inventory-status.ts     # Stock status calculation
│   └── inventory-upload.ts     # Bulk upload helpers
├── context/
│   └── ThemeContext.tsx        # Dark/light mode
└── middleware.ts               # Route protection (NextAuth)

mqtt-subscriber.js              # Runs on the MQTT server, not on Vercel
```

---

## Environment Variables

Create a `.env` file in the project root. `.env` is git-ignored — never commit it.

```env
# ── Database (PostgreSQL on Ubuntu server) ─────────────────────────
DATABASE_URL="postgresql://dampuser:PASSWORD@SERVER_IP:5432/damp_production?sslmode=prefer"
DIRECT_URL="postgresql://dampuser:PASSWORD@SERVER_IP:5432/damp_production?sslmode=prefer"

# ── NextAuth ────────────────────────────────────────────────────────
NEXTAUTH_URL="https://localhost:3000"
NEXTAUTH_SECRET=""           # Generate: openssl rand -base64 32

# ── Encryption key for saved secrets (REQUIRED — see below) ─────────
CONFIG_ENCRYPTION_KEY=""     # 32 random bytes, base64. NEVER change or lose it.

# ── Fallbacks: only used until settings are saved in the app ────────
# Once Admin → Sign-in & Email Settings is saved, these can be removed.
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID=""
GRAPH_SENDER_EMAIL=""        # Mailbox that sends invite emails
COMPANY_EMAIL_DOMAIN=""      # e.g. knetgh.com — these users sign in with SSO
# GOOGLE_CLIENT_ID=""        # optional
# GOOGLE_CLIENT_SECRET=""
# OIDC_ISSUER=""             # optional (Okta, Keycloak, Auth0, ...)
# OIDC_CLIENT_ID=""
# OIDC_CLIENT_SECRET=""
# OIDC_NAME=""

# ── Other services ─────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
VRM_API_TOKEN=""             # used by src/lib/vrm.ts
```

---

## Encryption Key (Critical)

Client secrets for Microsoft / Google / OIDC, the email (Graph) secret and the HiveMQ password are stored **encrypted** in the database. They are encrypted with `CONFIG_ENCRYPTION_KEY`.

**Generate it once:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**The same value must be in all three places:**
1. Local `.env` (development)
2. Vercel → Project → Settings → Environment Variables
3. The MQTT server's `.env` (the subscriber decrypts the HiveMQ password)

**Rules:**
- Keep a copy in the company password manager.
- **Never change it.** A new key cannot read secrets saved with the old one.
- **If it is lost:** set a new key everywhere, then re-enter every secret in Admin → Sign-in & Email Settings and Admin → HiveMQ.
- Secrets are never sent back to the browser — the forms show "Saved — leave blank to keep".

---

## Getting Started (Development)

```bash
# 1. Clone the repo
git clone https://github.com/dampknet/damp.git
cd damp

# 2. Install dependencies
npm install

# 3. Create .env (see Environment Variables above)

# 4. Push database schema
npx prisma db push

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Windows:** stop `npm run dev` before running `npx prisma generate`. The dev server locks a Prisma file and generate fails with `EPERM ... query-engine-windows.exe`.

---

## Database Setup (Production — Ubuntu Server)

**Quick summary:**
1. Install PostgreSQL 16 on Ubuntu
2. Create database `damp_production` and user `dampuser`
3. Open port 5432 with UFW (Vercel IP ranges + office IP)
4. Install pgAdmin4 for browser-based DB management
5. Run `npx prisma db push` from your PC to create all tables
6. Restore data via `/admin/backup` in the app (use a **master admin** backup so local passwords are kept)
7. Make the first master admin (see below)

### Schema changes on an existing database

Schema changes are applied **by hand** with SQL (in pgAdmin / the SQL editor), before the new code is deployed. `prisma/schema.prisma` is the source of truth. Changes so far:

| Change | Table | What it adds |
|--------|-------|--------------|
| Phase 1 | `UserProfile` | `isMasterAdmin`, `failedLoginCount`, `lockedUntil`, `isSuspended`, `suspendedAt`, `suspendedBy`, `suspendReason`, `lastLoginAt`, `lastLoginIp`, `lastLoginMethod` |
| Phase 2 | `UserProfile` | `isEmergency`, `accessExpiresAt`, `mustChangePassword` |
| Phase 3 | new tables | `AuthProviderConfig`, `MailConfig` |
| Item condition | `InventoryItem` | `condition` (`EquipmentCondition`, default `NEW`) |

All are additive (`ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`), so they are safe to run on the live database before deploying.

After any schema change: `npx prisma generate`, then `npm run build`.

### Make the first master admin

Master admin can only be granted in the database:
```sql
UPDATE "UserProfile"
SET "isMasterAdmin" = true, "role" = 'ADMIN'
WHERE email = 'admin@example.com';
```

---

## Authentication

DAMP uses a **whitelist-only** access model:

- Only users added via `/admin/users` can sign in, whatever method they use
- **Company accounts** (`@COMPANY_EMAIL_DOMAIN`) — sign in with single sign-on
- **External accounts** (Gmail, etc.) — receive a set-password email, then sign in with email/password
- Uninvited users see an "Access Denied" page
- A user invited under one provider can sign in with any other enabled provider using the **same email** (accounts are linked by email — safe because only invited emails get in)

**To add a user:**
1. Go to `/admin/users`
2. Click **Invite Member**
3. Enter email and assign role (ADMIN / EDITOR / VIEWER)
4. System automatically sends the right email type

### Sign-in & Email Settings (master admin)

**Admin → Sign-in & Email Settings** (`/admin/sign-in-settings`):

| Card | Notes |
|------|-------|
| Email & Password | Always on — cannot be disabled |
| Microsoft Entra ID | Toggle + client ID, secret, tenant ID |
| Google | Toggle + client ID, secret |
| Generic OIDC | Toggle + issuer URL, client ID, secret (Okta, Keycloak, Auth0...) |
| Email (Graph) | Tenant, client ID, secret, sender mailbox, company domain |

- Each provider card shows its **Redirect URL** — paste it into that provider's console.
- Use **Test** before **Save**. Email has **Test Connection** and **Send Me a Test Email**.
- The login page shows a "Sign in with …" button for every enabled provider. Changes apply within **30 seconds**.
- A disabled provider is also blocked on the server, not just hidden.
- Until settings are saved here, the `.env` fallbacks are used.
- Every change is logged on the Security tab (secrets are never logged).

Redirect URLs follow this pattern:
```
https://<domain>/api/auth/callback/azure-ad
https://<domain>/api/auth/callback/google
https://<domain>/api/auth/callback/oidc
```

---

## User Roles

| Role | Access |
|------|--------|
| **Master Admin** | ADMIN + User Management, HiveMQ, Sign-in & Email Settings, Security tab, full backups |
| **ADMIN** | Recycle Bin, Backup (without password hashes), Activity, all inventory operations |
| **EDITOR** | Can create, edit, issue, restock inventory. Cannot manage users or backup |
| **VIEWER** | Read-only — can view everything but cannot make changes |

---

## Account Security

| Feature | Behaviour |
|---------|-----------|
| **Lockout** | 3 wrong passwords → locked for 5 minutes. Master admin can **Unlock** in User Management |
| **Suspension** | Suspended users are signed out on their next page load and cannot sign in |
| **Expiry** | Any account can have an expiry; after it passes the user is signed out and blocked |
| **Emergency account** | User Management → **Emergency Account**. Credentials are shown **once**. Default expiry 48h. Every use is logged as "Emergency account used" |
| **Set / Reset / Remove password** | Gives SSO staff a temporary password (e.g. during a Microsoft outage); remove it when SSO is back |
| **Forced password change** | Anyone whose password an admin sets must choose a new one before using the system |
| **Change Password** | Settings menu, for any user with a local password |

The lockout limits are `MAX_FAILED_ATTEMPTS` and `LOCK_MINUTES` in `src/app/api/auth/[...nextauth]/route.ts`.

**During a Microsoft outage:** create an Emergency Account, or Set Password on the affected staff, and remove them afterwards.

---

## Deployment

The app deploys to Vercel from Git. **Do not push untested changes to the production branch** — test locally with `npm run build` first.

**Required Vercel environment variables** — same as `.env` above (including `CONFIG_ENCRYPTION_KEY`), set in:
Vercel Dashboard → Project → Settings → Environment Variables

**Rollout checklist for a release that changes the schema:**
1. Run the SQL changes on the database
2. Confirm all env vars are in Vercel
3. Deploy
4. If `mqtt-subscriber.js` changed, replace it on the MQTT server and restart it
5. Smoke test: sign in, open a store site, check the Security tab

> After an **Instant Rollback** in Vercel, new pushes are not promoted to production until the rollback is undone.

---

## Data Backup

- **Manual:** Go to `/admin/backup` → Download Full Backup (.json)
- **Master admin backups** include password hashes, so a full restore keeps local passwords. **ADMIN backups** leave them out.
- **Automatic:** PostgreSQL `pg_dump` runs daily at 2am on the server
- **Restore:** Upload backup JSON at `/admin/backup` → Restore from Backup
- Encrypted secrets in a backup are only readable with the same `CONFIG_ENCRYPTION_KEY`

---

## MQTT Fuel Monitoring

HiveMQ Cloud credentials are configured at `/admin/mqtt` (master admin). The password is stored encrypted and is never shown again — leave it blank to keep it.

Topic format: `{siteName}/fuel` (e.g. `adjangotey/fuel`)
Payload: plain number (e.g. `67.5`)

The MQTT subscriber service (`mqtt-subscriber.js`) runs on a separate server. Its `.env` needs `DATABASE_URL` **and the same `CONFIG_ENCRYPTION_KEY`**:
```bash
npm install mqtt @prisma/client dotenv
node mqtt-subscriber.js
# Or with PM2 (keep running permanently):
pm2 start mqtt-subscriber.js --name "damp-fuel"
```

> After first setting up the encryption key, re-save the HiveMQ password once at `/admin/mqtt` so the stored copy is encrypted.

---

## Inventory Item Condition

- Every item has its own `condition` (NEW / UNUSED / USED / FAULTY), set on upload, Add Item and Edit.
- If an item has entity codes, editing its condition updates all its units.
- Entity codes can be created on Add Item, and generated later on Edit for units that don't have one yet.
- Deleted items keep their item codes reserved — fix items through **Edit** instead of deleting and re-uploading.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Unknown field 'xyz' for select statement` | Prisma client is stale: stop the dev server, `npx prisma generate`, restart |
| `EPERM ... query-engine-windows.exe` | Dev server is running — stop it, then `npx prisma generate` |
| `column "xyz" does not exist` | The SQL change for that column hasn't been run on this database |
| Saved provider/email/HiveMQ secret stops working | `CONFIG_ENCRYPTION_KEY` is missing or different in this environment |
| Hydration mismatch with `jsx-…` class names | Don't use `<style jsx>` in components rendered inside `<Suspense>`; use a plain `<style>` |

---

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npx prisma db push   # Create tables on a NEW database
npx prisma studio    # Open Prisma database browser
npx prisma generate  # Regenerate Prisma client after schema change (stop dev server first)
```

---

## Contact

Built and maintained by **David Kwesi Sam**
© 2026 DTT Asset Management Platform. All rights reserved.
