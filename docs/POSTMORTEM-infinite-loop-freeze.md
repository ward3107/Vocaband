# Post-Mortem: App Freeze / Infinite Loop (April 5, 2026)

## The Symptom

The Vocaband app showed **"Loading Vocaband..."** and froze completely on every page load. The browser became unresponsive — even DevTools couldn't be opened. The issue persisted in incognito mode, after clearing cache, after purging Cloudflare CDN, and even after reverting to older branches.

## The Root Cause

A single function — `secureRandomInt()` — contained an infinite loop caused by a 32-bit integer overflow.

```typescript
// THIS CODE HAS A BUG — DO NOT USE
function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  const limit = (0x100000000 - (0x100000000 % max)) >>> 0;
  let r: number;
  do {
    r = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (r >= limit);
  return r % max;
}
```

### Why It Loops Forever

The function uses "rejection sampling" to avoid modulo bias in random number generation. The `limit` variable is supposed to be the largest multiple of `max` that fits in 32 bits, so any random value above it gets rejected and resampled.

The bug: when `max` divides evenly into `2^32` (like 16, 32, 64, 128, 256...), the math breaks:

```
max = 16 (the length of the QUICK_PLAY_AVATARS array)

Step 1: 0x100000000 % 16 = 0          (16 divides 2^32 evenly, remainder is 0)
Step 2: 0x100000000 - 0 = 0x100000000 (= 4,294,967,296 = 2^32)
Step 3: 0x100000000 >>> 0 = 0          (>>> 0 converts to Uint32, and 2^32 overflows to 0!)

So: limit = 0
Loop condition: while (r >= 0) → ALWAYS TRUE (unsigned integers are always >= 0)
Result: INFINITE LOOP
```

The function was called during a `useState` initializer, which runs synchronously during React's render phase — blocking the main thread permanently:

```typescript
const QUICK_PLAY_AVATARS = ['🦊', '🐸', '🦁', '🐼', ...]; // 16 items
const [quickPlayAvatar, setQuickPlayAvatar] = useState(
  () => QUICK_PLAY_AVATARS[secureRandomInt(QUICK_PLAY_AVATARS.length)] // secureRandomInt(16) → infinite loop
);
```

### Where It Came From

The function was introduced in commit `0f0e6d6` — "Potential fix for code scanning alert no. 3: Insecure randomness." A CodeQL security scanner flagged `Math.random()` as insecure, and the fix replaced it with `crypto.getRandomValues()` using a flawed rejection sampling algorithm. The irony: a security "fix" for picking a random emoji broke the entire application.

## The Fix

```typescript
function secureRandomInt(max: number): number {
  if (max <= 1) return 0;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}
```

Simple modulo without rejection sampling. For non-cryptographic use cases (picking random avatars, shuffling game options), the negligible modulo bias is irrelevant.

## Why It Took So Long to Find

### 1. The error was invisible
There was no error message, no console output, no stack trace. The browser just froze. The infinite loop ran inside a `do...while` with `crypto.getRandomValues()` which is a valid API call — it just never stopped.

### 2. The freeze happened before React could render anything
The function ran inside a `useState` initializer during the very first render of the App component. React never completed the render, so:
- No error boundary could catch it (error boundaries catch render errors, not infinite loops)
- No `useEffect` ever ran (effects run after render completes)
- The safety timeout (`setTimeout(() => setLoading(false), 5000)`) never fired because the main thread was blocked

### 3. The 8,900-line single component made it hard to isolate
With 130 `useState` hooks, 34 `useEffect` hooks, and 8,900 lines of code in a single component, there were too many potential causes to review manually.

### 4. Reverting didn't help
The `secureRandomInt` function existed in ALL branches — it was introduced early and carried through every subsequent branch. Reverting to older branches didn't fix it because the bug was already there.

### 5. Multiple red herrings
During investigation, several other issues were found that looked like they could be the cause:
- Supabase Realtime subscriptions with unstable dependency arrays
- `useAudio()` hook returning unstable function references
- Content Security Policy blocking scripts
- Stale service worker serving cached content
- Sequential `await import()` in `main.tsx` blocking the main thread

All of these were real issues worth fixing, but none were THE cause.

## How We Found It

### Step 1: Confirm the server works
Deployed a minimal "React is working!" test page. It loaded fine → confirmed Render and Cloudflare were not the issue.

### Step 2: Confirm the landing page works without App.tsx
Deployed just the LandingPage component without the App component. It loaded fine → confirmed the freeze was inside App.tsx.

### Step 3: Confirm imports aren't the problem
Deployed an interactive test with a button that manually imported vocabulary (569KB, 5,156 words) and App.tsx, showing timing. Both imported fine (496ms + 313ms) → confirmed the freeze was during React **render**, not during import/parsing.

### Step 4: Gated mount test
Deployed App with a "Mount Full App" button. Page loaded fine until the button was clicked → confirmed the freeze happened during the first render of the App component. This also allowed DevTools to be opened before the freeze.

### Step 5: Binary search with checkpoint logs
Added `console.log` checkpoints at strategic points inside the App component:

```
[App] Render start          ✓ appeared
[Cookie Banner] init         ✓ appeared  (line ~180)
[App] CP-1: basic state      ✓ appeared  (line ~254)
[App] CP-2: oauth/avatar     ✓ appeared  (line ~280)
[App] CP-3: quickplay state  ✗ NEVER APPEARED (line ~305)
```

The freeze was between CP-2 (line 280) and CP-3 (line 305). That 25-line range contained the `secureRandomInt(16)` call.

## Lessons Learned

### 1. Security fixes need testing with actual values
The `secureRandomInt` function was never tested with `max = 16`. A simple unit test would have caught the overflow:
```typescript
test('secureRandomInt works with powers of 2', () => {
  expect(() => secureRandomInt(16)).not.toThrow();
  expect(secureRandomInt(16)).toBeLessThan(16);
});
```

### 2. Don't over-engineer security for non-security contexts
Picking a random avatar emoji doesn't need cryptographic-grade unbiased randomness. `Math.random()` or simple `crypto.getRandomValues()[0] % max` is fine. Rejection sampling is only needed for cryptographic key generation.

### 3. Binary search with console.log is the fastest debugging technique for frozen pages
When a page is completely unresponsive:
1. Deploy a minimal test to confirm infrastructure works
2. Progressively add components back until it breaks
3. Add checkpoint logs inside the breaking component
4. Binary search: whichever checkpoint is the LAST one printed, the bug is between it and the next checkpoint

### 4. `>>> 0` (unsigned right shift by 0) is dangerous
This operator converts a JavaScript number to a 32-bit unsigned integer. Values at or above `2^32` (4,294,967,296) overflow to 0. It's a common source of bugs in bit-manipulation code.

### 5. Giant single-file components are a liability
An 8,900-line component with 130 state variables made this bug nearly impossible to find by code review. If the component were split into smaller pieces, the freeze would have been immediately isolatable.

## Timeline

| Time | Action | Result |
|------|--------|--------|
| Start | User reports app frozen on all page loads | "Loading Vocaband..." forever |
| +30min | Investigated Realtime subscriptions, useAudio, CSP | Found real issues but not THE cause |
| +1hr | Reverted to older branch | Still frozen — bug exists everywhere |
| +1.5hr | Merged to main, fixed build errors | Deployed but still frozen |
| +2hr | Tried: disable CSP, fix service worker, lazy loading, disable StrictMode | None worked |
| +2.5hr | Deployed minimal test | Render/Cloudflare confirmed working |
| +2.75hr | Deployed LandingPage only | Works! Confirmed App.tsx is the problem |
| +3hr | Interactive import test | Imports fine, freeze is during render |
| +3.25hr | Gated mount + checkpoint logs | Narrowed to 25-line range |
| +3.5hr | Found `secureRandomInt(16)` infinite loop | **Fixed in 1 line** |
