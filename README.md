

https://github.com/user-attachments/assets/c8bb4b6c-a791-4225-b241-0de07030a4ae

# SENTOSA — THE COFFEE UNIT
## QR Ordering & Restaurant Operations System

```text
███████╗███████╗███╗   ██╗████████╗ ██████╗ ███████╗ █████╗ 
██╔════╝██╔════╝████╗  ██║╚══██╔══╝██╔═══██╗██╔════╝██╔══██╗
███████╗█████╗  ██╔██╗ ██║   ██║   ██║   ██║███████╗███████║
╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║   ██║╚════██║██╔══██║
███████║███████╗██║ ╚████║   ██║   ╚██████╔╝███████║██║  ██║
╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚══════╝╚═╝  ╚═╝
```

[![Demo](https://img.shields.io/badge/Demo-Table_Hub-success?style=flat&logo=coffeescript)](http://localhost:5173/)
[![Node.js Version](https://img.shields.io/badge/Node.js-v20+-green.svg?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748.svg?logo=prisma)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101.svg?logo=socketdotio)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay_Verified-02042B.svg?logo=razorpay)](https://razorpay.com/)
[![Tests](https://img.shields.io/badge/Tests-63_Passing-brightgreen.svg)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [!IMPORTANT]
> **RESTAURANT QR ORDERING & OPERATIONS PLATFORM**  
> **SENTOSA — THE COFFEE UNIT** is a full-stack, mobile-first dining and restaurant operations platform engineered for specialty coffee bars, roasteries, and dine-in restaurants. It combines cryptographically signed tabletop QR tokens (`/t/:tableToken`), lightweight phone-first OTP customer authentication, an authoritative server-side price integrity engine, verified Razorpay payment settlement, real-time WebSocket kitchen dispatch, table-specific historical recommendation modeling, and granular role-based access control (`MANAGER` vs. `STAFF`).

---

## 🎬 Product Demo

https://github.com/user-attachments/assets/PASTE_YOUR_VIDEO_ASSET_ID_HERE

<div align="center">
  <img src="brag-output/brag.jpg" alt="Sentosa Product Walkthrough Poster" width="100%" style="max-width: 860px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.25);" />
  <p><sub><b>Sentosa — The Coffee Unit: 1080p Product Walkthrough & Operations Flow (21s)</b></sub></p>
</div>

---

## Table of Contents

- [Overview](#overview)
- [🎬 Product Demo](#-product-demo)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Core Features](#core-features)
  - [1. Mobile-First Customer Menu & Tabletop QR Handshake](#1-mobile-first-customer-menu--tabletop-qr-handshake)
  - [2. Table-Specific Recommendations ("Guests here often order...")](#2-table-specific-recommendations-guests-here-often-order)
  - [3. Menu Customization & Dietary Indicators](#3-menu-customization--dietary-indicators)
  - [4. Phone-First OTP Authentication & Order Persistence](#4-phone-first-otp-authentication--order-persistence)
  - [5. Authoritative Price Integrity Engine](#5-authoritative-price-integrity-engine)
  - [6. Payment Architecture (Sandbox Mock vs. Real Razorpay)](#6-payment-architecture-sandbox-mock-vs-real-razorpay)
- [Restaurant Operations & Kitchen KDS](#restaurant-operations--kitchen-kds)
  - [1. Live Kitchen Display System (KDS) & Audio Synthesizer](#1-live-kitchen-display-system-kds--audio-synthesizer)
  - [2. Waiter Assistance Dispatch](#2-waiter-assistance-dispatch)
  - [3. Role-Based Access Control (RBAC)](#3-role-based-access-control-rbac)
  - [4. Table Management & Batch Printable QR Stand Sheets](#4-table-management--batch-printable-qr-stand-sheets)
- [Data Flow & State Machines](#data-flow--state-machines)
- [Real-Time WebSocket Communication](#real-time-websocket-communication)
- [Database Schema & Prisma ORM](#database-schema--prisma-orm)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Local Development & Setup](#local-development--setup)
- [Environment Variables](#environment-variables)
- [Automated Testing & Security Audit](#automated-testing--security-audit)
- [Demo Data Notice](#demo-data-notice)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## Overview

Physical paper menus create service bottlenecks, order modifications are prone to human miscommunication, bill settlement introduces dining delays, and table turnover suffers. Conversely, generic QR menu SaaS products degrade the dining atmosphere by forcing app installations, complex email/password registrations, or exposing sequential table URLs that permit malicious guests to tamper with other tables.

**Sentosa — The Coffee Unit** re-engineers the dine-in experience from the ground up:
- **Zero-Friction Dining**: Guests scan an unguessable 16-character cryptographic table token, browse a bespoke editorial menu, customize complex drink recipes (milks, shots, syrups), and authenticate with a simple 6-digit phone OTP.
- **Authoritative Price Integrity**: Client-submitted cart subtotals and taxes are strictly ignored. The backend queries PostgreSQL directly to recalculate item totals, modifier costs, and GST taxes.
- **Verified Settlement**: Payments are verified cryptographically via RFC 2104 HMAC-SHA256 signatures before transitioning to kitchen tickets. Includes a built-in sandbox mock for instant local evaluation.
- **Continuous Multi-Order Persistence**: Guests can tap *"Add More Items"* at any point. Active kitchen orders remain persistently visible through floating status badges and customer order history.
- **Live Kitchen Operations**: Tickets arrive instantaneously over WebSockets with Web Audio API synthesizer chimes, allowing staff to transition orders through atomic state transitions (`CONFIRMED` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `SERVED`).
- **Tabletop Assistance**: Integrated waiter calling allows guests to request water, cutlery, or bills with automated anti-spam debouncing.

---

## System Architecture

```text
+----------------------------------------------------------------------------------------------------+
|                                         CLIENT LAYER                                               |
|                                                                                                    |
|   +---------------------------------------+         +------------------------------------------+   |
|   |   Customer Mobile Web App (SPA)       |         |   Restaurant Operations & POS Dashboard  |   |
|   |   - Tabletop QR Token Handshake       |         |   - Live Kanban Kitchen Display (KDS)    |   |
|   |   - Table Recommendations Engine      |         |   - Audio Synthesizer Chime Engine       |   |
|   |   - Multi-Option Drink Customization  |         |   - Waiter Request Dispatch              |   |
|   |   - Phone-First OTP Authentication    |         |   - Real-Time Sold-Out Stock Toggles     |   |
|   |   - Razorpay Standard / Sandbox Modal |         |   - Batch Printable QR Stand Generator   |   |
|   |   - Real-Time Order Status Tracker    |         |   - RBAC Protected Settings & Analytics  |   |
|   +---------------------------------------+         +------------------------------------------+   |
+---------------------------------------------------|------------------------------------------------+
                                                    |
                                    (HTTP REST API / WebSocket)
                                                    |
                                                    v
+----------------------------------------------------------------------------------------------------+
|                                    BACKEND API SERVER                                              |
|                               (Node.js 20+ / Express 4.21)                                         |
|                                                                                                    |
|  - Token Bucket Rate Limiters (Auth, Orders, Webhooks)    - Unguessable Table Token Resolver       |
|  - Phone OTP Authentication Service                       - Authoritative Price & Tax Engine       |
|  - Cryptographic Session Validator                        - Order Lifecycle State Machine          |
|  - Multi-Tenant Boundary Isolation Middleware             - JWT Session & Bcrypt Authenticator     |
+--------------------------+------------------------------------------------+------------------------+
                           |                                                |
                           v                                                v
+----------------------------------------------------+    +------------------------------------------+
|            PERSISTENCE & DATA LAYER                |    |         REAL-TIME & INTEGRATIONS         |
|              (PostgreSQL 16 + Prisma)              |    |                                          |
|                                                    |    |  - Socket.IO 4.8 Bi-Directional Gateway  |
|  - Relational Schema with Foreign Key Constraints  |    |  - Room Scoping (restaurant & table)     |
|  - Historic Price & Name Snapshots on Order Items  |    |  - Razorpay Node SDK (Order Creation)    |
|  - Table-Specific Order Frequency Aggregations     |    |  - HMAC-SHA256 Signature Verification    |
|  - Multi-Tenant Data Partitioning (restaurantId)   |    |  - Webhook Idempotency Processor         |
+----------------------------------------------------+    +------------------------------------------+
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React.js | 18.3.1 | Component-driven UI architecture with Fast Refresh |
| **Build & Tooling** | Vite | 6.1.1 | Instant HMR development server and optimized rollup production bundles |
| **Type Safety** | TypeScript | 5.7.3 | Strict static typing across client, backend services, and test suites |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first styling with custom typography and warm editorial palette |
| **UI Components & Icons** | Lucide React | 0.475.0 | Clean, lightweight SVG icon system |
| **Visual Effects** | Canvas Confetti | 1.9.4 | Canvas-based celebratory particle animations on payment success |
| **Backend Framework** | Node.js / Express | 20+ / 4.21.2 | High-throughput REST API routing and middleware pipeline |
| **Database ORM** | Prisma ORM | 6.4.1 | Type-safe database queries, relation modeling, and schema migrations |
| **Database** | PostgreSQL | 16.x | Relational ACID-compliant storage with multi-column indexing |
| **Real-Time Gateway** | Socket.IO / Client | 4.8.1 | Bi-directional WebSocket transport with partitioned room broadcasting |
| **Payment Gateway** | Razorpay SDK | 2.9.5 | Official Razorpay order generation and HMAC payment verification |
| **QR Code Engine** | node-qrcode | 1.5.4 | Dynamic vector SVG and PNG generation for tabletop acrylic stands |
| **Input Validation** | Zod | 3.24.2 | Runtime schema validation for order payloads and authentication requests |
| **Security & Cryptography** | bcryptjs / JWT | 3.0.2 / 9.0.2 | Password hashing with 10 salt rounds and tenant-scoped JWT auth |
| **Testing Framework** | Vitest / Supertest | 3.0.5 / 7.0.0 | High-performance unit, integration, and security verification suites |

---

## Core Features

### 1. Mobile-First Customer Menu & Tabletop QR Handshake
* **Unguessable URL Tokens**: Rather than sequential table identifiers (`?table=1`), each dining table is addressed by a high-entropy 16-character alphanumeric token:
  ```text
  http://localhost:5173/menu/:restaurantSlug/t/:tableToken
  ```
* **Session Handshake**: Visiting the URL invokes `GET /api/menu/:restaurantSlug/t/:tableToken`, which verifies table validity, issues an active table session token, and returns the current categorized menu.
* **Responsive Mobile Optimization**: Tailored specifically for modern mobile viewports (360px – 430px) with iOS safe-area insets, anti-zoom touch interactions, and floating persistent cart controls.

### 2. Table-Specific Recommendations ("Guests here often order...")
Near the top of the menu, an editorial section highlights popular items based on dining history:
* **Contextual Table Memory**: Aggregates completed historical orders specifically tied to the table the customer is currently seated at.
* **Cold-Start Fallback**: If a table has fewer than 2 distinct historical orders, the engine automatically falls back to cafe-wide bestsellers to ensure an engaging visual layout.
* **Quick Add**: Guests can add recommendations directly to their cart tray with a single tap.

```typescript
// Conceptual table aggregation query in server/src/controllers/menu.ts
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

### 3. Menu Customization & Dietary Indicators
* **FSSAI Dietary Markers**: Standardized square-bordered visual indicators for **Vegetarian** (green circle), **Non-Vegetarian** (brown triangle), and **Vegan** (green leaf).
* **Multi-Group Modifiers**: Menu items support nested customization groups (e.g. *Choice of Milk*, *Espresso Shots*, *Sweetness Level*):
  * **Single Selection** (`SINGLE`): Radio selection with min/max constraint of 1.
  * **Multi Selection** (`MULTI`): Checkbox selection with configurable maximum selections.
* **Snapshot Integrity**: Modifier names and price additions are snapshotted permanently into `OrderItemCustomization` records upon order placement. Future menu edits never alter past receipts.

### 4. Phone-First OTP Authentication & Order Persistence
* **Passwordless Mobile Login**: Guests do not manage passwords or usernames. Entering name and mobile number dispatches a 6-digit OTP.
* **Dual OTP Architecture**:
  * **Development Provider**: In development mode (`NODE_ENV=development`), OTP codes are logged cleanly to the console with ASCII formatting for instant local testing.
  * **Production SMS Provider**: Pluggable architecture ready for transactional SMS gateways (Twilio / Fast2SMS / MSG91).
* **Unified Order History**: Verifying the phone number associates all subsequent orders with that customer profile, enabling persistent tracking across multiple ordering rounds.

### 5. Authoritative Price Integrity Engine
The client application never dictates financial values. When placing an order (`POST /api/orders`), the client transmits only item IDs, quantities, and chosen customization option IDs:
1. The server fetches current item base prices from PostgreSQL.
2. The server verifies that each requested item and customization option is active (`isAvailable: true`).
3. The server computes item line totals, subtotal, 5% GST (`taxAmount`), and grand total.
4. If a client tampers with prices in browser storage or network payloads, the manipulated prices are completely discarded in favor of authoritative database values.

$$\text{Subtotal} = \sum_{i=1}^{n} \left( \text{BasePrice}_i + \sum \text{ModifierPrice}_{i,j} \right) \times \text{Qty}_i$$
$$\text{TaxAmount} = \text{Subtotal} \times \frac{\text{TaxRate}}{100} \quad (\text{Default: } 5.0\%)$$
$$\text{TotalAmount} = \text{Subtotal} + \text{TaxAmount} + \text{ServiceCharge}$$

### 6. Payment Architecture (Sandbox Mock vs. Real Razorpay)
The payment gateway service supports both real-world payment settlement and friction-free portfolio demonstrations:

```text
[ Customer Checkout ] 
         │
         ├── RAZORPAY_MOCK_SANDBOX=true ──> Internal HMAC-SHA256 Test Generator
         │                                       │
         └── RAZORPAY_MOCK_SANDBOX=false ─> Official Razorpay Checkout Modal (UPI/Cards)
                                                 │
                                                 v
                                    [ POST /api/payments/verify ]
                                                 │
                                                 v
                            HMAC-SHA256(order_id + "|" + payment_id, secret)
                                                 │
                                   ┌─────────────┴─────────────┐
                                   │                           │
                               [ Valid ]                   [ Invalid ]
                                   │                           │
                                   v                           v
                       Order: CONFIRMED             HTTP 400 Bad Request
                       Payment: COMPLETED           Transaction Aborted
```

* **Live Razorpay Integration**: When supplied with authentic `rzp_live_*` or `rzp_test_*` keys, the client invokes Razorpay's Standard Checkout modal for real UPI apps (GPay, PhonePe, Paytm), NetBanking, and Cards.
* **Sandbox Mock Mode (`RAZORPAY_MOCK_SANDBOX=true`)**: Allows developers and recruiters to execute the complete end-to-end payment verification cycle locally without configuring merchant accounts. The server cryptographically validates a test HMAC signature before transitioning the order to `CONFIRMED`.
* **Webhook Signature Verification**: Production webhook endpoint (`POST /api/payments/webhook`) validates `X-Razorpay-Signature` against the raw request body with built-in idempotency protection.

---

## Restaurant Operations & Kitchen KDS

### 1. Live Kitchen Display System (KDS) & Audio Synthesizer
* **Acoustic Alerts**: The admin portal uses the browser's native **Web Audio API** synthesizer (`AudioContext`) to generate an pleasant dual-tone chime (800Hz $\rightarrow$ 1200Hz) when new tickets arrive or waiters are called. No external audio files required.
* **Operational Columns**: Orders flow across a dedicated Kanban board:
  * **New Orders (`CONFIRMED`)**: Freshly settled tickets awaiting barista pickup.
  * **In Preparation (`PREPARING`)**: Active orders with elapsed minute counters.
  * **Ready for Serving (`READY`)**: Completed orders waiting for table runner.
  * **Served (`SERVED`)**: Delivered orders archived to daily sales metrics.
* **Instant Stock Toggling**: Kitchen staff can toggle any menu item to **Sold Out** with one click. A WebSocket event (`menu:updated`) propagates instantly to all connected customer devices, disabling the item in real-time.

### 2. Waiter Assistance Dispatch
Guests can summon table service directly from the mobile navigation bar:
* **Preset Request Types**: *Refill Water*, *Extra Napkins & Cutlery*, *Request the Check*, *Staff Assistance*, or optional freeform notes.
* **Anti-Spam Throttling**: Rate-limiting middleware rejects duplicate waiter calls from the same table within 60 seconds with `409 Conflict`.
* **Lifecycle Synchronization**: Waiter calls progress through `PENDING` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `RESOLVED`, updating both customer and staff screens simultaneously.

### 3. Role-Based Access Control (RBAC)

The administrative portal enforces a strict permission boundary between store management and operational staff:

| Administrative Endpoint | `MANAGER` | `STAFF` | Unauthenticated |
|---|:---:|:---:|:---:|
| **Live Kitchen KDS** (`GET /api/admin/orders/live`) | ✅ | ✅ | ❌ 401 |
| **Update Order State** (`PATCH /api/admin/orders/:id/status`) | ✅ | ✅ | ❌ 401 |
| **View Waiter Requests** (`GET /api/admin/waiter-requests`) | ✅ | ✅ | ❌ 401 |
| **Acknowledge / Resolve Waiter** (`PATCH /api/admin/waiter-requests/:id/status`) | ✅ | ✅ | ❌ 401 |
| **Toggle Item Sold-Out** (`PATCH /api/admin/menu/items/:id/toggle-availability`) | ✅ | ✅ | ❌ 401 |
| **Sales & Financial Analytics** (`GET /api/admin/analytics`) | ✅ | ❌ 403 | ❌ 401 |
| **Cafe Settings & Tax Configuration** (`GET/PATCH /api/admin/settings`) | ✅ | ❌ 403 | ❌ 401 |
| **Menu Item Creation & Price Edits** (`POST/PATCH/DELETE /api/admin/menu/items`) | ✅ | ❌ 403 | ❌ 401 |
| **Table Management & Token Rotation** (`POST /api/admin/tables/:id/regenerate-token`) | ✅ | ❌ 403 | ❌ 401 |
| **Batch Printable QR Sheets** (`GET /api/admin/tables/printable`) | ✅ | ❌ 403 | ❌ 401 |
| **Staff Account Administration** (`GET/POST /api/admin/staff`) | ✅ | ❌ 403 | ❌ 401 |

### 4. Table Management & Batch Printable QR Stand Sheets
* **Single Table Downloads**: Download high-resolution PNG or SVG QR codes for tabletop acrylic stands or stickers.
* **Batch Printable Sheets**: Generates a print-ready multi-table grid sheet (`Ctrl+P` / `Cmd+P`) formatted with cutting guidelines, table numbers, cafe branding, and "Scan to Order" instructions for physical cafe deployment.
* **Instant Token Invalidation**: If a table's QR token is compromised, a manager can regenerate the token with one click. All previously printed tokens for that table are immediately invalidated.

---

## Data Flow & State Machines

### Order State Machine
```text
               ┌───────────────┐
               │    PENDING    │ (Cart submitted, awaiting payment)
               └───────┬───────┘
                       │ Payment Verified (HMAC-SHA256)
                       v
               ┌───────────────┐
               │   CONFIRMED   │ (Paid, ticket pushed to Kitchen KDS)
               └───────┬───────┘
                       │ Barista begins prep
                       v
               ┌───────────────┐
               │   PREPARING   │ (Active kitchen ticket with elapsed timer)
               └───────┬───────┘
                       │ Food/Beverage ready for runner
                       v
               ┌───────────────┐
               │     READY     │ (Customer notified on tracking screen)
               └───────┬───────┘
                       │ Delivered to table
                       v
               ┌───────────────┐
               │    SERVED     │ (Archived into daily sales ledger)
               └───────────────┘
```

> **State Guardrails**: The backend rejects illegal transitions. Unpaid orders cannot be moved to `PREPARING`, and completed `SERVED` orders cannot be regressed back into production.

---

## Real-Time WebSocket Communication

Real-time bidirectional synchronization is orchestrated via **Socket.IO**:

### Room Topology
* `restaurant:${restaurantId}`: Subscribed by kitchen displays and staff POS terminals.
* `order:${orderToken}`: Subscribed by individual customer smartphones for private tracking.

### Event Reference
| Event Name | Direction | Payload | Purpose |
|---|---|---|---|
| `join:restaurant` | Client $\rightarrow$ Server | `restaurantId` | Staff terminal joins restaurant broadcast channel |
| `join:order` | Client $\rightarrow$ Server | `orderToken` | Customer phone joins private order tracking room |
| `order:new` | Server $\rightarrow$ Staff | `OrderWithItems` | Notifies KDS of newly confirmed, paid dining order |
| `order:status_updated` | Server $\rightarrow$ Both | `{ orderId, status }` | Synchronizes state transitions (`PREPARING`, `READY`, `SERVED`) |
| `menu:updated` | Server $\rightarrow$ Customer | `{}` | Prompts customer menus to re-fetch stock availability |
| `waiter:new` | Server $\rightarrow$ Staff | `WaiterRequest` | Dispatches table assistance request with audio chime |
| `waiter:status_updated` | Server $\rightarrow$ Both | `{ id, status }` | Syncs waiter request resolution across devices |

---

## Database Schema & Prisma ORM

The application models its relational data using **Prisma ORM** targeting **PostgreSQL 16**:

```text
Restaurant (1) ────────< Table (N) ────────< Order (N) ────────< OrderItem (N)
     │                       │                   │                     │
     ├──< MenuCategory (N)   └──< OrderSession   ├──< Payment (N)      └──< OrderItemCustomization (N)
     │         │                                 │
     │         └──< MenuItem (N)                 └──< Customer (Optional)
     │                   │
     │                   └──< CustomizationGroup (N) ──< CustomizationOption (N)
     │
     ├──< User (Staff / Manager)
     ├──< CustomerOtp (Phone verification codes)
     └──< WaiterRequest (Table assistance requests)
```

### Relational Schema Highlights
* **Snapshot Storage**: `OrderItem` stores `nameSnapshot` and `priceSnapshot`, while `OrderItemCustomization` stores `groupName`, `optionName`, and `priceAddition`. This guarantees historical accounting accuracy even if catalog prices or item names change later.
* **Compound Indices**: Optimized index strategies (`@@index([restaurantId, status])`, `@@index([tableId, paymentStatus, status, createdAt])`) ensure sub-millisecond query performance on live KDS boards and table recommendation queries.

---

## Project Structure

```text
sentosa-qr-ordering/
├── client/                               # React 18 + Vite Frontend Application
│   ├── public/                           # Brand photography, fonts, illustrations
│   ├── src/
│   │   ├── components/                   # Modular React UI components
│   │   │   ├── admin/                    # KDS OrderCard, CustomizationModal, PrintableQrSheet
│   │   │   ├── common/                   # VegBadge, ErrorBoundary, loading states
│   │   │   └── customer/                 # MenuHeader, MenuItemCard, CartDrawer, Modals
│   │   ├── contexts/                     # React contexts (CartContext, CustomerAuthContext, AuthContext)
│   │   ├── pages/                        # Route view pages (CustomerMenu, OrderTracking, AdminPOS)
│   │   ├── services/                     # Axios API clients, Socket.IO listeners, Web Audio synth
│   │   ├── types/                        # TypeScript domain interfaces and schemas
│   │   ├── App.tsx                       # Client application router
│   │   └── main.tsx                      # Vite React entrypoint
│   ├── tailwind.config.js                # Editorial theme colors, typography, safe-area tokens
│   └── vite.config.ts                    # Vite proxy routing and rollup build configurations
│
├── server/                               # Node.js + Express + TypeScript API Engine
│   ├── prisma/
│   │   ├── migrations/                   # Tracked PostgreSQL migration history
│   │   ├── schema.prisma                 # Relational data schema & index definitions
│   │   └── seed.ts                       # Demonstration restaurant, tables, dishes & admin seeder
│   ├── src/
│   │   ├── config/                       # Environment configuration & constants
│   │   ├── controllers/                  # Core controllers (menu, order, payment, waiter, admin, auth)
│   │   ├── middleware/                   # Rate limiters, JWT authentication, RBAC, tenant scoping
│   │   ├── routes/                       # Express router endpoint definitions
│   │   ├── services/                     # Razorpay gateway, Socket.IO server, QR generator, OTP services
│   │   ├── utils/                        # Authoritative price calculation, phone normalization, crypto HMAC
│   │   └── index.ts                      # Server bootstrap & HTTP/WebSocket binding
│   └── tests/                            # Vitest test suites & automated security audits
│       ├── crypto.test.ts                # HMAC-SHA256 payment signature verification
│       ├── pricing.test.ts               # Authoritative price integrity & tax verification
│       ├── security.test.ts              # Multi-tenant isolation & table security tests
│       ├── customer_auth.test.ts         # Phone OTP verification & session persistence
│       ├── table_favorites.test.ts       # Table-specific recommendation engine tests
│       ├── rbac_authorization.ts         # Complete 37-point RBAC authorization matrix
│       ├── production_security_audit.ts  # Webhook signature & credential guard security audit
│       └── e2e_verification.ts           # 17-step full customer & kitchen operational journey
│
├── brag-output/                          # Product launch assets & promotional copy
│   ├── brag.jpg                          # 1080p high-resolution poster frame
│   ├── share-copy.txt                    # Canonical launch copy
│   └── share-copy-variants.md            # Formatted social copy for X/Twitter and LinkedIn
│
├── brand-references/                     # Original Sentosa brand assets & illustrations
├── .env.example                          # Root environment variable template
├── .gitignore                            # Production-grade git exclusion rules
├── commands.txt                          # Quick-start cheat sheet & endpoint reference
├── start.sh                              # Single-command automated local bootstrapper
└── package.json                          # Workspace orchestration scripts
```

---

## API Reference

### Base URL
```text
http://localhost:4000/api
```

#### 1. Resolve Table & Retrieve Menu
`GET /api/menu/:restaurantSlug/t/:tableToken`
```json
// Response: 200 OK
{
  "restaurant": {
    "name": "Sentosa — The Coffee Unit",
    "currency": "INR",
    "currencySymbol": "₹",
    "taxRate": 5.0
  },
  "table": {
    "tableNumber": "05",
    "capacity": 4
  },
  "tableSessionToken": "tbl_sess_a8b9c0d1e2f3...",
  "categories": [
    {
      "name": "Signature Coffee",
      "items": [
        {
          "id": "cmu_cappuccino_01",
          "name": "Hot Cappuccino",
          "description": "Double espresso with velvety steamed whole milk",
          "price": 179.0,
          "isVeg": true,
          "isAvailable": true,
          "customizationGroups": [...]
        }
      ]
    }
  ]
}
```

#### 2. Query Table-Specific Recommendations
`GET /api/customer/table-favorites?restaurantId=:restaurantId&tableId=:tableId`
```json
// Response: 200 OK
{
  "source": "table_history", // 'table_history' | 'restaurant_popular'
  "items": [
    {
      "id": "cmu_cappuccino_01",
      "name": "Hot Cappuccino",
      "price": 179.0,
      "orderCount": 42
    },
    {
      "id": "cmu_coldbrew_02",
      "name": "16-Hour Cold Brew",
      "price": 199.0,
      "orderCount": 38
    }
  ]
}
```

#### 3. Send Customer Mobile OTP
`POST /api/customer/auth/send-otp`
```json
// Request
{
  "restaurantId": "cmu_sentosa_01",
  "phone": "+91 98765 43210",
  "name": "Aria Montgomery"
}

// Response: 200 OK
{
  "success": true,
  "message": "OTP sent successfully",
  "resendAfterSeconds": 60
}
```

#### 4. Place Customer Order
`POST /api/orders`
```json
// Request (Notice: Client never submits item prices)
{
  "tableSessionToken": "tbl_sess_a8b9c0d1e2f3...",
  "customerName": "Aria Montgomery",
  "customerPhone": "+91 98765 43210",
  "customerNote": "Please make the coffee extra hot",
  "items": [
    {
      "menuItemId": "cmu_cappuccino_01",
      "quantity": 2,
      "selectedOptionIds": ["opt_oat_milk", "opt_double_shot"],
      "specialInstructions": "One with brown sugar"
    }
  ]
}

// Response: 201 Created (Authoritatively calculated)
{
  "orderId": "cmu_order_105",
  "orderNumber": 105,
  "orderToken": "ord_trk_9a8b7c6d...",
  "subtotal": 538.0,
  "taxAmount": 26.9,
  "totalAmount": 564.9,
  "status": "PENDING",
  "gatewayOrderId": "order_razorpay_98124"
}
```

#### 5. Verify Razorpay Payment
`POST /api/payments/verify`
```json
// Request
{
  "orderToken": "ord_trk_9a8b7c6d...",
  "razorpay_order_id": "order_razorpay_98124",
  "razorpay_payment_id": "pay_981234567890",
  "razorpay_signature": "5f8a9e...cryptographic_signature..."
}

// Response: 200 OK
{
  "success": true,
  "status": "CONFIRMED",
  "message": "Payment verified and order pushed to kitchen"
}
```

#### 6. Call Waiter Service
`POST /api/waiter/call`
```json
// Request
{
  "tableSessionToken": "tbl_sess_a8b9c0d1e2f3...",
  "reason": "Refill Water",
  "note": "Two glasses please"
}

// Response: 201 Created
{
  "success": true,
  "requestId": "waiter_req_105",
  "status": "PENDING",
  "message": "Staff have been notified"
}
```

---

## Local Development & Setup

### Prerequisites
* **Node.js**: v18.0.0+ (v20+ recommended)
* **npm**: v9.0.0+
* **PostgreSQL**: PostgreSQL 14+ running locally or cloud-hosted (Supabase / Neon / AWS RDS)

### 1. Clone the Repository
```bash
git clone https://github.com/TakshakSinghania/qr.git
cd qr
```

### 2. Install Dependencies
```bash
# Installs root, client, and server dependencies concurrently
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example server/.env
cp client/.env.example client/.env
```

### 4. Push Database Schema & Seed Data
```bash
# Apply Prisma migrations to PostgreSQL
npm run db:migrate

# Seed Sentosa Cafe, 10 Tables, Categories, 19 Menu Items, and Staff Accounts
npm run db:seed
```

### 5. Start Application
```bash
# Starts Express API (Port 4000) and Vite Client (Port 5173) concurrently
npm run dev
```
*(Or execute `./start.sh` for the automated startup script).*

### 6. Access Endpoints & Test Credentials
* **Customer Table 05 Menu**: [http://localhost:5173/menu/sentosa/t/tbl_q7r8s9t0](http://localhost:5173/menu/sentosa/t/tbl_q7r8s9t0)
* **Table Hub Navigator**: [http://localhost:5173/](http://localhost:5173/) *(Switch between all 10 dining tables)*
* **Kitchen POS & Admin Portal**: [http://localhost:5173/admin](http://localhost:5173/admin)
  * **Manager**: `admin@democafe.com` / `admin123`
  * **Staff**: `staff@democafe.com` / `staff123`
* **Backend API Health Check**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## Environment Variables

### Backend Server (`server/.env`)

| Variable | Type | Default | Description |
|---|:---:|---|---|
| `DATABASE_URL` | String | `postgresql://postgres:password@localhost:5432/sentosa_cafe` | PostgreSQL connection string |
| `PORT` | Number | `4000` | Backend Express HTTP port |
| `NODE_ENV` | String | `development` | Application runtime environment (`development` / `production`) |
| `JWT_SECRET` | String | `dev-jwt-secret-cafe-qr-system-2025-very-long` | High-entropy signing secret for admin/staff JWTs |
| `APP_URL` | String | `http://localhost:5173` | Public customer menu origin (encoded into generated QR codes) |
| `API_URL` | String | `http://localhost:4000` | Public backend API origin |
| `RAZORPAY_KEY_ID` | String | `rzp_test_demokey12345` | Razorpay Key ID (optional in sandbox mode) |
| `RAZORPAY_KEY_SECRET` | String | `demosecretkey1234567890` | Razorpay Key Secret (optional in sandbox mode) |
| `RAZORPAY_WEBHOOK_SECRET` | String | `demowebhooksecret12345` | Secret configured in Razorpay Webhooks dashboard |
| `RAZORPAY_MOCK_SANDBOX` | Boolean | `true` | Enables one-click instant sandbox checkout without real keys |

### Frontend Client (`client/.env`)

| Variable | Type | Default | Description |
|---|:---:|---|---|
| `VITE_API_URL` | String | `""` | Backend API URL (empty string defaults to Vite dev proxy `/api`) |
| `VITE_WS_URL` | String | `""` | WebSocket server URL (empty string defaults to window location) |

---

## Automated Testing & Security Audit

The project maintains comprehensive test coverage across unit logic, cryptographic routines, role authorization matrices, and end-to-end user journeys:

```bash
# Run Vitest test suites (Unit, HMAC Crypto, Pricing, Customer Auth, Table Favorites)
cd server && npm test
```

### Test Suite Breakdown

| Suite | File | Tests | Coverage Scope |
|---|---|:---:|---|
| **Cryptographic Engine** | `tests/crypto.test.ts` | 4 | HMAC-SHA256 signature verification, rejection of tampered tokens |
| **Price Integrity Engine** | `tests/pricing.test.ts` | 4 | Server-side price recalculation, modifier additions, GST tax computation |
| **Multi-Tenant Security** | `tests/security.test.ts` | 9 | Cross-tenant data isolation, unguessable table token validation |
| **Customer OTP Auth** | `tests/customer_auth.test.ts` | 29 | Phone normalization, rate-limited OTP dispatch, session token binding |
| **Table Favorites Engine** | `tests/table_favorites.test.ts` | 17 | Table-specific order frequency aggregation and bestseller fallbacks |
| **Total Automated Unit Tests** | | **63 / 63** | **100% Passing** |

### Standalone Security & Verification Suites
```bash
# 1. RBAC Authorization Matrix (37 passed)
cd server && npx tsx tests/rbac_authorization.ts

# 2. Production Security & Webhook Audit (20 passed)
cd server && npx tsx tests/production_security_audit.ts

# 3. Complete End-to-End Customer & Staff Journey (17 passed)
cd server && npx tsx tests/e2e_verification.ts

# 4. Multi-Order Persistence & Customer History Verification
cd server && npx tsx tests/multi_order_flow_verification.ts
```

---

## Demo Data Notice

> [!NOTE]
> All credentials, telephone numbers, order records, and transaction signatures in this repository are **simulated demonstration fixtures**. Seed data utilizes standard non-production credentials (`admin@democafe.com` / `admin123`) intended strictly for local development and technical evaluation. Real payment processing requires configuring valid merchant keys and disabling `RAZORPAY_MOCK_SANDBOX`.

---

## Future Improvements

- [ ] **Thermal Receipt Printer Integration**: Direct hardware printing support via ESC/POS protocol for kitchen expediter tickets.
- [ ] **Split Bill & Pay-by-Seat**: Capability for multiple seated diners to pay their portion of the table check independently.
- [ ] **Table Reservation System**: Floorplan booking module with integrated SMS confirmation and turn-time predictions.
- [ ] **Multi-Language Localization**: Internationalization (i18n) support for global cafe deployments.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

Designed and engineered by **Takshak Singhania**.
