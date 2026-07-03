# PalMart Enterprise Pro - POS & Inventory Management System

PalMart Pro is a production-ready, full-stack enterprise-grade Supermarket POS and Inventory Management system. Built with **React 19**, **Node/Express**, **Prisma ORM**, and **PostgreSQL**, it integrates automated inventory ledger tracing, multi-role cashier access controls, market basket co-occurrence analytics, and statistical demand forecasting.

---

## System Architecture

```mermaid
graph TD
    Client[React Client - Port 3000] -->|HTTPS Request| Gateway[Express API Gateway - Port 5000]
    Gateway -->|JWT / Authentication Auth Guard| RouteHandler[Route Router Handlers]
    RouteHandler -->|Business Calculations| Service[Services - PDF, Excel, AI Forecasting]
    RouteHandler -->|ACID DB Transact| Prisma[Prisma ORM Client]
    Prisma -->|Query/Updates| PostgreSQL[(Neon / Local PostgreSQL)]
    Service -->|PDF stream| Client
```

---

## Core Features

- **Multi-Role Security**: Admin, Manager, and Cashier clearance tiers. Protected routes and token rotations.
- **Unified POS Terminal**: Barcode scan inputs, split cash/UPI/card checkout calculations, and coupon codes.
- **AI Analytics**: Statistical velocity demand forecasting, market basket association rules co-occurrence, RFM shopper segmenting, and an inline AI Chat Consultant.
- **HR & Operations**: Timesheet punch controls, leaves tracker, and cash register utility expense tracking.
- **Reporting & Backups**: Dynamic thermal print receipt renderings, downloadable sales/tax reports (CSV/PDF), and json database backup tools.

---

## Directory Structure

```text
palmart/
├── backend/            # Express TypeScript Server
│   ├── prisma/         # Prisma Schema & DB master seeds
│   └── src/
│       ├── controllers/# API Route execution controllers
│       ├── middleware/ # JWT verification & role filters
│       ├── routes/     # Endpoint routes
│       └── services/   # AI engine & document exporters
├── frontend/           # Vite React 19 Client
│   └── src/
│       ├── components/ # Reusable UI components & layouts
│       ├── pages/      # Terminal & Dashboard page modules
│       └── store/      # Redux Cart & global layouts state
└── docker-compose.yml  # Orchestrates full local database and app runtime
```

---

## Local Development Quickstart

### Prerequisites
- Node.js v18 or later
- Local PostgreSQL instance or Docker Desktop

### 1. Configure Environment variables
Rename `.env.example` in the root folder to `.env` and configure your credentials:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/palmart?schema=public"
JWT_ACCESS_SECRET="yourAccessSecretKeyHere"
JWT_REFRESH_SECRET="yourRefreshSecretKeyHere"
```

### 2. Setup Database Schema and Migrations
Initialize the DB schemas and populate mock inventories:
```bash
cd backend
npm install
npx prisma db push
npm run prisma:seed
```
*This seeds the following default credentials:*
- **Admin**: `admin@martpro.com` / `password123`
- **Manager**: `manager@martpro.com` / `password123`
- **Cashier**: `cashier@martpro.com` / `password123`

### 3. Run Development Servers
Start backend API server (runs on Port 5000):
```bash
cd backend
npm run dev
```

Start React Vite client (runs on Port 3000):
```bash
cd ../frontend
npm install
npm run dev
```

---

## Docker Compose Quick Deployment
Spin up the entire stack (PostgreSQL database, Node backend, and Nginx hosting frontend static pages) locally in one command:
```bash
docker-compose up --build
```
- Client Portal: [http://localhost:3000](http://localhost:3000)
- Backend APIs: [http://localhost:5000/health](http://localhost:5000/health)

---

## Core API Endpoints

### 1. Authentication (`/api/auth`)
- `POST /login` - Accepts `{ email, password }`. Issues JWT access and refresh tokens.
- `POST /refresh-token` - Obtains a renewed access token using `{ token }`.
- `POST /forgot-password` - Issues a 6-digit email recovery OTP.
- `POST /reset-password` - Updates account credentials using `{ email, otp, newPassword }`.
- `GET /me` - Returns active profile details.

### 2. Products Catalog (`/api/products`)
- `GET /` - Paginated grid query with search and category filters.
- `POST /` - Registers new products. (Requires ADMIN/MANAGER role).
- `PUT /:id` - Updates prices or stock limits.
- `DELETE /:id` - Soft deletes items to preserve invoice histories.
- `POST /import-csv` - Imports bulk rows.

### 3. POS Checkouts & Billing (`/api/sales`)
- `POST /` - Completes customer carts. Wraps inventory decrements, safety stock evaluations, and cashier billing entries in a single SQL transaction block.
- `GET /` - Audits past invoice tickets.
- `POST /return` - Reverses checkouts. Auto-increments item stock and subtracts shopper loyalty credits.

### 4. AI & Business Analytics (`/api/ai`)
- `GET /forecasts` - Predicts future product depletion rates and restock margins.
- `GET /recommendations` - Discovers item pair association frequencies.
- `GET /segmentation` - Clusters shoppers based on recency and spending values.
- `GET /anomalies` - Screen cashier checks for fraud risk patterns.
- `POST /chat` - Interactive NLP store database consultant query resolver.

---

## Keyboard Shortcuts (POS Screen)
- `F2` - Clear Cart completely.
- `F8` - Charge invoice and trigger payment checkout.
