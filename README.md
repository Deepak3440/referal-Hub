# Referaa

Alumni refer, mentor & connect — React frontend + Express backend.  
**Domain:** [referaa.com](https://referaa.com)

## Documentation

- **[Product flows & screens](docs/PRODUCT-FLOWS.md)** — what each tab shows, stats, job vs company referrals (for PM / QA / team)
- [Backend API & data model](apps/backend/README.md)

## Project structure

```
referaa/
├── apps/
│   ├── backend/          # Express API server (port 5001)
│   ├── frontend/         # React + Vite app (port 5173)
│   └── mockup-sandbox/   # UI mockup preview tool (optional)
├── lib/
│   ├── api-spec/         # OpenAPI spec + codegen config
│   ├── api-client-react/ # Generated React Query hooks
│   ├── api-zod/          # Generated Zod schemas
│   └── db/               # Mongoose models + MongoDB connection
└── scripts/
```

## Prerequisites

- Node.js 20+ (24 recommended)
- pnpm 9+
- MongoDB database (local or MongoDB Atlas)

## Setup

1. **Install dependencies**

```bash
pnpm install
```

2. **Configure environment**

Copy the example env file and fill in your values:

```bash
cp .env.example .env
cp apps/frontend/.env.example apps/frontend/.env
```

3. **Run the app** (two terminals)

Terminal 1 — backend:

```bash
pnpm dev:backend
```

Terminal 2 — frontend:

```bash
pnpm dev:frontend
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5001/api

## Referral flow (3 tabs)

| Tab | Who | Action |
|-----|-----|--------|
| **Browse** | Everyone | See others' jobs → send referral request (status: Pending) |
| **My Jobs** | Job poster | Post jobs → **Manage Referrals** → Accept (−10 pts) / Reject |
| **Requests** | Requester | Track jobs you asked for → open detail for progress bar |

Points: Accept −10 poster / +20 requester · Referred −30 · Hired −50. New users start with 200 pts.

### Demo accounts

```bash
pnpm seed:demo
```

| Email | Password | Role |
|-------|----------|------|
| `poster@demo.com` | `demo1234` | Posts jobs |
| `seeker@demo.com` | `demo1234` | Requests referrals |

MongoDB collections are created automatically on first use — no migrations needed.

## Environment variables

### Root `.env` (backend)

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string (include database name) |
| `PORT` | API server port (default: `5001`) |
| `JWT_SECRET` | Secret key for signing auth tokens |
| `INITIAL_USER_POINTS` | Starting points for new users (default: 200) |
| `REWARDS_ACCEPT_DEDUCT_REFERRER` | Points deducted from poster on accept (default: 10) |
| `REWARDS_ACCEPT_CREDIT_REQUESTER` | Points credited to requester on accept (default: 20) |
| `REWARDS_REFERRED_DEDUCT_REFERRER` | Points deducted on referred (default: 30) |
| `REWARDS_HIRED_DEDUCT_REFERRER` | Points deducted on hired (default: 50) |

### `apps/frontend/.env`

| Variable | Description |
|----------|-------------|
| `API_URL` | Backend URL for Vite proxy (default: `http://localhost:5001`) |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:backend` | Start API server |
| `pnpm dev:frontend` | Start frontend dev server |
| `pnpm run typecheck` | Typecheck all packages |
| `pnpm seed:demo` | Create demo poster + seeker users (200 pts each) |
| `pnpm run build` | Build all packages |

## Stack

- **Monorepo**: pnpm workspaces
- **Backend**: Express 5, Mongoose, MongoDB, JWT email/password auth
- **Frontend**: React 19, Vite, Tailwind CSS, TanStack Query
- **API**: OpenAPI spec + Orval codegen

## Production

Set `MONGO_URI` to your production MongoDB Atlas connection string. Include the database name at the end of the URI, for example:

```
mongodb+srv://user:password@cluster.mongodb.net/referral_hub
```

Never commit real credentials to git — keep them in `.env` only.
