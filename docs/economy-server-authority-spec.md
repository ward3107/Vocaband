# Economy server-authority spec (proposal)

> **Status:** proposal / awaiting owner approval. Every change below lands in a
> **protected zone** — `server.ts` and `supabase/migrations/` — so nothing here
> has been implemented. This document is the write-up promised alongside the
> client-side economy fixes; it is for the owner to review and schedule.
>
> Source: the 2026-09 student-side audit (economy slice). Client-safe items
> (the `isoWeekKey` correctness fix) shipped separately; everything here needs
> server + DB authority and cannot be fixed safely on the client.

## TL;DR

The shop economy is **client-authoritative**: prices, spin outcomes, claim
eligibility, and booster inventory all live on (or are decided by) the client,
and the server trusts what the client sends. A user with dev-tools can mint
coins, buy anything free, always win the jackpot, re-claim daily rewards, and
grant themselves permanent boosts. None of this affects other students'
data or the app's integrity — it is self-serve cheating of one's own
XP/coins — but it undermines the reward economy the whole retention loop
depends on.

| # | Issue | Severity | Fix surface |
|---|-------|----------|-------------|
| 1 | `purchase_item` trusts client-supplied `item_cost` | **High** | `server.ts` / `purchase_item` RPC |
| 2 | Lucky Spin: prize rolled on the client, two non-atomic RPCs, free `item_cost:0` power-up grant | Medium | new `spin_lucky` RPC |
| 3 | Retention claims (daily chest / weekly / comeback) gated only by `localStorage` + device clock | Medium | new claim-ledger table + RPCs |
| 4 | Booster inventory lives entirely in `localStorage` | Medium | new inventory table + RLS |

---

## 1. `purchase_item` trusts client-supplied `item_cost` — **High**

### Current flow

`src/views/ShopMarketplaceView.tsx` calls the generic RPC with a
**client-provided price**:

```ts
supabase.rpc('purchase_item', { item_type, item_id, item_cost }) // item_cost from the client
```

Concretely:
- Pet accessory: `item_cost: acc.cost` (client constant)
- Lucky Spin debit: `item_cost: LUCKY_SPIN_COST - coinPrize` (client arithmetic, includes winnings)
- Power-up grant: `item_cost: 0`

The RPC debits exactly `item_cost` and records the unlock. Because the amount
is whatever the client sends, a crafted call can:
- **Buy anything for 0** (`item_cost: 0`)
- **Mint coins** (`item_cost: -100000` → a negative debit credits the balance)
- Grant any power-up/avatar/frame/title unlock free.

### Fix — server owns the price

The server must **look up the canonical price** for `(item_type, item_id)` and
ignore any client-sent cost.

1. Add a price source the server can read. Either:
   - a `shop_catalogue` table `(item_type text, item_id text, cost int, primary key (item_type,item_id))`, seeded from the same catalogue the client renders (`src/constants/game.ts`), **or**
   - a server-side constant map mirroring that catalogue (simpler, but must be kept in sync).
2. Change `purchase_item` to accept only `(item_type, item_id)` — **drop the `item_cost` parameter**. Inside the RPC (SECURITY DEFINER):
   - resolve `cost` from the catalogue; reject unknown items;
   - re-read the user's `coins` inside the transaction;
   - reject if `coins < cost` (server-side, not client-side);
   - `coins := coins - cost` and record the unlock atomically;
   - return `{ success, new_coins }`.
3. Reject any `cost <= 0` that isn't an explicitly free item, and never allow a
   negative debit.

### Client change (after the RPC lands)

Remove `item_cost` from all four call sites in `ShopMarketplaceView.tsx`; keep
the optimistic `setCoins(data.new_coins)` from the server's authoritative reply.

---

## 2. Lucky Spin — client-rolled, non-atomic, free grant — Medium

### Current flow

```ts
const prize = rollSpinPrize();                 // ← prize decided on the CLIENT
await purchase_item({ item_cost: LUCKY_SPIN_COST - coinPrize }); // debit net (issue #1)
if (prize.kind === 'power_up')
  await purchase_item({ item_id: puId, item_cost: 0 });          // free grant (issue #1)
```

Three problems:
- **Prize is client-authoritative** — a crafted client always rolls the jackpot.
- **Two separate RPCs** — if the second fails, the student paid but the power-up
  never lands (or vice-versa). No atomicity.
- The grant rides on the free `item_cost: 0` path from issue #1.

### Fix — one server RPC that rolls and books atomically

Add `spin_lucky()` (SECURITY DEFINER, no client args beyond the session):
1. Re-read `coins`; reject if `< LUCKY_SPIN_COST`.
2. **Roll the prize server-side** from the odds table (move `rollSpinPrize`'s
   distribution to the server; the client keeps only the *display* table).
3. In one transaction: debit `LUCKY_SPIN_COST`, credit any coin prize, and/or
   increment the power-up inventory (see #4).
4. Return `{ success, new_coins, prize }` so the client animates the *server's*
   result.

The client's `purchaseSpin` becomes a single `spin_lucky()` call; delete the
client roll and the second RPC.

---

## 3. Retention claims gated only by `localStorage` + device clock — Medium

### Current flow

`src/hooks/useRetention.ts` decides eligibility for the daily chest, weekly
challenge, and comeback bonus from **per-user `localStorage` keys + `Date.now()`**
(`vocaband_retention_<uid>_*`). `ShopMarketplaceView.handleClaimChest` calls
`retention.claimDailyChest()` then `setXp(xp + reward.xp)`.

Clearing site data or moving the device clock re-arms every claim → unlimited
XP farming.

### Fix — server-side claim ledger

1. New table `reward_claims (user_uid uuid, kind text, period_key text, claimed_at timestamptz, xp int, primary key (user_uid, kind, period_key))` with RLS restricting rows to `auth.uid()`.
   - `period_key` is the server's day key for `daily_chest`, the server's ISO
     week for `weekly_challenge`, etc. (compute it **on the server**, from
     `now()` — never trust a client-sent key).
2. New RPC `claim_reward(kind)` (SECURITY DEFINER): compute `period_key` from
   `now()`, `INSERT ... ON CONFLICT DO NOTHING`; if a row was inserted, credit
   the XP and return it; if not, return "already claimed". The unique key makes
   double-claims impossible regardless of client state or clock.
3. `useRetention` keeps `localStorage` only as an **optimistic UI cache**; the
   server reply is the source of truth for what actually credited.

---

## 4. Booster inventory in `localStorage` — Medium

### Current flow

`src/hooks/useBoosters.ts` stores booster expiries and power-up counts in
`localStorage`. Editing those values grants permanent 2× (XP **and** coins —
that dual effect is intentional, see the `coinMultiplier` note in the hook) or
unlimited power-ups for free.

### Fix — server-side inventory

1. New table `user_boosters (user_uid uuid, booster_id text, expires_at timestamptz null, count int default 0, primary key (user_uid, booster_id))`, RLS to `auth.uid()`.
2. Activation/consumption goes through RPCs (`activate_booster`,
   `consume_power_up`) that write this table; purchase routes through the
   hardened `purchase_item` (#1).
3. `useBoosters` reads the server inventory and keeps `localStorage` only as an
   offline/optimistic cache.

---

## Rollout notes

- **All four changes touch protected zones** (`server.ts`, `supabase/migrations/`)
  and require the owner's explicit go-ahead per `CLAUDE.md`.
- `supabase-migrations.yml` **auto-applies migrations on merge with no
  PR-time validation** — a bad migration reaches production directly. Each
  migration here must be idempotent, additive, and rehearsed on a branch DB
  first.
- Suggested order: (1) `purchase_item` hardening (highest impact, smallest
  surface) → (2) `spin_lucky` → (3) `reward_claims` → (4) `user_boosters`.
  Each is independently shippable; ship #1 first.
- Client edits (removing `item_cost`, collapsing the spin to one call, treating
  `localStorage` as a cache) land **in the same PR as each RPC** so the client
  never sends a parameter the new RPC rejects.
- These are anti-cheat hardening, not data-integrity or cross-user security
  bugs; there is no exposure of other students' data. Prioritise accordingly.
