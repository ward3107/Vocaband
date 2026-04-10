# Student Quick Play Back Button Flow Map

## Views in Order:
1. **public-landing** - Landing page
2. **quick-play-student** (no name) - Join screen
3. **quick-play-student** (has name) - After entering name
4. **game** (showModeSelection=true) - Mode selection overlay
5. **game** (showModeSelection=false) - Active game
6. **isFinished=true** - Completion screen

---

## Current Back Button Behavior:

### 1. Join Screen Back Button (line 4471-4480)
```javascript
onClick={async () => {
  setView("public-landing");
  setQuickPlayActiveSession(null);
}}
```
**Goes to:** public-landing ✓ CORRECT

---

### 2. Game View Back Button (handleExitGame - line 3425-3429)
```javascript
} else if (user?.isGuest) {
  setShowModeSelection(true);
  setFeedback(null);
}
```
**Goes to:** Mode selection
**PROBLEM:** Only works if user is IN the game view when clicking back

---

## THE BUG:

When student is on **Mode Selection** (showModeSelection=true), clicking back:

1. If they're technically still in "game" view → `handleExitGame` → `setShowModeSelection(true)` → DOES NOTHING (already true!)
2. Browser history might go back to previous URL
3. Or some other back button fires that sends them to landing

**Root cause:** The back button at the top of the student screen (line 4471) is ONLY on the join screen, not during the game!

---

## Missing Back Buttons:

### During Mode Selection:
- ❌ No back button visible at top of screen (only Exit button exists at line 8208)
- The Exit button calls `handleExitGame` which is correct
- But if clicking browser back button, it might trigger unwanted navigation

### During Game:
- ✅ Exit button at line 8208 calls `handleExitGame` correctly
- Should return to mode selection

---

## PROPOSED FIX:

Add a consistent back button behavior:
1. **Join Screen back**: → Landing (clear session) ✓
2. **Mode Selection back**: → Landing (clear session) 
3. **Game back**: → Mode selection (keep session)
4. **Browser back button**: Should match the in-app back button
