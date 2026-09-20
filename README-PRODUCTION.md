# Production Deployment & Operational Runbook

**The Artisan Table** is an enterprise-grade, mobile-optimized QR code ordering, payment, and kitchen POS system tailored for modern restaurants, roasteries, and cafés.

---

## 1. System Architecture

```
[ Customer Smartphone ]
  │  Camera scans tabletop QR (/menu/:slug/t/:tableToken)
  ▼
[ React 18 + Vite Mobile Client ]
  │  - iOS Safari & Android Chrome responsive (360px - 430px)
  │  - Anti-zoom input handling, safe-area inset (Home Bar) padding
  │  - Realtime WebSocket listener (waiter call, status updates)
  │  - Official Razorpay Standard Checkout iframe / Demo Sandbox
  ▼
[ Node.js + Express 4 + TypeScript Backend ]
  │  - Cryptographic table session token verification (/t/:token)
  │  - Authoritative server-side price & tax calculation engine
  │  - High-entropy unguessable order tracking tokens
  │  - Razorpay HMAC-SHA256 signature verification & rawBody webhooks
  │  - Multi-tenant data boundary isolation
  ▼
[ PostgreSQL Database (Prisma ORM) ]
  │  - Snapshot integrity: item names & prices preserved at order time
  │  - Atomic transactions for orders and payments
  │  - Relational foreign keys and indexed lookups
  ▼
[ Kitchen POS & Admin Live Dispatch ]
  │  - Realtime Socket.IO dispatch (Preparing → Ready → Served)
  │  - Waiter summon notifications with audio chimes
  │  - Tabletop QR code SVG generator & printable sheets
```

---

## 2. Domain & Hosting Architecture Options

The application supports two production hosting topologies:

### Option A: Unified Single Domain (Recommended)
Both the client SPA and backend API run under one domain (e.g. `https://menu.yourcafe.com`). Nginx serves the compiled SPA at `/` and reverse-proxies `/api/` and `/socket.io/` to Node.js on port 4000.
- **Benefits**: Zero CORS configuration needed; immune to cross-origin cookie / storage partitioning on iOS Safari; single SSL certificate.
- **Configuration**:
  - `server/.env`:
    ```env
    APP_URL="https://menu.yourcafe.com"
    API_URL="https://menu.yourcafe.com"
    ALLOWED_ORIGINS="https://menu.yourcafe.com"
    ```
  - `client/.env`:
    ```env
    VITE_API_URL=""
    VITE_WS_URL=""
    ```

### Option B: Separate Subdomains
Frontend is hosted at `https://menu.yourcafe.com` (or Netlify/Vercel/S3) and API backend at `https://api.yourcafe.com` (or EC2/Fly.io/Render).
- **Configuration**:
  - `server/.env`:
    ```env
    APP_URL="https://menu.yourcafe.com"
    API_URL="https://api.yourcafe.com"
    ALLOWED_ORIGINS="https://menu.yourcafe.com,https://admin.yourcafe.com"
    ```
  - `client/.env`:
    ```env
    VITE_API_URL="https://api.yourcafe.com"
    VITE_WS_URL="https://api.yourcafe.com"
    ```

---

## 3. Environment Configuration

### Backend Server (`server/.env`)

Copy `server/.env.example` to `server/.env` and configure:

```bash
cp server/.env.example server/.env
```

| Variable | Description | Example / Recommended |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/qr_cafe` |
| `PORT` | Backend HTTP port | `4000` |
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | 64-char key for staff JWT auth | `openssl rand -base64 48` |
| `APP_URL` | Public customer menu URL (used in QRs) | `https://menu.yourcafe.com` |
| `API_URL` | Public backend API URL | `https://menu.yourcafe.com` (Option A) or `https://api.yourcafe.com` (Option B) |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed domains | `https://menu.yourcafe.com` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | `rzp_live_...` (or `rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret Key | Razorpay Dashboard Secret Key |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret | Razorpay Dashboard Webhook Secret |
| `RAZORPAY_MOCK_SANDBOX` | Force offline sandbox payment mode | `false` (set `true` for offline/airgapped demos) |

### Frontend Client (`client/.env`)

```bash
cp client/.env.example client/.env
```

| Variable | Description | Example (Option A) | Example (Option B) |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Backend API URL | `""` (empty for same-origin proxy) | `https://api.yourcafe.com` |
| `VITE_WS_URL` | WebSocket server URL | `""` (empty for same-origin proxy) | `https://api.yourcafe.com` |

---

## 4. PostgreSQL Database Setup & Production Admin Provisioning

### Database Provisioning & Migrations

1. Ensure PostgreSQL (version 14+) is running:
   ```bash
   psql -U postgres -c "CREATE DATABASE qr_cafe;"
   ```

2. Run official Prisma database migrations to apply the schema:
   ```bash
   cd server
   npx prisma migrate deploy
   ```
   > All schema modifications are versioned in `server/prisma/migrations/`.

### Production Admin Provisioning

> ⚠️ **Production Security Guard Active**:
> In `NODE_ENV=production`, default seed credentials (`admin@democafe.com` / `admin123`) are **strictly blocked by code** (HTTP 403 Forbidden). You must create a dedicated production administrator account.

To safely provision your production manager or administrator with bcrypt encryption:

```bash
cd server
npm run create-admin <email> <password> <name> [role]
```

**Example:**
```bash
npm run create-admin manager@theartisantable.com "StrongSuperSecretP@ss987" "Café Owner" ADMIN
```
Available roles: `ADMIN`, `KITCHEN`, `STAFF`.

---

## 5. Official Razorpay Production Setup

### A. Live Credentials Provisioning
1. Log into your verified [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Toggle the switch to **Live Mode**.
3. Go to **Settings** → **API Keys** → **Generate Key**.
4. Set in `server/.env`:
   ```env
   RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxxxx"
   RAZORPAY_KEY_SECRET="your_live_key_secret"
   RAZORPAY_MOCK_SANDBOX=false
   ```

### B. Webhook Configuration (Out-of-Band Payment Settlement)
Webhooks ensure orders transition to `CONFIRMED` even if a customer closes their mobile browser immediately after UPI/Card authorization:
1. In Razorpay Dashboard, go to **Settings** → **Webhooks** → **Add New Webhook**.
2. **Webhook URL**:
   - For Option A: `https://menu.yourcafe.com/api/payments/webhook`
   - For Option B: `https://api.yourcafe.com/api/payments/webhook`
3. **Secret**: Generate a high-entropy string (e.g. `openssl rand -hex 24`) and configure:
   ```env
   RAZORPAY_WEBHOOK_SECRET="your_high_entropy_webhook_secret"
   ```
4. **Active Events**:
   - `payment.captured`
   - `order.paid`
5. Click **Save Webhook**.

> The backend automatically validates raw-body HMAC-SHA256 signatures, verifies order amount and currency match, and guarantees idempotent processing.

---

## 6. Table QR Code Generation & Rotation

1. Log into the restaurant admin portal (`/admin`).
2. Navigate to **Dining Tables**.
3. Each table displays its high-resolution QR code pointing to `${APP_URL}/menu/:slug/t/:tableToken`.
4. Click **Print All QR Codes** to open the print-ready, high-contrast tabletop sheet (formatted for laser printing, acrylic stands, or wooden table blocks).
5. **Security Rotation**: If a QR code is photographed or abused outside the premises, staff can click **Regenerate Token** next to any table. The old QR immediately becomes inactive (returning a 403 Forbidden on the menu and checkout), preventing spoofed orders.

---

## 7. Mobile Optimization Highlights

The customer ordering interface is tuned for touch smartphones:
- **Zero Viewport Zoom on iOS Safari**: All text inputs and textareas enforce $\ge$16px font sizing on mobile screens (`< 640px`), avoiding browser viewport jumps.
- **Safe-Area Insets**: Uses CSS `env(safe-area-inset-bottom)` ensuring floating cart drawers and checkout modals never collide with iPhone Home Indicator bars.
- **Touch Targets**: Steppers, category pills, search controls, and call-waiter chips meet or exceed 44px tap targets.
- **Zero Horizontal Jitter**: Fully tested on 360px, 375px, 390px, and 412px viewports.
- **Resilient Error Boundary**: Uncaught render exceptions trigger a glass recovery dialog with reload options instead of a blank screen.

---

## 8. Production Deployment (Nginx + PM2)

### A. Build Client
```bash
cd client
npm install
npm run build
# Output is compiled into client/dist
```

### B. Build Server
```bash
cd ../server
npm install
npm run build
```

### C. Run with PM2 Process Manager
```bash
pm2 start dist/index.js --name "cafe-api" --node-args="-r dotenv/config"
pm2 save
pm2 startup
```

### D. Nginx Reverse Proxy Configuration (Option A: Unified Domain)
```nginx
server {
    listen 80;
    server_name menu.yourcafe.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name menu.yourcafe.com;

    ssl_certificate /etc/letsencrypt/live/menu.yourcafe.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/menu.yourcafe.com/privkey.pem;

    root /var/www/qr_cafe/client/dist;
    index index.html;

    # Static assets with long-term immutable caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Realtime (Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### E. Nginx Configuration (Option B: Separate Subdomain for API)
```nginx
# API server (api.yourcafe.com)
server {
    listen 443 ssl http2;
    server_name api.yourcafe.com;

    ssl_certificate /etc/letsencrypt/live/api.yourcafe.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourcafe.com/privkey.pem;

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 9. Verification & Pre-Flight Checklist

Run these automated checks before any production launch or deployment:

```bash
# 1. Vitest backend unit & security tests (17 tests)
cd server && npm test

# 2. End-to-end multi-tenant acceptance suite (17 tests)
npx tsx tests/e2e_verification.ts

# 3. Production security, webhook HMAC, & state machine audit (19 tests)
npx tsx tests/production_security_audit.ts

# 4. Client TypeScript & Vite bundle build check (0 errors)
cd ../client && npm run build
```
