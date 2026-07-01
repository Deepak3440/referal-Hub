# Mentorship — slots, payment & video

How mentorship booking works end-to-end (Topmate-style).

---

## Quick flow

| Step | Who | What happens |
|------|-----|----------------|
| 1 | **Mentor** | Profile → Edit → Mentorship → add **weekly hours**, topics, fee, duration → Save |
| 2 | **Student** | Mentorship → pick mentor → **Book session** → choose **open slot** only |
| 3 | **Student** | Confirm & **pay with points** (demo wallet; Razorpay later) if fee &gt; 0 |
| 4 | **Both** | My Sessions → **Join session** at scheduled time |
| 5 | **Both** | After the call → **Mark complete** → mentor receives points |

---

## Who appears in the mentor list

A mentor is shown **only if all** of these are true:

1. `isConsultant = true` and profile is public  
2. **Mentorship topics** selected in profile  
3. **Weekly availability** saved (at least one day + time range)  
4. At least **one open slot** in the next 14 days (not fully booked)

Mentors can update hours anytime in Profile → Edit → Mentorship. Slots refresh automatically; booked times stay hidden.

---

## Booking rules (real UX)

| Rule | Why |
|------|-----|
| One active session per mentor | Cannot book the same mentor again until you pay, complete, or cancel the current one |
| Slot locked on book | Paid sessions hold the slot in `pending_payment` (auto-released after 30 min if unpaid) |
| Pay confirms deduction | Points leave student wallet on **Pay**; mentor gets them on **Mark complete** |
| Cancel before complete | Points refunded to student; slot opens again |
| No double-book same time | Server blocks if that exact slot was just taken |

---

## Points payment (demo → Razorpay later)

| Step | Student | Mentor |
|------|---------|--------|
| Book paid session | Slot reserved → `pending_payment` | — |
| Pay X pts | X pts **deducted** from wallet | — |
| Mark complete | — | X pts **credited** to wallet |
| Cancel (before complete) | X pts **refunded** | — |

**Free sessions** (fee = 0): no points move; book → join directly.

**Razorpay (future):** Replace the confirm-points dialog with a Razorpay redirect; keep the same complete/credit flow after payment succeeds.

---

## Points system — complete guide (fair flow)

### Checkpoints (3 steps)

| # | Checkpoint | Student wallet | Mentor wallet |
|---|------------|----------------|---------------|
| 1 | **Confirm booking** | No charge — balance must have enough pts | — |
| 2 | **Session goes Live** | Mentor joins **during scheduled window** (10 min before slot → end + 15 min) | **−X pts charged** | — |
| 3 | **Mark complete** | — | **+X pts** |

### Real example — your 50 pt / 10 am scenario

**Before (unfair):** Pay at book → 10 min call → cancel → full refund.

**Now (fair):**

| Action | Points |
|--------|--------|
| Book + confirm at 9:00 | 0 charged (50 pts **reserved**) |
| Cancel at 9:30 before call | 0 charged — cancel freely |
| Mentor joins at 10:00 | **50 pts charged** — status **Live** |
| Try cancel at 10:10 | **Blocked** — call already live |
| Short / bad session | Student taps **Report issue** → admin reviews |
| Happy session | **Mark complete** → mentor gets 50 pts |

### Automatic vs manual

| Event | Automatic? |
|-------|------------|
| Reserve pts on confirm booking | Yes (checks balance, no wallet change) |
| Charge pts when mentor joins | Yes |
| Refund on cancel **before** live | Yes (nothing was charged) |
| Refund after live | **No** — use dispute |
| Mentor paid | Manual **Mark complete** (or admin dispute resolution) |
| Unpaid booking expires (30 min) | Yes — slot released, no charge |

### Disputes (admin)

1. Student: **Report issue** in My Sessions (after live + pts charged).
2. Admin: `/admin/mentorship` — **Refund student**, **Pay mentor**, or **Dismiss**.
3. Admin reviews at `/admin/mentorship` (sign in as `admin@referaa.com` from `pnpm seed:admin`).

### Where points live

Every user has a **wallet** field: `totalPoints` on their profile. Mentorship uses this same wallet (separate from referral rewards, which also use points).

| How you get points | Automatic? | When |
|--------------------|------------|------|
| **Sign up** | Yes | New account gets `INITIAL_USER_POINTS` (default **200** pts) |
| **Buy points** (Profile) | Manual | Student picks a pack → demo purchase adds pts to wallet (Razorpay later) |
| **Referrals** | On referral steps | Separate flow — not mentorship |
| **Mentorship as mentor** | Manual trigger | Student taps **Mark complete** → mentor receives session fee in pts |

### Real experience — paid session (e.g. 50 pts)

```
Student wallet: 200 pts          Mentor wallet: 100 pts
Mentor fee: 50 pts/session

1. Book slot          →  Student: 200 pts (no change yet)
                         Status: pending_payment
                         Slot is HELD for 30 minutes

2. Pay & confirm      →  Student: 150 pts (−50)     ← DEDUCT HERE
                         Status: scheduled
                         Jitsi link created

3. Join video call    →  No point change
                         Mentor join → session "started"

4. Mark complete      →  Student: 150 pts (no change)
                         Mentor: 150 pts (+50)       ← CREDIT HERE

OR cancel before step 4:
   Cancel session     →  Student: 200 pts (+50 refund)
                         Mentor: unchanged
```

**Important:** Points leave the student on **Pay**, not on book. The mentor gets them only on **Mark complete** — not when the call starts and not automatically when time ends.

### Free session (fee = 0)

| Step | Points |
|------|--------|
| Book | No deduction |
| Join | No change |
| Mark complete | No credit to mentor (nothing was paid) |

### What is automatic vs manual

| Action | Who / what | Points effect |
|--------|------------|---------------|
| **Reserve slot** | Student clicks Reserve | None — slot locked only |
| **Pay** | Student confirms payment | **Deduct** from student |
| **Unpaid 30 min** | Server auto-cancels `pending_payment` | None — never paid, so no refund |
| **Cancel** (before/during scheduled, not after call started) | Student or mentor | **Refund** student if already paid |
| **Join Jitsi** | Either party | None |
| **Mentor joins** | Server marks `started` | None |
| **Mark complete** | Student or mentor (after scheduled time) | **Credit** mentor |
| **Session auto-ends** (15 min after scheduled end, still `started`) | Server cleanup job | **No** mentor credit — must still Mark complete for payout |
| **Cannot cancel** | Status `started` | Use Mark complete instead; refund rules don't apply mid-call |

### Refund rules (exact)

Refund runs only when **all** are true:

1. Session is **cancelled** (not completed)
2. `pointsDeducted === true` (student already paid)
3. `mentorPointsCredited === false` (mentor not paid yet)

If student never paid (`pending_payment` cancelled or auto-expired) → **no refund** because nothing was deducted.

If mentor already received points → **no refund** on cancel (cancel is blocked once call is `started` anyway).

### Database flags (per session)

| Field | Meaning |
|-------|---------|
| `amountPoints` | Session price in points |
| `pointsDeducted` | `true` after student paid |
| `mentorPointsCredited` | `true` after Mark complete credited mentor |
| `paymentStatus` | `pending` → `simulated` (paid) → `refunded` (cancelled) |

### UI locations for points

| Screen | What you see |
|--------|----------------|
| Profile | Wallet balance + **Buy points** |
| Book dialog | Balance check before pay; confirm dialog before deduct |
| My Sessions → Awaiting payment | **Pay X pts** button |
| My Sessions | Cancel shows refund note if points were deducted |
| After Mark complete | Toast: “X pts sent to mentor” / “X pts added to your wallet” |

### Cancel — when & where

| Session state | Cancel button? | What happens |
|---------------|----------------|--------------|
| Awaiting confirm / Scheduled / Waiting for mentor | **Yes** (both sides) | No charge if not live yet; refund if pts already charged |
| **Live** (mentor joined) | **No** | Use **Mark complete** or student **Report issue** |
| Completed / Cancelled | No | — |

**UI:** Mentorship → **My Sessions** → **Cancel** on the row (only before Live).

### Report issue (complaint) — students only

| Who | When | Button |
|-----|------|--------|
| **Student** | After session is **Live** and points charged; mentor not paid yet | **Report issue** in Actions |
| **Mentor** | — | No complaint button (use Mark complete) |

Student writes what went wrong (min 20 chars). Status becomes **Under review**. Refund is **not automatic**.

### Admin dispute tickets

1. Run `pnpm seed:admin` once (creates `admin@referaa.com` with `isPlatformAdmin` on the user).
2. Sign in as admin → open **`/admin/mentorship`** (not in sidebar — bookmark the URL).
3. Optional: add more admins via `ADMIN_USER_IDS=1,2` in `.env` **or** set `isPlatformAdmin` in the database.
   - **Refund student** — pts back to student, session cancelled
   - **Pay mentor** — pts to mentor, session completed
   - **Dismiss · pay mentor** — complaint rejected, mentor paid

---

## Slots — how they work

- Mentors define **weekly recurring hours** (e.g. Mon 10:00–18:00, Wed 14:00–17:00).
- The server splits those hours into bookable chunks using **session duration** (30 / 45 / 60 min).
- **Booked slots are hidden** — once a student books, that time is removed for everyone else.
- **No fake defaults** — if a mentor has not saved weekly hours, they do **not** appear in the mentor list and no slots are shown.
- Slots must be **at least 1 hour ahead**; booking window is **next 14 days**.

### Mentor profile fields

| Field | Purpose |
|-------|---------|
| `mentorshipWeeklyAvailability` | Days + from/to times |
| `mentorshipDurationMinutes` | Length of each slot |
| `mentorshipPriceInr` | Session fee in **points** (0 = free) |
| `mentorshipTopics` | Category chips (MBA, Career Switch, …) |

### APIs

| Method | Path | Returns |
|--------|------|---------|
| GET | `/consultations/experts/:id/slots` | `{ slots, availabilityConfigured, weeklySchedule, durationMinutes }` |
| POST | `/consultations/book` | Book one slot |
| POST | `/consultations/:id/pay` | Points payment + Jitsi meeting link |
| POST | `/consultations/:id/join` | Record join; mentor join marks session started |
| PATCH | `/consultations/:id` | `{ status: "completed" \| "cancelled" }` |

---

## `.env` — what to set

Copy from `.env.example` into your root `.env`.

### Minimum (local dev)

```env
MENTORSHIP_PAYMENT_ENABLED=true
JITSI_DOMAIN=meet.jit.si
```

- Video joins use Jitsi: `https://meet.jit.si/referaa-session-{consultationId}`
- In-app join page: `/consult/session/{consultationId}` (embedded Jitsi iframe)
- Payment is **simulated points** (no real charge)

### Production video (Jitsi)

```env
JITSI_DOMAIN=meet.jit.si
```

For a self-hosted Jitsi instance, set `JITSI_DOMAIN` to your domain (e.g. `meet.yourdomain.com`). No API keys are required for public Jitsi rooms.

Room names are deterministic: `referaa-session-{consultationId}`.

### Payment (later — Razorpay)

```env
MENTORSHIP_PAYMENT_ENABLED=true   # keep true; swap demo pay in mentorship-payment.ts
```

---

## Session states

| Status | Meaning |
|--------|---------|
| `pending_payment` | Slot reserved; student must pay |
| `scheduled` | Confirmed; join link ready |
| `waiting_for_participants` | Someone opened the room |
| `started` | Call in progress |
| `completed` | **Manual** — mentor or student tapped Mark complete |
| `cancelled` | Cancelled before/during window |

**Meeting** (`meetingStatus`) tracks video: `scheduled` → `started` → `ended`.  
When everyone leaves the room, status becomes `ended` but the session stays **not completed** until someone taps **Mark complete**.

---

## UI locations

| Screen | Purpose |
|--------|---------|
| Profile → Mentorship | Mentor sets weekly hours |
| `/consult` | Browse mentors (only those with hours + topics) |
| Book dialog | Shows mentor hours + **only open slots** |
| `/consult?tab=sessions` | Pay, join, mark complete |
| `/consult/session/:id` | Join page (embedded Jitsi + open in new tab) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Mentor not in list | Add topics + weekly hours in profile and save |
| No slots in book dialog | Add hours, or all slots booked, or times within 1h |
| No join link | Complete payment (paid sessions) or check backend logs |
| Video not loading | Check `JITSI_DOMAIN` or try “Open in new tab” on session page |
| Old API behaviour | Run `pnpm --filter @referaa/backend run build` and restart |
