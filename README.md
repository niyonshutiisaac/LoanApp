<div align="center">

# LoanApp 

**A Full-Stack Business Management Platform for Small Shops — Mobile-First, Offline-Ready, and Built for the Realities of East African Retail.**

[![Expo](https://img.shields.io/badge/Expo-React_Native-4630EB?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

<div align="center">

## 📖 Table of Contents

[The Problem](#-the-problem) · [The Solution](#-the-solution) · [Key Features](#-key-features) · [Tech Stack](#-tech-stack) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [Demo Credentials](#-demo-credentials) · [API Contract](#-api-contract) · [Deployment](#-deployment) · [Known Simplifications](#-known-v1-simplifications) · [Performance Notes](#-performance-notes) · [Roadmap](#-roadmap) · [Contributing](#-contributing) · [License](#-license) · [Contact](#-contact)

</div>

---

## 🎯 The Problem

Small shop owners across East Africa run their businesses on memory and paper. They track stock in their heads, record sales in notebooks, and manage customer credit (informal loans) through trust and WhatsApp messages. This leads to:

- **Stockouts and Overstocking:** No real-time visibility into what’s selling and what’s sitting on the shelf.
- **Lost Revenue:** Untracked customer debts and missed payments drain cash flow.
- **No Financial Clarity:** Owners cannot see daily profit, top products, or expense trends without manual tallying.
- **Fragmented Tools:** Existing POS systems are either too expensive, desktop-only, or require constant internet—unrealistic for a shop with intermittent connectivity.

---

## 💡 The Solution

**LoanApp** is a **mobile-first, full-stack shop management system** that gives small business owners a single tool to manage products, sales, purchases, payments, expenses, and customer credit—all from their phone.

It is built as a **monorepo** with two tightly integrated parts:

1.  **A React Native (Expo) Mobile App:** The primary interface for shop owners and staff. It supports both a **mock mode** (for offline/demo use) and a **live API mode** that connects to the backend.
2.  **A TypeScript/Express Backend:** A production-grade API backed by PostgreSQL and Prisma. It mirrors the mobile app’s mock service contract exactly, so switching from mock to live is a single environment variable change.

The system is designed to be **deployed affordably** (Neon for database, Render for API) and to **scale with data volume** rather than shop count, thanks to SQL-level filtering, pagination, and atomic transaction design.

---

## ✨ Key Features

- **📱 Mobile-First Experience (Expo/React Native):** A native app with tab-based navigation, authentication flows, and dedicated screens for every core business operation.
- **🔄 Dual-Mode Data Layer:** The mobile app ships with a complete mock service layer (`mobile/src/services/mock/*`) for offline demos, and an HTTP client (`mobile/src/services/api/httpClient.ts`) that talks to the real backend using the same contract.
- **🛒 Sales & Purchases:** Create sales and purchases with `Idempotency-Key` support to prevent duplicate transactions on retry—a critical feature for flaky mobile networks.
- **📦 Product & Inventory Management:** Track products, buying prices, and stock levels. Sales decrement stock atomically inside a database transaction.
- **💳 Payments & Customer Credit:** Record customer payments, track outstanding balances, and view payment history. Balances are computed via batched SQL aggregates, not per-customer queries.
- **📊 Dashboard & Reports:** A “today” dashboard (sales, expenses, profit) and report views that surface cost-of-goods and product performance.
- **🔐 JWT Authentication:** Access and refresh token flow, with secure password handling on the backend.
- **🌍 Internationalization (i18n):** The mobile app includes an `i18n` folder, indicating readiness for multiple languages.
- **🧪 Integration Test Suite:** The backend includes a `tests/` directory for integration tests against the real database.

---

## 🛠️ Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Mobile** | React Native + Expo | Cross-platform (iOS/Android), fast iteration with Expo Go, and a mature ecosystem for business apps. |
| **Mobile Language** | TypeScript | Type safety across screens, services, and API contracts. |
| **Backend** | Express + TypeScript | Lightweight, familiar HTTP framework with strong typing via `ts-node`/`tsx`. |
| **ORM** | Prisma | Type-safe database access, migrations, and a clear schema-as-code workflow. |
| **Database** | PostgreSQL (Neon-compatible) | Relational integrity for sales, payments, and stock; pooled connections for serverless deployment. |
| **Auth** | JWT (access + refresh) | Stateless authentication suitable for mobile clients. |
| **Testing** | Integration tests (`tests/`) | Validates the API against a real database, not mocks. |
| **Deployment** | Neon (DB) + Render (API) | Affordable, managed infrastructure with a `render.yaml` blueprint included. |

---

## 🏗️ Architecture

The monorepo is split into two independently deployable but contract-bound applications:

```
LoanApp/
├── backend/                  # Express + TypeScript + Prisma API
│   ├── prisma/              # Schema, migrations, seed script
│   ├── src/                 # Routes, controllers, services, middleware
│   ├── tests/               # Integration tests
│   ├── render.yaml          # Render deployment blueprint
│   └── .env.example         # DATABASE_URL, JWT secrets
│
└── mobile/                   # Expo / React Native app
    ├── app/                 # Expo Router file-based routes
    │   ├── (auth)/          # Login, register
    │   ├── (tabs)/          # Main tab navigation
    │   ├── customer/        # Customer detail & credit views
    │   ├── expense/         # Expense creation & listing
    │   ├── payment/         # Payment recording
    │   ├── product/         # Product management
    │   ├── purchase/        # Purchase orders
    │   └── sale/            # Sales flow
    ├── src/
    │   ├── components/      # Reusable UI
    │   ├── features/        # Feature-specific logic
    │   ├── hooks/           # Custom hooks
    │   ├── i18n/            # Localization
    │   ├── services/        # Mock services + HTTP client
    │   ├── store/           # State management
    │   ├── types/           # Shared domain types
    │   └── utils/           # Formatters, helpers
    └── .env.example         # EXPO_PUBLIC_API_URL, EXPO_PUBLIC_USE_MOCK
```

**Request Flow (Live Mode):**
1.  Mobile app calls `httpClient.ts` → sends a request with a JWT access token.
2.  Express route validates the token, then delegates to a service.
3.  The service uses Prisma to query PostgreSQL, applying SQL-level filtering and pagination.
4.  The response is returned in the standard envelope: `{ success, data }` or `{ success: false, error: { code, message, details } }`.
5.  For mutations (sales, purchases, payments), the mobile app sends an `Idempotency-Key` header; the backend ensures the operation is applied exactly once.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+**
- **PostgreSQL 14+** (or a free Neon database)
- **Expo CLI** (for the mobile app)
- A physical device or emulator for testing the mobile app

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env          # Fill in DATABASE_URL and JWT secrets
npm run prisma:migrate        # Create the schema
npm run seed                  # Load demo shop, customers, products
npm run dev                   # API runs on http://localhost:4000/api/v1
```

**Run tests:**
```bash
npm test
```

### 2. Mobile Setup

```bash
cd mobile
npm install
cp .env.example .env
# Set EXPO_PUBLIC_USE_MOCK=true for offline demo, or false to use the live API
# If live: set EXPO_PUBLIC_API_URL=http://<your-local-ip>:4000/api/v1
npx expo start
```

> **Note:** When running on a physical device, use your machine’s LAN IP (not `localhost`) for `EXPO_PUBLIC_API_URL`.

---

## 🔑 Demo Credentials

The seed script creates a demo shop and owner account:

| Field | Value |
| :--- | :--- |
| **Email** | `demo@loanapp.com` |
| **Password** | `demo1234` |

The mobile app’s mock mode also includes demo accounts; refer to the login screen’s role picker.

---

## 📜 API Contract

The backend and mobile mock services share a strict HTTP contract, ensuring seamless switching between modes.

**Success envelope:**
```json
{ "success": true, "data": { ... } }
```

**Error envelope:**
```json
{ "success": false, "error": { "code": "STRING", "message": "STRING", "details": {} } }
```

**Pagination envelope:**
```json
{ "items": [], "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
```

**Authentication:** All protected routes require an `Authorization: Bearer <accessToken>` header. Access tokens are short-lived; a refresh token endpoint is provided.

**Idempotency:** `POST` requests that create sales, purchases, or payments must include an `Idempotency-Key` header. The backend stores the key and returns the original result if the request is retried.

---

## ☁️ Deployment (Neon + Render)

The backend includes a `render.yaml` blueprint for one-click deployment.

1.  **Neon:** Create a project at [neon.tech](https://neon.tech), copy the **pooled connection string** (with `-pooler` in the hostname) into `DATABASE_URL`.
2.  **Render:** Create a Web Service from this repo, set the root directory to `backend/`, and add the same `DATABASE_URL` plus `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
    - **Build command:** `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
    - **Start command:** `npm run start`
    - **Health check path:** `/health`
3.  **Mobile:** Once the API is live, update `mobile/.env`:
    ```
    EXPO_PUBLIC_API_URL=https://<your-service>.onrender.com/api/v1
    EXPO_PUBLIC_USE_MOCK=false
    ```

> **Important:** Use Neon’s **pooled** connection string in production so Render’s process does not exhaust Neon’s connection limit.

---

## ⚠️ Known v1 Simplifications

The backend README explicitly documents these deliberate trade-offs:

- **Timezone:** Dashboard “today” uses UTC day boundaries, not the shop’s IANA timezone.
- **Cost of Goods:** Reports use each product’s _current_ buying price, not the historical price at the time of sale.
- **Reminders:** `POST /reminders/:id/send` is stubbed—it marks the row `SENT` but does not integrate SMS, push, or email.
- **Single User:** One owner per shop; no multi-user roles or staff accounts yet.

These are conscious scope decisions, not oversights. They demonstrate product discipline and an understanding of what is essential for an MVP versus what can wait.

---

## ⚡ Performance Notes

The backend is engineered for data-volume scalability:

- **SQL-Level Pagination & Filtering:** All list endpoints use indexed columns and `COUNT(*) OVER()` for totals—no loading entire tables into memory.
- **Batched Aggregates:** Customer balances are computed with one aggregate query per page of customers, not one query per customer.
- **Atomic Transactions:** Sale and payment creation use conditional updates (stock decrement, balance check) inside a database transaction with `pg_advisory_xact_lock`, preventing race conditions under concurrent requests.
- **Connection Pooling:** One `PrismaClient` per process, with Neon’s pooled connection string recommended for production.

---

## 🔮 Roadmap

- [ ] **Multi-User & Roles:** Add staff accounts with permissions (cashier, manager, owner).
- [ ] **Historical Cost Tracking:** Store the buying price at the time of each sale for accurate historical profit reporting.
- [ ] **Real Notification Providers:** Wire up SMS (e.g., Africa’s Talking) or push notifications for payment reminders.
- [ ] **Shop Timezone Settings:** Allow each shop to set its IANA timezone for accurate “today” reporting.
- [ ] **Offline-First Sync:** Queue sales and payments in the mobile app and sync when connectivity is restored.

---

## 🤝 Contributing

Contributions are welcome. Please:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

For backend changes, run `npm test` before submitting.

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## 📬 Contact

**Isaac Niyonshuti**

- GitHub: [@niyonshutiisaac](https://github.com/niyonshutiisaac)
- Project Link: [https://github.com/niyonshutiisaac/LoanApp](https://github.com/niyonshutiisaac/LoanApp)

---

<div align="center">

*Built for the realities of small-shop retail in East Africa: mobile-first, resilient, and designed to scale with data—not just with users.*

</div>
