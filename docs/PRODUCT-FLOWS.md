# Referaa — Product flows & screens

This guide explains **who sees what** on each tab, how **stats** are calculated, and how **job** vs **company** referrals work. Share it with PMs, designers, QA, or new engineers.

---

## Quick roles

| Role | Who | Main actions |
|------|-----|----------------|
| **Student** | Looking for jobs / referrals | Request referrals, track progress, chat, mentorship |
| **Alumni** | Works at a company, can refer | Post job openings, accept/reject requests, company-wide requests, mentorship |

Everyone can use **Feed** and **Profile**. Only alumni see **Offer Referrals**.

---

## App menu (sidebar)

| Tab | Path | Who | Purpose |
|-----|------|-----|---------|
| **Dashboard** | `/home` | Everyone | Find openings & request referrals (others’ content only) |
| **Feed** | `/feed` | Everyone | Community posts (students + alumni can post) |
| **Offer Referrals** | `/my-listings` | Alumni only | Post openings & manage incoming requests |
| **Track Requests** | `/referrals` | Everyone | Requests **you sent** (job + company) |
| **Mentorship** | `/consult` | Everyone | Book / offer 1:1 sessions |
| **Profile** | `/profile` | Everyone | Edit profile, photo, company (alumni) |

Badge on **Offer Referrals** = pending job + company requests waiting for you.  
Badge on **Mentorship** = sessions needing action (awaiting payment for you, or new bookings on your calendar).

---

## Two referral types

```text
┌─────────────────────────────────────────────────────────────────┐
│  JOB REFERRAL          │  COMPANY REFERRAL                      │
│  (specific opening)    │  (company-wide)                        │
├────────────────────────┼────────────────────────────────────────┤
│  One job posting       │  One request per company               │
│  One alumni (poster)   │  Many alumni at that company           │
│  Request from Dashboard│  Request from Dashboard → Companies    │
│    → Jobs tab          │                                        │
│  Track on Track        │  Track on Track Requests               │
│    Requests            │                                        │
│  Alumni manages on     │  Alumni manages on Offer Referrals     │
│    Offer Referrals     │    → Company requests panel            │
│    → per job opening   │                                        │
└────────────────────────┴────────────────────────────────────────┘
```

**Shared pipeline (after accept):**  
`Pending` → `Accepted` → `Referred` → `Interviewing` → `Hired`  
(or `Rejected` / `Not selected after interview`)

---

## 1. Dashboard (`/home`)

**Goal:** Discover where to ask for a referral. You only browse **other people’s** opportunities — not your own listings.

### Top stats (hero section)

| Stat | Student sees | Alumni sees |
|------|----------------|-------------|
| **Your points** | Your balance | Your balance |
| **Requests sent** | Job + company requests you created | — |
| **Active referrals** | In-progress job requests you sent | — |
| **Referrals given** | — | Times you were the referrer on a job request |
| **Jobs posted** | — | Count of openings you posted |

*Source: `/api/stats/dashboard` + profile `totalPoints`.*

### “Request a referral” section

Two tabs: **Companies** | **Jobs**

#### Companies tab

| Shows | Does **not** show |
|-------|-------------------|
| Companies where **other alumni** can refer you | Your own company if you’re the **only** alumni there |
| Referrer count = other alumni at that company | You counted as a referrer |
| Active openings count = jobs at that company **not posted by you** | Your own posted jobs in that count |
| **Request** button → company-wide form | Companies with zero other referrers |

**After request:** appears on **Track Requests** as “Company request you sent”. Message goes to all eligible alumni at that company. Chat via **Messages** while waiting; after someone accepts, chat on the request card with that alumni.

#### Jobs tab

| Shows | Does **not** show |
|-------|-------------------|
| Active job openings posted by **other** alumni | **Your own** openings (posted in Offer Referrals) |
| Search by title, location, company | Closed jobs |
| Request referral / view status per card | Jobs where you’re the poster |

**API rule:** `GET /jobs?scope=community` excludes `posterId = current user`.

**After request:** one row on **Track Requests** (“Job request you sent”) + chat with the job poster.

---

## 2. Offer Referrals (`/my-listings`) — alumni only

**Goal:** Post roles you can refer for and respond to incoming requests.

### Top stats

| Stat | Meaning |
|------|---------|
| **Openings posted** | Your active job listings count |
| **Pending requests** | Job referrals waiting for your accept/decline |
| **Active referrals** | Job requests in accepted → interviewing (you as referrer) |

*Company pending requests are shown in the sidebar alert, not always in this third stat.*

### Company requests panel (top of page)

| Shows | Does **not** show |
|-------|-------------------|
| Students who sent **company-wide** requests to your company | Requests already handled by another alumni (`already referred`) |
| Accept / reject / progress actions for **your** row | Other alumni’s private reject (only affects them) |
| Chat with student (expand row) | — |

**Rules:**

- First alumni to **accept** owns the workflow; others see “already referred by alumni”.
- Personal **reject** only removes that alumni from the pool; others can still accept until one accepts.

### Your openings (job cards)

Each card = one job you posted.

| Shows | Does **not** show |
|-------|-------------------|
| Job details, skills, reward points | Other people’s jobs |
| **N requests** count on the card | — |
| **Manage referrals (N)** — expand to see list | Requests until you expand (loads on open) |
| Per-request: accept, status updates, progress, chat | Students’ requests for jobs you didn’t post |

**Manage referrals panel:**

- Lists all referral requests for **that job only**.
- Filters: All / Pending / Active / Closed.
- First pending row auto-expands when opened.

---

## 3. Track Requests (`/referrals`)

**Goal:** Everything **you** asked for (as requester).

### Top stats (when you have requests)

| Stat | Meaning |
|------|---------|
| **Total requests** | Job + company requests sent (subtitle: X job · Y company) |
| **Pending** | Waiting for alumni to accept |
| **In progress** | Accepted, referred, interviewing, etc. |
| **Hired** | Marked hired |

### Cards

**Company request you sent**

- Badge: `Company-wide`
- Progress bar + status banner
- While **pending:** link to **Messages** (many alumni)
- After **accept:** chat with the accepting alumni (collapsed by default)
- Does **not** show other alumni’s internal status

**Job request you sent**

- Badge: `Specific job`
- Same layout as company card for consistency
- Chat always with the **job poster** (collapsed by default)
- Link: **View job details**

| Does **not** show |
|-------------------|
| Incoming requests others sent **to** you (those are on Offer Referrals) |
| Your own posted jobs as requestable items |

**Preview mode:** `/referrals?demo=1` — sample cards for UI review (no live chat).

---

## 4. Job detail (`/jobs/:id`)

| Viewer | Sees |
|--------|------|
| **Anyone** | Job description, poster, reward points |
| **Student (not owner)** | Request referral dialog OR progress + chat if already requested |
| **Poster (alumni)** | “This is your opening” → link to Offer Referrals |

One request per job per user. If rejected, cannot request again for same opening.

---

## 5. Messages (`/messages`)

| Shows | Does **not** show |
|-------|-------------------|
| All 1:1 conversations (sorted by activity) | Group chats |
| Referral intro messages auto-sent on request | — |

Conversation ID = sorted pair of user IDs (`smaller_larger`).

---

## 6. Mentorship (`/consult`)

Separate from referrals: book 1:1 sessions with alumni who enable **Consultant** on their profile.

### Who appears in the mentor list

| Requirement | Why |
|-------------|-----|
| `isConsultant = true` | User opted in on signup or profile |
| Email verified | Same visibility rules as rest of app |
| **Mentorship topics selected** | Required — e.g. Software Engineering, MBA Guidance |
| **Weekly availability saved** | At least one day + time range in profile — no fake default hours |

Mentors without saved weekly hours **do not appear** in discovery until they add them in **Profile → Edit → Mentorship → Weekly availability**.

### Category chips (Software, MBA, Career Switch, …)

- Chips map to `mentorshipTopics` on the user document (not guessed from bio/skills).
- **All mentors** = no category filter.
- **MBA Guidance** = only mentors who selected `mba` in their profile.

### Filters (end-to-end)

| Filter | Where applied | Matches |
|--------|---------------|---------|
| Search box | Server | Name, headline, bio, role, company, skills, education |
| Company | Server | Current company + work history |
| Passout year | Server | Education `batchYear` |
| Experience | Server | `experienceYears` buckets |
| College | Server (More filters) | Education institution |
| Specialisation | Server (More filters) | Education stream (CSE, IT, …) |
| Session length / Price | Server (More filters) | `mentorshipDurationMinutes`, `mentorshipPriceInr` |
| Category chip | Server | `mentorshipTopics` array |

All filters run in MongoDB **before** pagination — results stay correct at 2k+ mentors.

### List at scale (2,000+ mentors)

- API: `GET /consultations/experts?page=1&limit=20&…filters`
- Response: `{ items, total, page, limit, hasMore }`
- UI: loads 20 mentors, then **infinite scroll** (or “Load more”) fetches the next page.
- Sort: mentors with more **completed sessions** first, then points.

### Trust / rating on cards

- **No fake star ratings.** Cards show **“Alumni verified”** until the mentor completes sessions.
- After sessions: **“N sessions completed”** (count increments when a scheduled session is marked **completed**).
- Future: post-session reviews can add real star ratings.

### Consultant profile fields

When `isConsultant = yes`, alumni fill **Mentorship Profile**: topics, session fee/duration, bio, experience, skills, education, etc. Students see this on mentor cards and `/consult/:id`.

### Sessions flow (Topmate-style)

1. **Mentor sets availability** — Profile → Mentorship → **Weekly availability** (required). Example: Mon–Fri 6–8 PM. Slots are split by session duration (30/45/60 min).
2. **Student picks a slot** — Only **open** (unbooked) slots appear in the book dialog, next 14 days.
3. **Payment** — Free → room immediately. Paid → `pending_payment` until **Pay & confirm** (demo; Razorpay later).
4. **Video** — Jitsi Meet at `https://meet.jit.si/referaa-session-{id}` (embedded at `/consult/session/:id`). See `docs/MENTORSHIP-SETUP.md`.
5. **Join** — **My Sessions** → Join session at scheduled time.
6. **Webhooks** — Track join/leave and duration; **do not** auto-complete the session.
7. **Complete** — After the call, either party taps **Mark complete** → increments `mentorshipSessionsCompleted`.

| Status | Meaning |
|--------|---------|
| `pending_payment` | Slot reserved; student must pay |
| `scheduled` | Paid/confirmed; meeting link ready |
| `waiting_for_participants` | Room open; waiting for joins |
| `started` | At least one participant in room |
| `completed` | Session finished |
| `cancelled` / `rejected` | Not happening |

Meeting states (`meetingStatus`): `scheduled` → `waiting_for_participants` → `started` → `completed`.

**APIs**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/consultations/experts/:id/slots` | Available slots for mentor |
| POST | `/consultations/book` | Book slot |
| POST | `/consultations/:id/pay` | Confirm simulated payment + create room |
| GET | `/consultations/:id` | Session + meeting status |
| POST | `/consultations/:id/join` | Record participant join; mentor starts session |

Legacy `POST /consultations` (message-only request) is disabled — use slot booking.

Referral success stats are **not** shown on profile pages (they live on Offer Referrals / dashboard flows).

---

## 7. Points (high level)

| Event | Requester (student) | Referrer (alumni) |
|-------|---------------------|-------------------|
| Send request | Points deducted (stages) | May receive on accept / referred / hired |
| Company request | Same schedule (default 100 pts pipeline) | Same |
| Decline / close | Depends on stage; request may be closed | — |

Reward schedule is configurable via env (`DEFAULT_COMPANY_REFERRAL_REWARD_POINTS`, job `rewardPoints` per opening).

---

## 8. What shows where — cheat sheet

| Data | Dashboard | Offer Referrals | Track Requests |
|------|-----------|-----------------|----------------|
| Your posted jobs | ❌ | ✅ | ❌ |
| Others’ jobs | ✅ Jobs tab | ❌ | ❌ |
| Request company referral | ✅ Companies tab | ❌ | ❌ |
| Company requests you sent | ❌ | ❌ | ✅ |
| Company requests to you | ❌ | ✅ | ❌ |
| Job requests you sent | ❌ | ❌ | ✅ |
| Job requests to your openings | ❌ | ✅ | ❌ |
| Your stats (posted / pending) | Partial | ✅ | ✅ (as requester) |

---

## 9. Flow diagrams

### Student requests a job referral

```text
Dashboard → Jobs → [Request referral]
    → POST /api/referrals
    → Message + notification to poster
    → Track Requests (pending)
    → Poster: Offer Referrals → Manage referrals
    → Chat both sides
    → Poster updates status → student sees progress on Track Requests
```

### Student requests company-wide referral

```text
Dashboard → Companies → [Request]
    → POST /api/company-referral-requests
    → Messages to all alumni at company
    → Track Requests (waiting)
    → Alumni: Offer Referrals → Company panel
    → One alumni accepts → others see "already referred"
    → Track Requests shows handler + chat
```

### Alumni posts an opening

```text
Offer Referrals → Post opening
    → POST /api/jobs
    → Visible on Dashboard for others (scope=community)
    → NOT visible on your own Dashboard Jobs tab
    → Manage referrals on same card when requests arrive
```

---

## 10. Demo / seed data (dev)

| Command | Purpose |
|---------|---------|
| `pnpm seed:demo` | Demo poster + seeker users |
| `pnpm seed:demo-track` | Sample track requests for **Deepak Singh Chauhan** (2 company + 2 job) |
| `/referrals?demo=1` | UI preview cards without API |

Override seed user: `SEED_TRACK_USER_EMAIL=you@email.com` in `.env`.

---

## 11. Common QA checks

1. **Post job as alumni** → open Dashboard → Jobs tab → your job must **not** appear (count or list).
2. **Company tab** → your company with only you as alumni → must **not** appear.
3. **Track Requests** → only requests **you** sent; not incoming.
4. **Offer Referrals** → Manage referrals shows rows matching request count on card.
5. **Chat** collapsed by default on Track Requests; expand to message.

---

## 12. Related docs

- [README.md](../README.md) — setup & deploy  
- [apps/backend/README.md](../apps/backend/README.md) — API & data model  
- [deploy/FIX-UPLOAD-413.md](../deploy/FIX-UPLOAD-413.md) — profile photo upload on server  
- [deploy/FIX-VERIFY-401.md](../deploy/FIX-VERIFY-401.md) — email verification on domain  

---

*Last updated for Referaa monorepo — job vs company referrals, dashboard filtering, and Track Requests stats.*
