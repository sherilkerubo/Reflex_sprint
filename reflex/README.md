# Reflex Delivery Engine
A real-time dispatch console that takes small Kenyan retailers off WhatsApp and phone-call coordination and onto a structured logistics platform — log a delivery, hand it to a rider, watch it move, and hand it off with an SMS-verified release code, all without a native app install for anyone.

Built from a system architecture & technical specification document as a sprint build, covering the full retailer → dispatcher → rider → customer workflow end to end.

## Table of Contents
- [What this app does](#what-this-app-does)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Setup & Installation (local)](#setup--installation-local)
- [Environment Configuration](#environment-configuration)
- [Database](#database)
- [Running the App Locally](#running-the-app-locally)
- [Try It — Sample Data](#try-it--sample-data)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Git Workflow & Commit Conventions](#git-workflow--commit-conventions)
- [Feature-to-Code Mapping](#feature-to-code-mapping)
- [Known Limitations](#known-limitations)
- [Team](#team)
- [Documentation Index](#documentation-index)

## What this app does
Four roles, one platform:

- **Retailer** — logs a delivery request (customer name, phone, address, item) from a browser dashboard. No app install, no phone call to a rider.
- **Dispatcher** — sees every unassigned order on a live board and assigns it to an available rider in one click. Assignment automatically generates a 6-digit release code, hashes it, and sends the customer an SMS with a tracking link and that code.
- **Rider** — accepts the job, moves it through pickup → in-transit, streams GPS location every few seconds while en route, and confirms delivery by having the customer read back the release code.
- **Customer** — gets a zero-friction tracking link by SMS, no login or app required, and watches the rider's live location on a map until the code handoff marks the order delivered.

Every state change is logged to an immutable audit trail, and the whole flow runs over real-time WebSocket events so every screen updates the instant something changes elsewhere.



## Tech Stack
| Layer | Technology | Why |
|---|---|---|
| Frontend | React (Vite) PWA, Tailwind CSS v4, Leaflet/OpenStreetMap | Fast dev loop, installable PWA for riders on weak connections, no paid map API key needed for the demo |
| Backend | Node.js, Express, Socket.io | Async event-driven I/O for high-throughput real-time updates; Socket.io pushes location/status changes to every connected screen |
| Data layer | In-memory store (demo) / PostgreSQL via Prisma (production schema included) | The demo runs with zero setup; `prisma/schema.prisma` mirrors the same shape 1:1 for a real deploy |
| SMS | Africa's Talking API (mocked by default, real SDK wired in) | Auto-switches to real sending the moment `AT_API_KEY`/`AT_USERNAME` are set — see [Environment Configuration](#environment-configuration) |
| Auth | JWT + bcrypt password hashing | Phone + password sign-up/login per role, tokens verified on every protected route |
| Real-time | Socket.io rooms (`delivery:<id>`) | Board-wide events plus a scoped channel per delivery for location pings |
| Offline sync | IndexedDB queue (rider PWA) | Location/status events queue locally when offline and replay in order once back online |

## Architecture Overview
```
Retailer / Dispatcher / Rider (Browser, React PWA)
        │  fetch() + Socket.io client
        ▼
Express routes  →  role/auth middleware  →  services (auth, SMS, release-code, status machine)
        │
        ▼
In-memory store (backend/src/store/db.js) — same shape as prisma/schema.prisma
        │
        ▼
Socket.io broadcasts (delivery:new, delivery:assigned, delivery:status,
delivery:location, delivery:delivered, payout:unlocked)
        │
        ▼
Customer tracking page (public, no login) — live map + status, no polling needed
```
Routes stay thin — they validate input and delegate to a service module (`backend/src/services/`), which keeps business logic (release-code hashing, SMS composition, status transitions) independent of the HTTP layer and easy to test in isolation.

## Project Structure
```
reflex/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js                  # JWT verification, role guard
│   │   ├── routes/
│   │   │   ├── auth.js                  # register / login / riders list
│   │   │   ├── deliveries.js            # full delivery lifecycle
│   │   │   └── track.js                 # public customer tracking
│   │   ├── services/
│   │   │   ├── auth.js                  # register()/login() + JWT issuing
│   │   │   ├── releaseCode.js           # OTP generation + bcrypt hashing
│   │   │   ├── sms.js                   # Africa's Talking (real or mocked)
│   │   │   └── statusMachine.js         # valid delivery status transitions
│   │   ├── store/
│   │   │   └── db.js                    # in-memory repository layer
│   │   └── server.js                    # Express + Socket.io entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx               # header nav + page shell
│   │   │   ├── RoleRoute.jsx            # role-gated route wrapper
│   │   │   ├── RouteDiagram.jsx         # hero illustration
│   │   │   └── StatusPill.jsx           # delivery status badge
│   │   ├── lib/
│   │   │   ├── api.js                   # fetch wrapper + auth token handling
│   │   │   ├── AuthContext.jsx          # session state (login/register/logout)
│   │   │   ├── offlineQueue.js          # IndexedDB offline queue
│   │   │   └── socket.js                # shared Socket.io client
│   │   ├── pages/
│   │   │   ├── Home.jsx                 # public landing (track + sign in)
│   │   │   ├── Login.jsx                # sign up / log in
│   │   │   ├── RetailerDashboard.jsx
│   │   │   ├── DispatcherBoard.jsx
│   │   │   ├── RiderConsole.jsx
│   │   │   ├── CustomerTracking.jsx     # public, no login
│   │   │   └── SmsOutbox.jsx            # dispatcher-only SMS log
│   │   ├── App.jsx                      # route table
│   │   ├── main.jsx                     # app entry point
│   │   └── index.css                    # design tokens + global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── prisma/
│   └── schema.prisma                    # production PostgreSQL schema
└── README.md
```

## Setup & Installation (local)
```bash
git clone https://github.com/<your-username>/reflex-delivery-engine.git
cd reflex-delivery-engine

cd backend
npm install
cd ../frontend
npm install
```
Requires: Node.js 18+ and npm.

## Environment Configuration
In `backend/`, copy the example file and fill it in:
```bash
cp .env.example .env
```
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `JWT_SECRET` | dev placeholder | **Set this** to a random string before any real deployment |
| `TRACKING_BASE_URL` | `https://rflx.app/t` | Base URL used to build the tracking link sent by SMS |
| `AT_API_KEY` / `AT_USERNAME` | unset | Set both to send **real** SMS via Africa's Talking; without them, SMS is mocked (logged to the dispatcher's SMS log instead of sent) |
| `AT_SHORTCODE` | unset | Optional sender ID/shortcode |

The frontend needs no `.env` for local dev — `vite.config.js` proxies `/api` and `/socket.io` to `http://localhost:4000`.

## Database
The runnable app uses an **in-memory store** (`backend/src/store/db.js`) shaped identically to the production schema, so there's zero database setup for local development or grading — data resets whenever the backend restarts.

`prisma/schema.prisma` holds the real PostgreSQL schema (`users`, `deliveries`, `delivery_locations`, `audit_logs`) for a production deploy. To switch to it:
1. `npm install prisma @prisma/client` in `backend/`
2. Point `DATABASE_URL` at a real Postgres instance
3. `npx prisma migrate dev`
4. Reimplement the functions in `backend/src/store/db.js` against `prisma.<model>.*` calls — every route/service already calls the store through that one module, so no other file needs to change

Schema summary:
- **users** — `id`, `name`, `phone` (unique), `role` (RETAILER/DISPATCHER/RIDER), `password_hash`, `created_at`
- **deliveries** — `id`, `tracking_number` (unique), `retailer_id`, `rider_id`, customer fields, `status`, `release_code_hash`, timestamps
- **delivery_locations** — `id`, `delivery_id`, `latitude`, `longitude`, `recorded_at`
- **audit_logs** — `id`, `delivery_id`, `previous_status`, `new_status`, `changed_by`, `timestamp`

## Running the App Locally
Two terminals:
```bash
# Terminal 1 — backend (API + WebSocket server on :4000)
cd backend
npm start

# Terminal 2 — frontend (PWA dev server on :5173)
cd frontend
npm run dev
```
Visit `http://localhost:5173`.

## Try It — Sample Data
No seeded demo accounts are shipped anymore — sign up for real accounts from the login screen (**Sign up** tab: name, phone, role, password). A sample walk-through:

| Step | Who | Action |
|---|---|---|
| 1 | Retailer | Sign up as RETAILER → *Log a delivery* with a customer name, phone, address, item |
| 2 | Dispatcher | Sign up as DISPATCHER → assign the new order to a rider → SMS (with release code) fires automatically, visible on **SMS log** (dispatcher-only) |
| 3 | Rider | Sign up as RIDER → select the job → *Mark picked up* → *Start transit* → *Start GPS stream* |
| 4 | Customer | Open the tracking link from the SMS log, no login — watch the live map update |
| 5 | Rider | Enter the release code from the SMS log → *Confirm delivery* → status flips to `DELIVERED`, payout-unlock event fires |

Tracking numbers are generated per order in the form `RFX-####`.

## API Reference
| Method & path | Role | Purpose |
|---|---|---|
| `POST /api/auth/register` | any | Create an account (name, phone, role, password) |
| `POST /api/auth/login` | any | Get a session token (phone + password) |
| `GET /api/auth/riders` | authenticated | List riders (used by the dispatcher board) |
| `POST /api/deliveries` | Retailer | Create an order |
| `GET /api/deliveries` | authenticated | List/filter deliveries (`?status=`, `?mine=true`) |
| `POST /api/deliveries/:id/assign` | Dispatcher | Assign a rider, generate + SMS the release code |
| `POST /api/deliveries/:id/status` | Rider | `PICKED_UP` / `IN_TRANSIT` / `CANCELLED` |
| `POST /api/deliveries/:id/location` | Rider | One GPS ping |
| `POST /api/deliveries/:id/sync` | Rider | Batched replay of queued offline events |
| `POST /api/deliveries/:id/verify` | Rider | Check release code, mark delivered, unlock payout |
| `GET /api/deliveries/:id/audit` | authenticated | Immutable status-change history |
| `GET /api/track/:trackingNumber` | public | Customer tracking page data |
| `GET /api/sms/outbox` | Dispatcher only | View "sent" SMS (mocked or real) |

All state-changing calls also broadcast over Socket.io: `delivery:new`, `delivery:assigned`, `delivery:status`, `delivery:location`, `delivery:delivered`, `payout:unlocked` — globally and scoped to a `delivery:<id>` room.

## Testing
There is currently **no automated test suite**. The workflow has been verified with manual end-to-end smoke testing against the running backend (curl), covering:
- Registration, duplicate-phone rejection, correct/incorrect password login
- Full delivery lifecycle: create → assign (OTP generated + SMS sent) → pickup → in-transit → location pings → release-code verification (both wrong and correct code) → delivered
- Role gating on protected routes (e.g. `/api/sms/outbox` returns 401 with no token, 403 for a non-dispatcher, 200 for a dispatcher)

Adding a proper `tests/` suite (Jest/Vitest + Supertest for the API) is a natural next step — see [Known Limitations](#known-limitations).

## Deployment
Not currently deployed. To ship a public demo, the pieces needed are:
- A real Postgres database (swap in `prisma/schema.prisma` per [Database](#database) above) — the in-memory store resets on every restart, which is fine for local grading but not for a live demo
- `JWT_SECRET` set to a real secret, not the dev placeholder
- Real `AT_API_KEY`/`AT_USERNAME` if SMS should actually reach customers
- A host that can run a long-lived Node process with WebSocket support (e.g. Render, Railway, Fly.io) for the backend, plus a static host or the same service for the built frontend (`npm run build` in `frontend/`)
- CORS locked down to the real frontend origin instead of the current `origin: "*"` dev setting

## Git Workflow & Commit Conventions
Suggested conventions for this repo going forward:
- **Branch naming:** `feature/<description>`, `fix/<description>`, `docs/<description>`
- **Commit format:** `<type>: <what changed> — <why it matters>`
  Example: `feat: add password-based auth — replaces phone-only login with real accounts`
- **Avoid:** `wip`, `updates`, `changes`, `final`, `stuff`, `fixes` as standalone commit messages

## Feature-to-Code Mapping
| Feature | File(s) |
|---|---|
| Auth (register/login, JWT, bcrypt) | `backend/src/services/auth.js`, `backend/src/routes/auth.js`, `backend/src/middleware/auth.js` |
| Delivery lifecycle & status machine | `backend/src/routes/deliveries.js`, `backend/src/services/statusMachine.js` |
| Release code generation & verification | `backend/src/services/releaseCode.js` |
| SMS (real/mocked) | `backend/src/services/sms.js` |
| Real-time events | `backend/src/server.js` (Socket.io setup), broadcast calls in `deliveries.js` |
| In-memory data layer | `backend/src/store/db.js` |
| Production schema | `prisma/schema.prisma` |
| Retailer dashboard | `frontend/src/pages/RetailerDashboard.jsx` |
| Dispatcher board | `frontend/src/pages/DispatcherBoard.jsx` |
| Rider console + offline queue | `frontend/src/pages/RiderConsole.jsx`, `frontend/src/lib/offlineQueue.js` |
| Customer tracking (public) | `frontend/src/pages/CustomerTracking.jsx` |
| SMS log (dispatcher-only) | `frontend/src/pages/SmsOutbox.jsx` |
| Auth UI + session | `frontend/src/pages/Login.jsx`, `frontend/src/lib/AuthContext.jsx` |

## Known Limitations
- No automated test suite yet (see [Testing](#testing))
- In-memory data store resets on backend restart — not suitable for a persistent public deploy without switching to the included Prisma/Postgres schema
- SMS sandbox mode (Africa's Talking) only delivers to numbers registered as simulator recipients in your AT dashboard — production sending needs a paid account and approved sender ID
- Leaflet/OpenStreetMap is used in place of Mapbox GL JS (avoids needing a paid map API key for the demo) — functionally equivalent for this build
- CORS is wide open (`origin: "*"`) for local development and would need locking down before a public deploy



## Documentation Index
- This README — setup, architecture, API reference, and current status
- `prisma/schema.prisma` — production database schema, with inline migration notes
- `backend/.env.example` — every environment variable the backend reads, with explanations
