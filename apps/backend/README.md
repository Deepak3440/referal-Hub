# Referaa Backend API

Node.js + Express backend for **Referaa** — alumni refer talent, offer 1:1 mentorship, share on the community feed, and students request and track referrals.

All API routes are prefixed with `/api`.  
Default local URL: `http://localhost:5001`

---

## Quick start

### 1. Prerequisites

- Node.js 18+
- pnpm
- MongoDB (local or Atlas)

### 2. Environment variables

Copy the root `.env.example` to `.env` at the **monorepo root** (`Referral-Hub-main/.env`):

```bash
cp .env.example .env
```

Required variables:


| Variable              | Example                                  | Purpose                |
| --------------------- | ---------------------------------------- | ---------------------- |
| `MONGO_URI`           | `mongodb://localhost:27017/referral_hub` | MongoDB connection     |
| `PORT`                | `5001`                                   | Server port            |
| `JWT_SECRET`          | long random string                       | Auth token signing     |
| `FRONTEND_URL`        | `http://localhost:5173`                  | CORS allowed origin    |
| `INITIAL_USER_POINTS` | `200`                                    | Points given on signup |


### 3. Install & run

From the monorepo root:

```bash
pnpm install
pnpm dev:backend
```

Other commands:

```bash
pnpm --filter @referaa/backend run build    # compile to dist/
pnpm --filter @referaa/backend run start    # production start
pnpm seed:demo                                   # create demo users
```

### 4. Demo accounts

After `pnpm seed:demo`:


| Email             | Password   | Role                |
| ----------------- | ---------- | ------------------- |
| `poster@demo.com` | `demo1234` | Alumni + consultant |
| `seeker@demo.com` | `demo1234` | Student             |


### 5. Health check

```bash
curl http://localhost:5001/api/healthz
# → { "status": "ok" }
```

---

## Tech stack


| Layer      | Technology                       |
| ---------- | -------------------------------- |
| Runtime    | Node.js (ESM)                    |
| Framework  | Express 5                        |
| Database   | MongoDB + Mongoose               |
| Auth       | JWT (Bearer token)               |
| Validation | Zod (`lib/api-zod` from OpenAPI) |
| Logging    | Pino                             |
| Build      | esbuild                          |


---

## Folder structure

```
apps/backend/
├── src/
│   ├── index.ts              # Entry — connects DB, starts server
│   ├── app.ts                # Express app (CORS, JSON, routes)
│   ├── config.ts             # JWT secret + CORS config
│   ├── middlewares/
│   │   └── auth.ts           # requireAuth, optionalAuth (JWT)
│   ├── routes/               # One file per feature (see API table below)
│   │   ├── index.ts          # Mounts all routers under /api
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── jobs.ts
│   │   ├── referrals.ts
│   │   ├── messages.ts
│   │   ├── stats.ts
│   │   ├── consultations.ts
│   │   ├── posts.ts
│   │   └── health.ts
│   ├── services/             # Business logic (rewards, Google Meet)
│   ├── lib/                  # JWT, uploads, rewards, conversation helpers
│   └── scripts/
│       └── seed-demo-users.ts
├── build.mjs                 # esbuild bundler
└── package.json

lib/db/                       # Shared database package (used by backend)
└── src/models/               # Mongoose schemas (all tables live here)
```

**Rule:** Database models live in `lib/db`. Route files should stay thin — validate input, call models/services, return JSON.

---

## Database — 9 collections (tables)

MongoDB stores data in **collections**. This app has **8 business collections** + **1 internal counter**.

### Collection summary


| #   | Collection      | Model file                          | What it stores                |
| --- | --------------- | ----------------------------------- | ----------------------------- |
| 1   | `users`         | `lib/db/src/models/user.ts`         | Accounts, profiles, points    |
| 2   | `jobs`          | `lib/db/src/models/job.ts`          | Job postings                  |
| 3   | `savedjobs`     | `lib/db/src/models/job.ts`          | Jobs bookmarked by users      |
| 4   | `referrals`     | `lib/db/src/models/referral.ts`     | Referral requests & status    |
| 5   | `messages`      | `lib/db/src/models/message.ts`      | Chat messages                 |
| 6   | `consultations` | `lib/db/src/models/consultation.ts` | Mentorship bookings           |
| 7   | `posts`         | `lib/db/src/models/post.ts`         | Feed posts                    |
| 8   | `postcomments`  | `lib/db/src/models/post-comment.ts` | Comments on feed posts        |
| 9   | `counters`      | `lib/db/src/counter.ts`             | Auto-increment IDs (internal) |


> IDs are **numeric** (`id: 1, 2, 3…`), not MongoDB `_id`. New IDs come from `getNextSequence("user")`, `getNextSequence("job")`, etc.

---

## How collections link together

```
                    ┌─────────────┐
                    │    users    │
                    │  (central)  │
                    └──────┬──────┘
           ┌───────────────┼───────────────┬──────────────┐
           │               │               │              │
           ▼               ▼               ▼              ▼
    ┌──────────┐   ┌────────────┐  ┌──────────┐  ┌─────────────┐
    │   jobs   │   │  referrals │  │  posts   │  │consultations│
    │posterId ─┼──►│requesterId │  │authorId  │  │requesterId  │
    └────┬─────┘   │referrerId  │  └────┬─────┘  │consultantId │
         │         │jobId       │       │        └─────────────┘
         │         └─────┬──────┘       │
         │               │              ▼
         │               │        ┌─────────────┐
         │               │        │ postcomments│
         │               │        │ postId      │
         │               │        │ authorId    │
         │               ▼        └─────────────┘
         │         ┌────────────┐
         └────────►│  messages  │  (conversationId = "3_7" = sorted user ids)
                   │  senderId  │
                   └────────────┘

    ┌──────────┐
    │ savedjobs│  userId + jobId (bookmark)
    └──────────┘
```

### Key relationships (plain English)


| From            | Field              | Links to        | Meaning                              |
| --------------- | ------------------ | --------------- | ------------------------------------ |
| `jobs`          | `posterId`         | `users.id`      | Who posted the job                   |
| `referrals`     | `jobId`            | `jobs.id`       | Which job the request is for         |
| `referrals`     | `requesterId`      | `users.id`      | Student who wants referral           |
| `referrals`     | `referrerId`       | `users.id`      | Job poster (same as `jobs.posterId`) |
| `savedjobs`     | `userId` + `jobId` | users + jobs    | User saved/bookmarked a job          |
| `messages`      | `senderId`         | `users.id`      | Who sent the message                 |
| `messages`      | `conversationId`   | `"minId_maxId"` | Chat between two users               |
| `consultations` | `requesterId`      | `users.id`      | Student booking mentor               |
| `consultations` | `consultantId`     | `users.id`      | Mentor (`users.isConsultant = true`) |
| `posts`         | `authorId`         | `users.id`      | Who wrote the feed post              |
| `posts`         | `likedByUserIds[]` | `users.id[]`    | Users who liked the post             |
| `postcomments`  | `postId`           | `posts.id`      | Which post was commented on          |
| `postcomments`  | `authorId`         | `users.id`      | Who wrote the comment                |


**No foreign keys in MongoDB** — links are stored as numbers (`posterId: 5`). The backend loads related users/jobs when building API responses.

---

## Authentication

1. **Sign up / login** → receive `{ token, user }`
2. Send token on every protected request:

```
Authorization: Bearer <token>
```

1. `middlewares/auth.ts` decodes JWT → loads user from DB → attaches `req.currentUser`
2. Token expires in **7 days**


| Middleware     | Used on     | Behavior                                               |
| -------------- | ----------- | ------------------------------------------------------ |
| `requireAuth`  | Most routes | 401 if no/invalid token                                |
| `optionalAuth` | `GET /jobs` | Attaches user if token present, still allows anonymous |


---

## Complete API reference

Base URL: `/api`

### Health


| Method | Path       | Auth | Description         |
| ------ | ---------- | ---- | ------------------- |
| GET    | `/healthz` | No   | Server health check |


### Auth


| Method | Path           | Auth | Description                        |
| ------ | -------------- | ---- | ---------------------------------- |
| POST   | `/auth/signup` | No   | Create account → `{ token, user }` |
| POST   | `/auth/login`  | No   | Login → `{ token, user }`          |


**Signup body (main fields):** `fullName`, `email`, `password`, `memberType` (`student`  `alumni`), `isWorkingProfessional`, `isConsultant`, optional `company`, `currentRole`, `experienceYears`

### Users


| Method | Path             | Auth | Description          |
| ------ | ---------------- | ---- | -------------------- |
| GET    | `/users/me`      | Yes  | Current user profile |
| PUT    | `/users/me`      | Yes  | Update profile       |
| GET    | `/users/:userId` | No   | Public profile by id |


### Jobs


| Method | Path                     | Auth         | Description                                                  |
| ------ | ------------------------ | ------------ | ------------------------------------------------------------ |
| GET    | `/jobs`                  | Optional     | List jobs (filters: `title`, `location`, `company`, `scope`) |
| GET    | `/jobs/:jobId`           | Optional     | Single job with poster info                                  |
| POST   | `/jobs`                  | Yes (alumni) | Create job posting                                           |
| GET    | `/jobs/my`               | Yes          | Jobs posted by current user                                  |
| PATCH  | `/jobs/:jobId`           | Yes          | Update own job                                               |
| DELETE | `/jobs/:jobId`           | Yes          | Delete own job                                               |
| GET    | `/jobs/saved`            | Yes          | User's saved jobs                                            |
| POST   | `/jobs/:jobId/save`      | Yes          | Save/bookmark job                                            |
| DELETE | `/jobs/:jobId/save`      | Yes          | Unsave job                                                   |
| GET    | `/jobs/:jobId/referrals` | Yes          | Referral requests for a job (poster only)                    |


### Referrals


| Method | Path                     | Auth | Description                                            |
| ------ | ------------------------ | ---- | ------------------------------------------------------ |
| GET    | `/referrals`             | Yes  | List referrals (`?role=requester` or `?role=referrer`) |
| POST   | `/referrals`             | Yes  | Request referral for a job                             |
| GET    | `/referrals/:referralId` | Yes  | Single referral detail                                 |
| PATCH  | `/referrals/:referralId` | Yes  | Update status (poster only)                            |


**Referral status flow (poster updates):**

```
pending → accepted → referred → interviewing → hired
   ↓         ↓          ↓            ↓
rejected  rejected  rejected   rejected_after_interview
```

Each status change can **deduct points from requester** and **credit points to poster** (see Rewards below).

### Messages


| Method | Path                        | Auth | Description                             |
| ------ | --------------------------- | ---- | --------------------------------------- |
| GET    | `/messages`                 | Yes  | List all conversations for current user |
| GET    | `/messages/:conversationId` | Yes  | Messages in a conversation              |
| POST   | `/messages/:conversationId` | Yes  | Send a message                          |


`conversationId` format: `"3_7"` (two user ids sorted ascending).

### Stats


| Method | Path               | Auth | Description                                             |
| ------ | ------------------ | ---- | ------------------------------------------------------- |
| GET    | `/stats/dashboard` | Yes  | Dashboard counts (jobs posted, referrals, points, etc.) |


### Consultations (Mentorship)


| Method | Path                             | Auth | Description                                                   |
| ------ | -------------------------------- | ---- | ------------------------------------------------------------- |
| GET    | `/consultations/meet-config`     | Yes  | Whether auto Google Meet is enabled                           |
| GET    | `/consultations/experts`         | Yes  | List mentors (`?q`, `?college`, `?branch`, `?graduationYear`) |
| GET    | `/consultations`                 | Yes  | List sessions (`?role=requester|consultant|all`)              |
| POST   | `/consultations`                 | Yes  | Request mentorship session                                    |
| GET    | `/consultations/:consultationId` | Yes  | Session detail                                                |
| PATCH  | `/consultations/:consultationId` | Yes  | Update status / schedule / meeting link                       |


**Consultation statuses:** `pending` → `scheduled` → `completed` (or `rejected` / `cancelled`)

### Feed (Posts)


| Method | Path                  | Auth         | Description                         |
| ------ | --------------------- | ------------ | ----------------------------------- |
| GET    | `/posts/contributors` | Yes          | Top feed posters (`?limit=5`)       |
| GET    | `/posts`              | Yes          | Paginated feed (`?page=1&limit=10`) |
| POST   | `/posts`              | Yes (alumni) | Create post                         |
| POST   | `/posts/media`        | Yes (alumni) | Upload image/video (base64)         |
| POST   | `/posts/:id/like`     | Yes          | Toggle like                         |
| POST   | `/posts/:id/comments` | Yes          | Add comment                         |
| DELETE | `/posts/:id`          | Yes          | Delete own post                     |


**Post body fields:** `content`, optional `imageUrl`, `videoUrl`, `linkUrl`, `linkLabel`, `postType` (`update`  `job`)

### Static files


| Path             | Description                 |
| ---------------- | --------------------------- |
| `/api/uploads/`* | Uploaded feed images/videos |


---

## Business rules (important)

### Member types


| Type      | Can post jobs | Can post on feed | Can request referrals | Can like/comment |
| --------- | ------------- | ---------------- | --------------------- | ---------------- |
| `alumni`  | Yes           | Yes              | Yes                   | Yes              |
| `student` | No            | No               | Yes                   | Yes              |


Enforced in: `routes/jobs.ts`, `routes/posts.ts`

### Points system

Configured via `.env` (`REWARDS_*` variables). Default flow:


| Event                 | Requester (student) | Referrer (poster) |
| --------------------- | ------------------- | ----------------- |
| Send referral request | −10 pts             | +10 pts           |
| Poster accepts        | −10 pts             | +20 pts           |
| Marked referred       | −30 pts             | +30 pts           |
| Marked hired          | −50 pts             | +50 pts           |


Logic lives in `src/services/referralRewards.ts` and `src/lib/rewards.ts`.

### Consultants

Users with `isConsultant: true` appear in `GET /consultations/experts`. Students book via `POST /consultations`.

---

## How to make changes (step by step)

### Add a new field to User profile

1. Add field to schema → `lib/db/src/models/user.ts`
2. Export it in `toUserProfile()`
3. Add to validation → `lib/api-zod` or `routes/users.ts` (`ExtendedUpdateMeBody`)
4. Update OpenAPI spec → `lib/api-spec/openapi.yaml` (if using generated client)
5. Regenerate frontend client: `pnpm --filter @workspace/api-client-react run build` (if applicable)
6. Update frontend profile form

### Add a new API endpoint

1. Create or edit route file in `src/routes/`
2. Add model in `lib/db/src/models/` if new table needed
3. Use `getNextSequence("yourModel")` for new numeric IDs
4. Register router in `src/routes/index.ts`
5. Use `requireAuth` middleware for protected routes
6. Return JSON errors as `{ error: "message" }` (frontend expects this)

Example skeleton:

```typescript
// src/routes/my-feature.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/my-feature", requireAuth, async (req, res) => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  res.json({ ok: true, userId: user.id });
});

export default router;
```

```typescript
// src/routes/index.ts
import myFeatureRouter from "./my-feature";
router.use(myFeatureRouter);
```

### Add a new database table

1. Create `lib/db/src/models/my-model.ts` with Mongoose schema
2. Export from `lib/db/src/models/index.ts`
3. Add counter name: `getNextSequence("myModel")` in `counter.ts` usage
4. Build route + service logic in backend

### Connect frontend to a new endpoint

- **OpenAPI routes** (jobs, users, referrals, messages, stats): add to `lib/api-spec/openapi.yaml`, regenerate `lib/api-client-react`
- **Custom routes** (posts, consultations, auth): use `apps/frontend/src/lib/http-client.ts` → `httpRequest("/your-path")`

---

## Request / response flow

```
Client (browser)
    │
    │  Authorization: Bearer <jwt>
    ▼
Vite proxy (dev)  /api → localhost:5001
    │
    ▼
Express app.ts
    ├── CORS (FRONTEND_URL)
    ├── JSON body parser
    └── /api router
            ├── middlewares/auth.ts  (JWT verify)
            ├── routes/*.ts          (handler)
            ├── lib/db models        (MongoDB)
            └── services/*.ts        (business logic)
```

---

## Error responses


| Status | Meaning                                | Example body                                |
| ------ | -------------------------------------- | ------------------------------------------- |
| 400    | Bad input                              | `{ "error": "Invalid email address" }`      |
| 401    | Not logged in / bad token              | `{ "error": "Unauthorized" }`               |
| 403    | Not allowed (e.g. student posting job) | `{ "error": "Only alumni can post jobs." }` |
| 404    | Not found                              | `{ "error": "Job not found" }`              |
| 409    | Conflict                               | `{ "error": "Email already registered" }`   |
| 500    | Server error                           | `{ "error": "Internal server error" }`      |


---

## Production checklist

- [ ] Set strong `JWT_SECRET` (not the default)
- [ ] Set `FRONTEND_URL` to your real domain
- [ ] Use MongoDB Atlas or secured MongoDB instance
- [ ] Run `pnpm build` then `pnpm start` (loads `.env` automatically)
- [ ] Put reverse proxy (nginx) in front — frontend on 443, proxy `/api` to backend `:5001`

---

## Related packages in monorepo


| Package                       | Path                   | Purpose                                       |
| ----------------------------- | ---------------------- | --------------------------------------------- |
| `@workspace/db`               | `lib/db`               | Mongoose models + `connectDB()`               |
| `@workspace/api-zod`          | `lib/api-zod`          | Zod schemas from OpenAPI (request validation) |
| `@workspace/api-client-react` | `lib/api-client-react` | Frontend React Query hooks (generated)        |
| `@referaa/frontend`      | `apps/frontend`        | React UI (calls this backend)                 |


---

## Need help?


| Task                   | Look at                                               |
| ---------------------- | ----------------------------------------------------- |
| Change referral points | `src/lib/rewards.ts`, `.env`                          |
| Change who can post    | `routes/jobs.ts`, `routes/posts.ts`                   |
| Change auth            | `routes/auth.ts`, `middlewares/auth.ts`, `lib/jwt.ts` |
| Change feed            | `routes/posts.ts`, `lib/uploads.ts`                   |
| Change mentorship      | `routes/consultations.ts`, `services/googleMeet.ts`   |
| Seed test data         | `src/scripts/seed-demo-users.ts`                      |


