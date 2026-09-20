# SENTOSA — THE COFFEE UNIT
## QR Ordering & Restaurant Operations System

<div align="center">
  <video src="brag-output/brag.mp4" poster="brag-output/brag.jpg" controls="controls" width="100%" style="max-width: 860px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.25);">
    <a href="brag-output/brag.mp4">
      <img src="brag-output/brag.jpg" alt="SENTOSA — THE COFFEE UNIT Launch Demo" width="100%" style="border-radius: 12px;" />
    </a>
  </video>
  <p align="center">
    <sub><b>🎬 Sentosa — The Coffee Unit: Product Walkthrough & Launch Video (1080p • 21s)</b></sub><br />
    <sub><em>If the inline video player does not load automatically in your client, tap the poster below or <a href="brag-output/brag.mp4">watch <code>brag-output/brag.mp4</code> directly</a>.</em></sub>
  </p>
</div>

[![Watch Demo Video](brag-output/brag.jpg)](brag-output/brag.mp4)

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-22+-green?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?logo=prisma&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socketdotio&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38b2ac?logo=tailwindcss&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-Verified-02042B?logo=razorpay&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## 📌 Product Overview

**SENTOSA — THE COFFEE UNIT** is a full-stack, mobile-first QR code dining and restaurant operations platform engineered for modern specialty coffee bars, roasteries, and dine-in restaurants. 

In traditional restaurant environments, physical menus create bottlenecks, order modifications are prone to human miscommunication, bill settlement introduces delays, and table turnover suffers. Generic SaaS QR menus often degrade the guest experience by requiring app downloads, clunky password accounts, or insecure numeric URLs that allow malicious users to tamper with other tables' bills.

Sentosa solves this end-to-end with an artisanal, editorial web experience:
- **Guests** scan an unguessable, cryptographically signed tabletop QR token, explore an aesthetic menu with table-specific recommendations, customize drinks with milk/shot modifiers, verify their session via lightweight phone OTP (no passwords required), settle payments online through Razorpay, track prep progress in real-time, and call their server with one tap.
- **Kitchen & Floor Staff** manage incoming orders through a real-time Kanban dispatch board with Web Audio API chime alerts, manage stock through live sold-out toggles, receive table-specific waiter requests, and generate batch-printable tabletop QR stand sheets.

---

## 🎬 Product Demo

The demonstration video above illustrates the complete customer and staff workflow captured live in 1080p:
1. **QR Entrypoint & Table Handshake**: Scanning Table 05 (`tbl_q7r8s9t0`) instantly establishes an authenticated table session.
2. **Table-Specific Recommendations**: Editorial *"Guests here often order..."* recommendations generated from historical table ordering patterns.
3. **Drink & Dish Customization**: Multi-group modifiers (e.g. Oat Milk +₹40, Double Espresso Shot +₹50) with dynamic price calculation.
4. **Phone-First Customer Authentication**: Instant mobile OTP verification without passwords, securing receipt history and order tracking.
5. **Authoritative Server-Side Checkout**: Server calculates subtotals, GST, and totals directly from the database; client-side price tampering is strictly rejected.
6. **Payment Settlement & Live Kitchen Dispatch**: Razorpay HMAC-SHA256 signature verification triggers instant Socket.IO push to kitchen POS with synthesized audio chime.
7. **Multi-Order Persistence**: Customers can seamlessly tap *"Add More Items"* while existing orders remain persistently tracked.
8. **Real-Time Waiter Summoning**: Instant table assistance requests (Water, Cutlery, Bill, Staff) with acoustic staff chimes and status tracking.

---

## ✨ Key Features

- 📱 **Zero-Install Web App**: Responsive mobile web application optimized for iOS Safari and Android Chrome (viewport safe-area insets, anti-zoom inputs, native touch physics).
- 🔐 **Cryptographically Scoped Table Tokens**: Unguessable 16-character alphanumeric tokens (`/menu/:slug/t/:tableToken`) prevent table ID enumeration attacks.
- 📲 **Phone-First OTP Customer Auth**: Eliminates traditional passwords and email accounts; frictionless mobile verification links multiple orders to a persistent customer identity.
- 🍽️ **Table-Specific Recommendations**: Dynamic *"Guests here often order..."* engine computes the most popular items ordered at that exact table, with graceful fallback to café-wide bestsellers.
- 🛡️ **Authoritative Price Integrity Engine**: The server strictly calculates item subtotals, customization options, and GST taxes directly from PostgreSQL records, ignoring any client-submitted pricing fields.
- 💳 **Verified Razorpay Payments**: Supports standard live UPI/Cards/NetBanking payments and includes a built-in cryptographic mock sandbox for local, air-gapped, and CI/CD testing.
- 🔄 **Multi-Order Persistence & Unified Tracking**: Floating status pills and customer order history maintain visibility across multiple ordering rounds.
- 🔔 **Real-Time Waiter Calling**: Table-aware assistance dispatch with reason presets (*Refill Water*, *Need Cutlery*, *Request Bill*, *Staff Assistance*) and anti-spam debouncing.
- 👨‍🍳 **Kitchen Display System (KDS)**: Live kanban dispatch board with Web Audio API synthesizer notifications, atomic state transitions (`CONFIRMED` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `SERVED`), and elapsed timers.
- 🚫 **Instant Sold-Out Toggles**: Immediate out-of-stock toggling propagates instantaneously across all customer sessions via WebSocket.
- 🖨️ **Tabletop QR Generator & Print Sheets**: Built-in SVG/PNG artwork generator for individual tabletop acrylic stands and multi-table batch printable cut sheets.
- 👥 **Role-Based Access Control (RBAC)**: Distinct permissions for `MANAGER` (analytics, menu CRUD, pricing, table management, staff accounts) and `STAFF` (live KDS, order transitions, waiter calls, stock toggling).

---

## 🔄 Customer Ordering Flow

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Scan Table QR  │ ────> │  Browse Menu &  │ ────> │ Customize Items │
│ (/t/:tableToken)│       │ Table Favorites │       │ & Add to Cart   │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                             │
┌─────────────────┐       ┌─────────────────┐                │
│ Enter Phone No. │ <──── │ Tap Checkout &  │ <──────────────┘
│ & Verify OTP    │       │ Review Cart     │
└────────┬────────┘       └─────────────────┘
         │
         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Server Verifies │ ────> │ Razorpay Modal  │ ────> │ Server Verifies │
│ Prices from DB  │       │ (UPI/Card/Mock) │       │ HMAC Signature  │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                             │
┌─────────────────┐       ┌─────────────────┐                ▼
│ "Add More Items"│ <──── │ Real-Time Order │ <──── ┌─────────────────┐
│ (Keep Tracking) │       │ Status Stepper  │       │ Order Pushed to │
└─────────────────┘       └─────────────────┘       │   Kitchen KDS   │
                                                    └─────────────────┘
```

1. **Table Resolution**: The guest scans the physical table QR code. The server resolves the token, generates a cryptographically signed table session token, and loads the active menu.
2. **Selection & Customization**: The guest explores categories and table favorites, opens the item modal to pick customizations (e.g. alternative milk, shot counts, preparation notes), and builds their cart.
3. **Frictionless Auth**: At checkout, the guest enters their name and phone number. An SMS OTP (or dev console code) verifies ownership and binds the session to their customer profile.
4. **Price Verification & Order Creation**: The client sends only `menuItemId`, `quantity`, and `selectedOptionIds`. The server calculates subtotal, GST (5%), and grand total authoritatively and generates a Razorpay order.
5. **Settlement**: The guest completes checkout via Razorpay UPI/card or the instant sandbox tester. The backend cryptographically validates the HMAC-SHA256 signature before confirming the order.
6. **Live Tracking & Multi-Order**: The customer observes real-time status transitions. If they tap *"Add More Items"*, a persistent floating pill displays active order counts while allowing new cart additions.

---

## 🍳 Kitchen / Live Order System (KDS)

The Kitchen Display System (`/admin`) is designed for high-stress, fast-paced culinary operations:

- **Acoustic Alerts**: Utilizes the HTML5 Web Audio API synthesizer to emit an audible chime whenever a new order is received or a waiter is summoned, eliminating the need for external MP3 assets.
- **Kanban Dispatch Board**: Orders are organized into clear operational columns:
  - **New / Confirmed**: Newly settled orders awaiting preparation.
  - **Preparing**: Active kitchen ticket with elapsed time counter.
  - **Ready**: Food plated and waiting for runner / customer pickup.
  - **Served**: Order delivered to table; archived into daily sales history.
- **State Machine Guardrails**: The backend strictly enforces valid lifecycle transitions (`CONFIRMED` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `SERVED`). Unpaid or cancelled orders cannot be moved into production, and served orders cannot be regressed.
- **Itemized Modification Highlights**: Customer notes (*"Less spicy"*, *"No onions"*) and paid modifiers (*"Oat Milk"*, *"Double Shot"*) are rendered with bold, high-contrast badges for error-free prep.

---

## 🔔 Waiter Call System

Dining guests can summon floor staff directly from their mobile menu without waving or leaving their table:

```
[ Customer Phone ] ──(POST /api/waiter/call)──> [ API Server ] ──(Socket.IO)──> [ Staff POS Screen ]
         │                                                                               │
         │ <── Status: "Calling..." ────────────────────────────────────────────────────┘
         │
         │ <── Status: "Staff Acknowledged" ──(PATCH /acknowledge)────────────────────── [ Staff ]
         │
         │ <── Status: "Resolved" ────────────(PATCH /resolve)────────────────────────── [ Staff ]
```

- **Preset Reasons**: Guests select from common request types:
  - 💧 *Refill Water*
  - 🍴 *Need Extra Cutlery*
  - 🧾 *Request Physical Bill / Receipt*
  - 🙋 *Staff Assistance*
  - ✍️ *Optional Custom Note* (e.g., *"Please bring 2 extra glasses"*)
- **Anti-Spam Throttling**: The server enforces a 60-second rate-limit debounce per table session. Duplicate requests return `409 Conflict`.
- **Tri-State Lifecycle**: Requests progress from `PENDING` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `RESOLVED`, updating the customer's screen in real-time.

---

## ☕ Menu Customization & Dietary Signals

Sentosa provides an editorial, visual menu interface that adheres to international restaurant best practices:

- **Authentic Dietary Markers**: Standardized square-bordered FSSAI indicators for **Vegetarian** (green circle), **Non-Vegetarian** (brown triangle), and **Vegan** (green leaf).
- **Customization Groups**:
  - **Single-choice groups** (e.g., Choice of Milk: Regular Whole Milk / Oat Milk +₹40 / Almond Milk +₹40).
  - **Multi-choice groups / Add-ons** (e.g., Extra Espresso Shot +₹50, Caramel Drizzle +₹30).
  - **Required vs. Optional selection rules** validated server-side.
- **Dynamic Pricing Engine**: Customization modifier costs are tallied instantly in the UI and cryptographically verified on the backend.
- **Preparation Notes**: Guests can select quick chips (*"Less Sweet"*, *"Extra Hot"*, *"On the Side"*) or supply freeform instructions to the barista.

---

## 💳 Payments: Sandbox Mock vs. Real Razorpay Integration

The payment architecture supports both enterprise production deployments and completely friction-free portfolio demonstrations:

```
                               ┌────────────────────────────────┐
                               │     Checkout Initiated         │
                               └───────────────┬────────────────┘
                                               │
                                 Is RAZORPAY_MOCK_SANDBOX=true?
                                        /             \
                                     YES               NO
                                     /                   \
                                    ▼                     ▼
               ┌───────────────────────────┐   ┌──────────────────────────┐
               │    Local Sandbox Mode     │   │ Official Razorpay Modal  │
               │ Generates HMAC test token │   │ UPI / QR / NetBanking    │
               └─────────────┬─────────────┘   └────────────┬─────────────┘
                             │                              │
                             └───────────────┬──────────────┘
                                             │
                                             ▼
                               ┌────────────────────────────────┐
                               │  Backend Signature Validator   │
                               │   crypto.createHmac('sha256')  │
                               └───────────────┬────────────────┘
                                               │ Matches secret?
                                        /             \
                                     YES               NO
                                     /                   \
                                    ▼                     ▼
                       ┌─────────────────────────┐   ┌─────────────────────────┐
                       │ Status: CONFIRMED       │   │ 400 Bad Request         │
                       │ Payment: COMPLETED      │   │ Transaction Rejected    │
                       └─────────────────────────┘   └─────────────────────────┘
```

### 1. Built-In Sandbox Mock Mode (`RAZORPAY_MOCK_SANDBOX=true`)
- **Default for local development, reviews, and test suites.**
- When active, the checkout dialog features a one-click **"Demonstration / Test Pay"** option.
- The server generates an internal cryptographic HMAC-SHA256 signature using the configured test secret, exercising the exact same verification pipeline used in production.
- Enables recruiters, developers, and reviewers to test the complete order lifecycle immediately without setting up merchant accounts or inputting credit card numbers.

### 2. Live Production Mode (`RAZORPAY_MOCK_SANDBOX=false`)
- Connects to official Razorpay APIs using merchant keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
- The client initializes the official `Razorpay` Checkout SDK popup supporting UPI Intent, Google Pay, PhonePe, Paytm, Credit/Debit Cards, and NetBanking.
- The server verifies the signature returned by the gateway using RFC 2104 HMAC-SHA256:
  $$\text{HMAC-SHA256}(\text{razorpay\_order\_id} + "|" + \text{razorpay\_payment\_id}, \text{secret})$$
- Production webhook endpoint (`POST /api/payments/webhook`) processes raw payload signatures (`X-Razorpay-Signature`) with idempotent execution.

---

## 👥 Role-Based Access Control (RBAC)

The administrative system provides strict multi-tenant boundary isolation and role-based permissions:

| Permission / Endpoint | `MANAGER` | `STAFF` | Unauthenticated |
| :--- | :---: | :---: | :---: |
| **Live Kitchen KDS** (`GET /admin/orders/live`) | ✅ | ✅ | ❌ 401 |
| **Update Order State** (`PATCH /admin/orders/:id/status`) | ✅ | ✅ | ❌ 401 |
| **View Waiter Requests** (`GET /admin/waiter-requests`) | ✅ | ✅ | ❌ 401 |
| **Acknowledge / Resolve Waiter** (`PATCH /admin/waiter-requests/:id`) | ✅ | ✅ | ❌ 401 |
| **Toggle Item Sold-Out** (`PATCH /admin/menu/items/:id/toggle-availability`) | ✅ | ✅ | ❌ 401 |
| **Sales Analytics & Revenue** (`GET /admin/analytics`) | ✅ | ❌ 403 | ❌ 401 |
| **Café Profile & Tax Settings** (`GET/PATCH /admin/settings`) | ✅ | ❌ 403 | ❌ 401 |
| **Menu Item Creation & Pricing** (`POST/DELETE /admin/menu/items`) | ✅ | ❌ 403 | ❌ 401 |
| **Table Management & QR Regenen** (`POST /admin/tables/:id/regenerate-token`) | ✅ | ❌ 403 | ❌ 401 |
| **Batch Printable QR Sheets** (`GET /admin/tables/printable`) | ✅ | ❌ 403 | ❌ 401 |
| **Staff Account Administration** (`GET/POST /admin/staff`) | ✅ | ❌ 403 | ❌ 401 |

Passwords are encrypted with `bcryptjs` using 10 salt rounds. Session tokens are signed via JWT with tenant scoping (`restaurantId`) embedded in the claims.

---

## 🍽️ Table-Specific Recommendations (“Guests here often order…”)

Unlike generic recommendation carousels, Sentosa incorporates an editorial table-history feature:

- **Location-Specific Context**: When a customer sits at Table 05, the application highlights the dishes historically ordered most frequently by patrons who sat at Table 05.
- **Cold-Start Fallback Architecture**: If a table is newly added or has fewer than 2 distinct historical orders, the algorithm automatically falls back to restaurant-wide bestsellers to maintain a seamless presentation.
- **Direct Add-to-Cart**: Guests can tap **"+ Quick Add"** directly on the recommendation cards to instantly add favorites to their tray.

```typescript
// Conceptual aggregation algorithm in server/src/controllers/menu.ts
const tableFavorites = await prisma.orderItem.groupBy({
  by: ['menuItemId'],
  where: {
    order: {
      tableId: currentTable.id,
      paymentStatus: 'COMPLETED',
      status: { notIn: ['CANCELLED'] }
    }
  },
  _sum: { quantity: true },
  orderBy: { _sum: { quantity: 'desc' } },
  take: 4,
});
```

---

## ⚡ Real-Time WebSocket Architecture

Real-time bidirectional communication is powered by **Socket.IO**:

```
 ┌──────────────────────┐                     ┌──────────────────────┐
 │   Customer Client    │                     │   Kitchen POS KDS    │
 └──────────┬───────────┘                     └──────────▲───────────┘
            │                                            │
   (Order Placed / Paid)                          (Audio Chime)
            │                                            │
            ▼                                            │
 ┌───────────────────────────────────────────────────────┴───────────┐
 │                     Node.js Socket.IO Server                      │
 │   Rooms: restaurant:{restaurantId}  |  table:{tableId}            │
 └───────────────────────────────────────────────────────────────────┘
```

- **Room Scoping**: Sockets join rooms partitioned by restaurant (`restaurant:${restaurantId}`) and dining table (`table:${tableId}`).
- **Event Lifecycle**:
  - `order:created` $\rightarrow$ Broadcasts new paid order ticket to kitchen displays with table number, items, modifiers, and instructions.
  - `order:status_updated` $\rightarrow$ Pushes state transitions (`PREPARING`, `READY`, `SERVED`) to the customer's mobile tracker.
  - `waiter:call` $\rightarrow$ Emits table assistance request and triggers kitchen audio chime.
  - `waiter:status_updated` $\rightarrow$ Updates customer tracking status from *Calling* to *Acknowledged* to *Resolved*.
  - `menu:item_updated` $\rightarrow$ Syncs sold-out toggles and price updates across all connected customer menus without requiring a page refresh.

---

## 🛠️ Tech Stack

### Frontend Client
- **Framework**: React 18.3 with TypeScript
- **Bundler & Tooling**: Vite 6.4 with Hot Module Replacement (HMR)
- **Styling**: Tailwind CSS 3.4 with custom typography and warm editorial palette
- **Icons**: Lucide React
- **Real-Time Client**: Socket.IO Client 4.8
- **Audio**: Native Web Audio API Synthesizer (oscillator-based notification chimes)
- **Animations & Effects**: Canvas Confetti for celebratory payment confirmations

### Backend Server
- **Runtime**: Node.js 22+ with TypeScript 5.7
- **Framework**: Express 4.21
- **Database ORM**: Prisma 6.4
- **Real-Time Gateway**: Socket.IO 4.8
- **Validation**: Zod 3.24 for runtime schema enforcement
- **Security & Auth**: bcryptjs 3.0, jsonwebtoken 9.0, Node.js `crypto` (HMAC-SHA256)
- **Payment Gateway**: Razorpay Node SDK 2.9
- **QR Engine**: node-qrcode 1.5 (SVG & PNG generation)

### Database & Storage
- **Database**: PostgreSQL 16
- **Migrations**: Prisma Migrate with version-controlled schema tracking
- **Seed Scripts**: TypeScript database seeder (`prisma/seed.ts`)

---

## 📁 Project Structure

```
sentosa-qr-ordering/
├── client/                           # React 18 + Vite Frontend SPA
│   ├── public/                       # Static public assets, fonts, brand illustrations
│   ├── src/
│   │   ├── components/               # UI components (Menu, Cart, Modals, Navbar, Status)
│   │   ├── contexts/                 # React Contexts (CustomerAuth, Cart, Socket)
│   │   ├── pages/                    # Views (Menu, OrderStatus, AdminLogin, KitchenPOS)
│   │   ├── services/                 # API client, WebSocket client, audio synthesizer
│   │   ├── types/                    # Shared TypeScript interfaces & types
│   │   ├── App.tsx                   # Main router configuration
│   │   └── main.tsx                  # Application bootstrap
│   ├── index.html                    # SPA HTML entrypoint
│   ├── tailwind.config.js            # Tailwind theme tokens & color system
│   └── vite.config.ts                # Vite proxy & build configuration
│
├── server/                           # Node.js + Express + Prisma API
│   ├── prisma/
│   │   ├── migrations/               # PostgreSQL database migrations
│   │   ├── schema.prisma             # Relational data schema & constraints
│   │   └── seed.ts                   # Demo restaurant, tables, categories & menu seeder
│   ├── src/
│   │   ├── config/                   # Environment variables & constants
│   │   ├── controllers/              # Business logic (auth, orders, menu, payments, waiter)
│   │   ├── middleware/               # Auth, RBAC, tenant scoping, error handlers
│   │   ├── routes/                   # Express route definitions
│   │   ├── services/                 # Razorpay, Socket.IO, QR generation services
│   │   ├── utils/                    # Price calculation, HMAC verification, validators
│   │   └── index.ts                  # Server initialization & HTTP/WebSocket binding
│   └── tests/                        # Vitest automated test suites & verification scripts
│       ├── crypto.test.ts            # HMAC-SHA256 signature verification tests
│       ├── pricing.test.ts           # Authoritative price calculation tests
│       ├── security.test.ts          # Tenant isolation & table security tests
│       ├── customer_auth.test.ts     # Mobile OTP auth & session security tests
│       ├── table_favorites.test.ts   # Table recommendation engine tests
│       ├── rbac_authorization.ts     # Complete RBAC permission matrix verification
│       ├── production_security_audit.ts # Security audit & webhook signature verification
│       └── e2e_verification.ts       # Full end-to-end customer & staff flow verification
├── brag-output/                      # Product launch demo video, poster & share assets
│   ├── brag.mp4                      # 1080p Launch Video & Product Walkthrough (21s)
│   ├── brag.jpg                      # High-resolution 1080p poster frame
│   └── share-copy.txt                # Curated launch copy variants
├── brand-references/                 # Sentosa brand design tokens & illustrations
├── .env.example                      # Root environment configuration template
├── .gitignore                        # Production-grade git ignore configuration
├── package.json                      # Root workspace scripts (npm run dev, test, migrate)
├── start.sh                          # Automated local bootstrapper script
└── commands.txt                      # Developer cheat sheet & endpoint reference
```

---

## ⚙️ Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: PostgreSQL 14+ running locally or cloud-hosted (Supabase, Neon, AWS RDS)

### 1. Clone the Repository
```bash
git clone https://github.com/TakshakSinghania/qr.git
cd qr
```

### 2. Install Dependencies
Install dependencies for root, server, and client:
```bash
npm install
```

### 3. Configure Environment Variables
Copy the example environment files:
```bash
cp .env.example server/.env
cp client/.env.example client/.env
```

---

## 🔐 Environment Variables

### Backend Server (`server/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql://postgres:password@localhost:5432/sentosa_cafe` | PostgreSQL connection string |
| `PORT` | No | `4000` | Backend HTTP API port |
| `NODE_ENV` | No | `development` | Environment mode (`development` or `production`) |
| `JWT_SECRET` | **Yes** | `dev-jwt-secret-cafe-qr-system-2025-very-long` | Secret key for signing admin and staff JWTs |
| `APP_URL` | **Yes** | `http://localhost:5173` | Frontend customer menu URL (embedded in table QR codes) |
| `API_URL` | **Yes** | `http://localhost:4000` | Public backend API URL |
| `RAZORPAY_KEY_ID` | No | `rzp_test_demokey12345` | Razorpay Key ID (optional in sandbox mode) |
| `RAZORPAY_KEY_SECRET` | No | `demosecretkey1234567890` | Razorpay Secret Key (optional in sandbox mode) |
| `RAZORPAY_WEBHOOK_SECRET`| No | `demowebhooksecret12345` | Razorpay Webhook Secret |
| `RAZORPAY_MOCK_SANDBOX` | No | `true` | When `true`, enables one-click instant sandbox checkout |

### Frontend Client (`client/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | No | `""` | Base API URL (empty string defaults to Vite dev proxy `/api`) |
| `VITE_WS_URL` | No | `""` | WebSocket server URL (empty string defaults to window origin) |

---

## 🗄️ Database & Prisma Setup

Apply migrations to initialize the schema and populate the database with demonstration data (restaurant, 10 dining tables, menu categories, 19 signature dishes, customization modifiers, and staff accounts):

```bash
# Push schema migrations to PostgreSQL
npm run db:migrate

# Seed demo restaurant, menu items, and admin credentials
npm run db:seed
```

---

## 🚀 Running Client & Server

### Single-Command Start (Concurrently)
From the repository root, start both the Express API and the Vite frontend:
```bash
npm run dev
```

Alternatively, use the convenience bootstrapper script:
```bash
./start.sh
```

### Access URLs & Test Credentials

| Portal | URL | Credentials / Notes |
| :--- | :--- | :--- |
| **Table 05 Customer Menu (Primary Demo)** | [http://localhost:5173/menu/sentosa/t/tbl_q7r8s9t0](http://localhost:5173/menu/sentosa/t/tbl_q7r8s9t0) | Live QR entrypoint for Table 05 |
| **Demo Café Menu** | [http://localhost:5173/menu/demo-cafe/t/tbl_q7r8s9t0](http://localhost:5173/menu/demo-cafe/t/tbl_q7r8s9t0) | Alternate restaurant slug |
| **Table Hub Navigator** | [http://localhost:5173/](http://localhost:5173/) | Visual table picker for testing all 10 tables |
| **Kitchen POS & Admin Dashboard** | [http://localhost:5173/admin](http://localhost:5173/admin) | **Manager**: `admin@democafe.com` / `admin123`<br />**Staff**: `staff@democafe.com` / `staff123` |
| **Backend REST API** | [http://localhost:4000/api](http://localhost:4000/api) | Health check: [http://localhost:4000/api/health](http://localhost:4000/api/health) |

---

## 🧪 Test Suites & Verification

The repository includes comprehensive automated unit, integration, RBAC, and end-to-end acceptance tests:

```bash
# Run Vitest test suites (Unit, HMAC crypto, Pricing, Customer Auth, Table Favorites)
cd server && npm test
```

### Standalone Security & Verification Suites
```bash
# 1. Complete End-to-End Acceptance Journey (17/17 tests passed)
cd server && npx tsx tests/e2e_verification.ts

# 2. RBAC Authorization Matrix (37/37 tests passed)
cd server && npx tsx tests/rbac_authorization.ts

# 3. Production Security Audit & Webhook Signature Tests (20/20 tests passed)
cd server && npx tsx tests/production_security_audit.ts

# 4. Multi-Order Persistence & Customer History Verification
cd server && npx tsx tests/multi_order_flow_verification.ts
```

---

## 🔒 Security Architecture

Sentosa was designed with security as a core architectural principle:

1. **Authoritative Price Integrity Engine**: Clients cannot manipulate item prices, taxes, or total amounts. The server queries the database directly for item prices and add-on modifier costs, recalculating all figures server-side.
2. **Cryptographic Payment Signature Verification**: Webhooks and payment callbacks verify standard HMAC-SHA256 signatures before transitioning an order from `PENDING` to `CONFIRMED`.
3. **Unguessable Table Session Tokens**: Dining tables are accessed via high-entropy tokens (`tbl_q7r8s9t0`) rather than auto-incrementing integer IDs, preventing sequential enumeration attacks.
4. **Table Token Invalidation & Rotation**: Managers can instantly rotate a table's QR token from the admin panel; previously scanned tokens are immediately revoked.
5. **Multi-Tenant Boundary Scoping**: All database queries inside administrative controllers are strictly scoped by the authenticated user's `restaurantId`. Cross-tenant data access is structurally impossible.
6. **Phone-First Identity Verification**: Customer orders and receipts are bound to verified phone numbers via OTP, preventing unauthenticated order tampering.
7. **Input Validation & Sanitization**: Sensitive endpoints enforce schema validation with Zod to block malformed payloads and injection vectors.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
