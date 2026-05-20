# 07 — Shop, Economy, and Boosters

> XP economy, shop catalogue (avatars, titles, pets, boosters), purchase flow, equip flow, and booster effects across games.
>
> Key files: `src/views/ShopMarketplaceView.tsx` (renamed from `ShopView.tsx` in some places), `src/components/AvatarPicker.tsx`, `src/hooks/useBoosters.ts`, `src/hooks/usePinnedShopItem.ts`, `src/hooks/usePetEvolution.ts`, `src/hooks/useAwardBadge.ts`, `src/constants/game.ts` (XP_TITLES, PET_MILESTONES, CLASS_AVATARS).

---

## 1. Purpose of Module

- **What:** Soft-currency economy where students spend earned XP to unlock cosmetic (avatars, titles, pets) and functional (boosters, streak freezes) items.
- **Who:** Students primarily; teachers consume class-level avatar customization.
- **Why:** Retention engine. Variable rewards and aspirational items drive daily return.
- **Criticality:** **S2** — economic exploits damage fairness but don't compromise PII. Still S1-adjacent if cascading bugs cause XP loss.

---

## 2. User Flow Mapping

### 2.1 Purchase happy path

```
Student dashboard → Shop tab
→ ShopMarketplaceView mounts → Arcade Lobby
→ pick category (Avatars / Titles / Pets / Boosters / Backgrounds / Effects)
→ category sheet opens
→ tap item → preview + price
→ if affordable: "Buy" → server RPC `purchase_item`
   → atomic: deduct xp, insert into `user_inventory`
   → returns updated balance + inventory
→ UI animates purchase confirm + new item appears in inventory
→ user can equip immediately
```

### 2.2 Equip / unequip

```
Inventory → pick item → "Equip"
→ RPC updates `equipped_items` row
→ UI reflects across dashboard, leaderboard, classroom
```

### 2.3 Booster activation

```
Purchase booster (e.g. xp_booster_2x for 60min) OR earn from retention
→ Inventory → Activate → RPC sets booster_active_until = now() + duration
→ useBoosters hook polls + updates UI: badge in HUD
→ Next games: server applies booster on XP calc
→ Booster expires → UI clears badge
```

### 2.4 Failure paths

| Path                                          | Detection                            | Recovery                                                     |
|-----------------------------------------------|--------------------------------------|--------------------------------------------------------------|
| Insufficient XP                               | Server returns `insufficient_funds`  | UI shows "Need X more XP"                                    |
| Already owned                                 | Server returns `already_owned`       | UI shows "You own this"; equip button instead                |
| Network error during purchase                  | Promise reject                       | Optimistic UI rolls back; toast                              |
| Race: two tabs purchase simultaneously         | Server transaction                   | One succeeds; the other returns `insufficient_funds`         |
| Booster already active                         | Server stacks OR replaces (define)   | Documented policy                                            |

---

## 3. Functional QA Scenarios

| ID            | Scenario                                                     | Steps                                                       | Expected                                                                  | Severity | Priority |
|---------------|--------------------------------------------------------------|-------------------------------------------------------------|----------------------------------------------------------------------------|----------|----------|
| SHOP-FUNC-001 | Open Shop tab                                                | Dashboard → Shop                                            | Arcade lobby loads with all categories                                    | S2       | P0       |
| SHOP-FUNC-002 | Browse category                                              | Tap "Avatars"                                               | Sheet animates up; grid renders                                            | S3       | P1       |
| SHOP-FUNC-003 | Purchase affordable item                                     | Pick item priced < balance → Buy                            | Inventory updated; balance reduced; item equippable                       | S2       | P0       |
| SHOP-FUNC-004 | Purchase unaffordable item                                   | Pick item priced > balance → Buy                            | Friendly modal: "Need X more XP"; no transaction                          | S3       | P1       |
| SHOP-FUNC-005 | Already-owned item                                            | Purchase repeat                                              | UI shows "Owned"; no double-charge                                         | S3       | P1       |
| SHOP-FUNC-006 | Equip avatar                                                  | Inventory → equip                                            | Avatar visible on dashboard/leaderboard within 1s                          | S3       | P1       |
| SHOP-FUNC-007 | Unequip                                                       | Equip → unequip                                              | Default avatar restored                                                    | S4       | P2       |
| SHOP-FUNC-008 | Activate booster                                              | Inventory → activate xp_booster_2x                          | Active timer in HUD; next game XP × 2                                      | S2       | P1       |
| SHOP-FUNC-009 | Booster expiry                                                | Wait until timer = 0                                         | UI clears badge; next game uses normal XP                                  | S2       | P1       |
| SHOP-FUNC-010 | Streak freeze redemption                                      | Activate streak_freeze on rest day                          | Streak preserved next day                                                 | S2       | P1       |
| SHOP-FUNC-011 | Pin item to pinned-shop slot                                  | Long-press item                                              | Saved in `usePinnedShopItem`; shown on dashboard                          | S4       | P2       |
| SHOP-FUNC-012 | Title equip                                                   | Pick title → equip                                           | Title displays under name in leaderboard                                  | S4       | P2       |
| SHOP-FUNC-013 | Pet evolution                                                  | Reach PET_MILESTONE threshold                                | Pet evolves automatically; animation triggered                            | S3       | P1       |
| SHOP-FUNC-014 | Avatar from custom class palette                              | Teacher-provided custom avatars                              | Visible only in their class                                               | S3       | P2       |
| SHOP-FUNC-015 | Insufficient XP toast for booster                             | Try to activate with no booster owned                       | "You don't own this booster"                                              | S4       | P2       |

---

## 4. Edge Cases & Failure Injection

### 4.1 Data edge cases

| ID            | Input                                                          | Expected                                                  |
|---------------|----------------------------------------------------------------|-----------------------------------------------------------|
| SHOP-EDGE-001 | XP balance = 0                                                  | Cannot buy anything; CTAs disabled                       |
| SHOP-EDGE-002 | XP balance > max int                                            | Cap at safe maximum                                       |
| SHOP-EDGE-003 | Item price = 0 (free / promo)                                  | Allowed; treated as free                                  |
| SHOP-EDGE-004 | Item removed from catalogue but in user inventory              | Inventory shows as legacy; not re-sellable               |
| SHOP-EDGE-005 | New item launched mid-session                                  | Refresh shop list within polling interval                |
| SHOP-EDGE-006 | Localized name missing in HE/AR                                | English fallback; flagged in observability                |

### 4.2 User-behavior edge cases

| ID            | Behavior                                                        | Expected                                                  |
|---------------|------------------------------------------------------------------|-----------------------------------------------------------|
| SHOP-EDGE-101 | Double-tap Buy                                                  | Single purchase                                            |
| SHOP-EDGE-102 | Two tabs buying same item                                       | One success, one `insufficient_funds`                     |
| SHOP-EDGE-103 | Rapid equip/unequip                                              | Final state matches last action                            |
| SHOP-EDGE-104 | Background app during booster countdown                          | Timer continues server-side                               |
| SHOP-EDGE-105 | Pull-to-refresh inside shop sheet                                | Prevent; bounce only                                      |
| SHOP-EDGE-106 | Booster activated then game finished offline                     | XP saved with booster applied on reconnect               |

### 4.3 Infrastructure edge cases

| ID            | Failure                                            | Expected                                                  |
|---------------|----------------------------------------------------|-----------------------------------------------------------|
| SHOP-EDGE-201 | Purchase RPC times out                             | Optimistic UI rollback; retry                            |
| SHOP-EDGE-202 | Race condition: server lag returns stale balance   | Server is authoritative; client sync                     |
| SHOP-EDGE-203 | Catalogue fetch fails                              | Cached fallback; clear retry                              |
| SHOP-EDGE-204 | Asset images 404                                    | Default placeholder; log                                  |

---

## 5. Security QA

| ID           | Attack                                                    | Exploit                                                                                | Expected secure behavior                                                                       |
|--------------|-----------------------------------------------------------|----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| SHOP-SEC-001 | Inflate XP via PostgREST PATCH                            | `PATCH /rest/v1/users?id=eq.me { "xp": 999999 }`                                       | RLS forbids client write to `xp`; only RPC may modify                                          |
| SHOP-SEC-002 | Purchase with negative price                               | Forge item id with negative cost                                                       | Server uses catalogue (server-side), ignores client item params                                |
| SHOP-SEC-003 | Duplicate-purchase race                                    | Spam purchase RPC                                                                       | Atomic transaction; idempotency on (user_id, item_id) for unique items                         |
| SHOP-SEC-004 | Equip item not in inventory                                | Forge equip request                                                                     | Server validates ownership                                                                     |
| SHOP-SEC-005 | Booster duration tampering                                 | Activate then patch timestamp                                                          | Server stores `booster_active_until` only                                                       |
| SHOP-SEC-006 | Inject HTML in title text                                  | Custom title text via tampering                                                         | Titles are catalog items, no free-text                                                          |
| SHOP-SEC-007 | Privilege check on admin items                              | Try to buy admin-only item                                                              | Server checks role / availability flags                                                        |
| SHOP-SEC-008 | XP transfer between accounts (not implemented)             | Crafted RPC                                                                             | If/when added, transfer requires consent + audit                                                |

---

## 6. Accessibility QA

| ID             | Check                                                       | Expected                                                  |
|----------------|-------------------------------------------------------------|-----------------------------------------------------------|
| SHOP-A11Y-001  | Category cards have aria-label                               | Yes                                                       |
| SHOP-A11Y-002  | Buy/Equip buttons keyboard accessible                        | Yes                                                       |
| SHOP-A11Y-003  | Sheet modal trap focus                                       | Yes                                                       |
| SHOP-A11Y-004  | Live region announces purchase outcome                       | Yes                                                       |
| SHOP-A11Y-005  | Item rarity not conveyed by color alone                      | Icon / text label included                                |
| SHOP-A11Y-006  | RTL: shop sheet slides from correct edge                     | Yes                                                       |

---

## 7. Responsive & Device QA

| ID            | Device                                          | Check                                                  |
|---------------|--------------------------------------------------|--------------------------------------------------------|
| SHOP-RESP-001 | iPhone SE                                       | Grid 2 col; sheet covers safely                        |
| SHOP-RESP-002 | iPad                                            | 3 col                                                  |
| SHOP-RESP-003 | Desktop                                          | 4+ col; sheet centered                                  |
| SHOP-RESP-004 | Tall screens (Z Fold)                            | Grid adapts                                            |
| SHOP-RESP-005 | Long pet name truncates                          | Tooltip on hover                                       |

---

## 8. Performance QA

| Metric                                | Target          | Critical    |
|--------------------------------------|-----------------|-------------|
| Shop initial render                   | < 800ms         | > 2s        |
| Sheet open animation                  | < 250ms         | > 600ms     |
| Purchase RPC RTT                      | < 600ms         | > 2s        |
| Inventory load                         | < 500ms         | > 1.5s      |
| Catalogue list size budget            | < 100KB gz      | > 250KB gz  |

---

## 9. Database Integrity QA

| ID           | Check                                                                          | Expected                                                  |
|--------------|--------------------------------------------------------------------------------|-----------------------------------------------------------|
| SHOP-DB-001 | `user_inventory` UNIQUE on (user_id, item_id) for unique items                  | Yes                                                       |
| SHOP-DB-002 | RLS: read own inventory only                                                    | Yes                                                       |
| SHOP-DB-003 | RLS: write only via RPC; never direct PATCH                                     | Yes                                                       |
| SHOP-DB-004 | `purchase_item` RPC atomic: deduct + insert                                     | Yes                                                       |
| SHOP-DB-005 | Audit log on each purchase                                                       | Yes                                                       |
| SHOP-DB-006 | Soft retire of catalog items                                                    | `is_active` flag, never DELETE                            |
| SHOP-DB-007 | Booster expiration cleanup job                                                  | Cron or on-read filter                                    |
| SHOP-DB-008 | Indexes on (user_id, item_id), (user_id, equipped_at)                            | Verified                                                  |

---

## 10. API QA

### `POST /rest/v1/rpc/purchase_item`

```json
{ "itemId": "avatar_cat_01" }
200 → { "balance": 240, "inventoryItem": {...} }
400 → { "error": "validation" }
402 → { "error": "insufficient_funds", "balance": 120, "price": 200 }
409 → { "error": "already_owned" }
403 → { "error": "not_available" }
```

| ID           | Check                                                                | Expected                                  |
|--------------|----------------------------------------------------------------------|-------------------------------------------|
| SHOP-API-001 | Auth required                                                        | 401 otherwise                             |
| SHOP-API-002 | Server uses catalog server-side                                       | Yes                                       |
| SHOP-API-003 | Atomic transaction                                                    | Yes                                       |
| SHOP-API-004 | Idempotency (optional)                                                | Yes                                       |
| SHOP-API-005 | Rate limit                                                            | 20/min/user                               |
| SHOP-API-006 | Audit log                                                             | Yes                                       |

---

## 11. State Management QA

| ID             | Check                                                                | Expected                                  |
|----------------|----------------------------------------------------------------------|-------------------------------------------|
| SHOP-STATE-001 | Optimistic update of XP balance                                       | Rolls back on fail                        |
| SHOP-STATE-002 | Inventory cache invalidation on purchase                              | Yes                                       |
| SHOP-STATE-003 | `useBoosters` polling stops when no active booster                    | Yes                                       |
| SHOP-STATE-004 | Equipped state shared across views                                    | Yes (atom or context)                     |
| SHOP-STATE-005 | Pet evolution side-effects on dashboard refresh                       | Yes                                       |

---

## 12. Observability & Monitoring QA

| ID            | Signal                                          | Threshold              | Indicates                          |
|---------------|--------------------------------------------------|------------------------|------------------------------------|
| SHOP-OBS-001  | Purchase RPC success rate                       | < 99% → alert          | Issue                              |
| SHOP-OBS-002  | Insufficient-funds rate                          | > 30% → review         | UX or pricing issue                |
| SHOP-OBS-003  | Booster activation count                        | track                  | Engagement signal                  |
| SHOP-OBS-004  | XP economy inflation (avg balance trend)         | watch                  | Sources outpacing sinks            |
| SHOP-OBS-005  | Suspicious bulk purchase                         | > 10/min/user → alert  | Abuse                              |

---

## 13. QA Automation Strategy

| Layer       | Tool      | Coverage                                                       |
|-------------|-----------|----------------------------------------------------------------|
| Unit        | Vitest    | booster effect calc, price formatting                          |
| Integration | Supabase  | `purchase_item` RPC happy + race                              |
| E2E         | Playwright | Buy → equip → use in game; booster XP confirmed                |
| Visual      | Playwright | shop sheet × 3 languages                                       |
| Load        | k6        | 100 concurrent purchases                                        |
| Security    | manual    | RLS regression, item id tamper                                 |

**P0**: RLS regression + atomic RPC tests. **P1**: visual diff on shop sheets.

---

## 14. Production Readiness Score (Shop)

| Dimension       | Score | Notes                                                                                       |
|-----------------|-------|---------------------------------------------------------------------------------------------|
| Functional      | 4     | Mature                                                                                      |
| Security        | 4     | RPC-only writes; needs final audit                                                          |
| Performance     | 4     | Lazy sheets                                                                                 |
| Accessibility   | 3     | Sheets need full keyboard pass                                                              |
| Reliability     | 4     | Optimistic + rollback                                                                       |
| Observability   | 2     | Economy dashboards pending                                                                  |
| Data integrity  | 4     | RPC + unique constraints                                                                    |

**Module readiness: 3.6 / 5.**

---

## 15. QA Success Metrics

| KPI                                | Acceptable | Warning  | Critical |
|------------------------------------|------------|----------|----------|
| Purchase success rate              | ≥ 99%      | 95–99%   | < 95%    |
| Double-charge incidents             | 0          | 1        | > 1      |
| Booster correctness                | 100%       | < 100%   | —        |
| Economy inflation w/w              | < 5%       | 5–15%    | > 15%    |
| Suspected exploit attempts / week  | 0          | 1–5      | > 5      |

---

## 16. Self-QA Validation

**Missed initially:**
1. **Booster stacking policy** — define explicitly: replace vs stack.
2. **Catalog localization fallback** — added SHOP-EDGE-006.
3. **Soft retirement of items** — added SHOP-DB-006.
4. **Pet evolution race** — overlapping with game finish: needs single source of truth (server post-finish).
5. **XP transfer feature (future)** — pre-emptive note added.

**Dangerous assumptions:**
- "Client never adjusts XP directly" — verify RLS denies all client writes to `users.xp`.
- "Catalog is small" — could grow; ensure pagination.

**Hidden failures:**
- A child's XP balance silently zeroes after a bug — must have audit log + RCA path.
- Equipped pet that was retired still tries to load animation → graceful fallback.
