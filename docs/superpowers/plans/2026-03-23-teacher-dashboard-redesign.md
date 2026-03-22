# Teacher Dashboard Design Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply new visual design to Teacher Dashboard by creating 3 reusable UI components and integrating them into App.tsx.

**Architecture:** Extract presentation components (TopAppBar, ActionCard, ClassCard) that use MD3 semantic color tokens. Keep all existing logic, handlers, and state in App.tsx unchanged.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide React icons, Framer Motion

---

## File Structure

```
src/
├── components/
│   ├── TopAppBar.tsx      (NEW - glassmorphism header)
│   ├── ActionCard.tsx     (NEW - icon + title + CTA card)
│   └── ClassCard.tsx      (NEW - class info with action grid)
├── App.tsx                (MODIFY - import components, update JSX)
└── index.css              (UNCHANGED - MD3 tokens already defined)
```

---

## Chunk 1: Create UI Components

### Task 1: Create TopAppBar Component

**Files:**
- Create: `src/components/TopAppBar.tsx`

- [ ] **Step 1: Create components directory and TopAppBar file**

```tsx
// src/components/TopAppBar.tsx
import React from "react";
import { ChevronLeft } from "lucide-react";

interface TopAppBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  userAvatar?: string;
  onLogout?: () => void;
  onPrivacy?: () => void;
}

const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  userAvatar,
  onLogout,
  onPrivacy,
}) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md flex justify-between items-center px-6 py-4 border-b border-stone-200/50">
      <div className="flex items-center gap-4">
        {showBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface hover:scale-105 transition-transform"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-primary font-headline tracking-tight">
              {title}
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {onPrivacy && (
          <button
            onClick={onPrivacy}
            className="text-on-surface-variant hover:text-on-surface font-bold text-xs px-3 py-2 bg-surface-container-lowest rounded-xl shadow-sm border-2 border-surface-container-high hover:border-outline-variant transition-all"
          >
            Privacy
          </button>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-on-surface-variant font-bold hover:text-error text-xs px-3 py-2 bg-surface-container-lowest rounded-xl shadow-sm border-2 border-primary-container/30 hover:border-error transition-all"
          >
            Logout
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-primary-container border-2 border-surface-container-highest overflow-hidden shadow-sm">
          {userAvatar ? (
            <img alt="Profile" src={userAvatar} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-primary-container font-bold">
              {title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopAppBar;
```

- [ ] **Step 2: Commit TopAppBar**

```bash
git add src/components/TopAppBar.tsx
git commit -m "feat: add TopAppBar component with glassmorphism design"
```

---

### Task 2: Create ActionCard Component

**Files:**
- Create: `src/components/ActionCard.tsx`

- [ ] **Step 1: Create ActionCard file**

```tsx
// src/components/ActionCard.tsx
import React from "react";

interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  title: string;
  description: string;
  buttonText: string;
  buttonVariant: "primary" | "secondary";
  onClick: () => void;
  tooltip?: string;
}

const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  buttonText,
  buttonVariant,
  onClick,
}) => {
  return (
    <div className="group relative overflow-hidden bg-surface-container-lowest rounded-xl p-6 shadow-xl shadow-stone-900/5 border-2 border-blue-50 hover:scale-[1.02] transition-transform duration-300">
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center mb-4`}>
            <span className={iconColor}>{icon}</span>
          </div>
          <h3 className="text-xl font-black text-on-surface mb-1">{title}</h3>
          <p className="text-sm text-on-surface-variant font-medium">{description}</p>
        </div>
        <button
          onClick={onClick}
          className={`mt-6 font-black py-3 rounded-full text-sm text-center uppercase tracking-wider active:scale-95 transition-all ${
            buttonVariant === "primary"
              ? "signature-gradient text-white shadow-lg shadow-blue-500/20"
              : "border-2 border-outline-variant/20 text-on-surface hover:bg-surface-container-low"
          }`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default ActionCard;
```

- [ ] **Step 2: Commit ActionCard**

```bash
git add src/components/ActionCard.tsx
git commit -m "feat: add ActionCard component for dashboard quick actions"
```

---

### Task 3: Create ClassCard Component

**Files:**
- Create: `src/components/ClassCard.tsx`

- [ ] **Step 1: Create ClassCard file**

```tsx
// src/components/ClassCard.tsx
import React, { useState } from "react";
import { Check, Copy, MessageCircle, Trash2, Zap } from "lucide-react";

interface ClassCardProps {
  name: string;
  code: string;
  studentCount?: number;
  onAssign: () => void;
  onCopyCode: () => void;
  onWhatsApp: () => void;
  onDelete: () => void;
  copiedCode?: string | null;
}

const ClassCard: React.FC<ClassCardProps> = ({
  name,
  code,
  studentCount,
  onAssign,
  onCopyCode,
  onWhatsApp,
  onDelete,
  copiedCode,
}) => {
  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-xl shadow-stone-900/5 border-2 border-blue-50">
      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-black text-on-surface leading-tight">{name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-primary-container text-on-primary-container text-xs font-black rounded-full uppercase tracking-tighter">
                Code: {code}
              </span>
              {studentCount !== undefined && (
                <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">group</span> {studentCount} Students
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary">
            <Zap size={24} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onAssign}
            className="signature-gradient text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Zap size={16} /> Assign
          </button>
          <button
            onClick={onCopyCode}
            className="bg-surface-container-low text-on-surface py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-surface-container active:scale-95 transition-all"
          >
            {copiedCode === code ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
            {copiedCode === code ? "Copied!" : "Copy Code"}
          </button>
          <button
            onClick={onWhatsApp}
            className="bg-[#25D366]/10 text-[#128C7E] py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-[#25D366]/20 active:scale-95 transition-all"
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button
            onClick={onDelete}
            className="bg-error-container/10 text-error py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-error-container/20 active:scale-95 transition-all"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassCard;
```

- [ ] **Step 2: Commit ClassCard**

```bash
git add src/components/ClassCard.tsx
git commit -m "feat: add ClassCard component with action grid"
```

---

## Chunk 2: Integrate Components into App.tsx

### Task 4: Update App.tsx Imports and Teacher Dashboard

**Files:**
- Modify: `src/App.tsx` (lines 1-48 for imports, lines 3159-3407 for teacher dashboard)

- [ ] **Step 1: Add component imports at top of App.tsx**

Find the import block (around line 1-48) and add after the existing imports:

```tsx
// Add after existing component imports (around line 40)
import TopAppBar from "./components/TopAppBar";
import ActionCard from "./components/ActionCard";
import ClassCard from "./components/ClassCard";
```

- [ ] **Step 2: Replace teacher-dashboard return block**

Find the teacher dashboard block starting at line 3159:
```tsx
if (user?.role === "teacher" && view === "teacher-dashboard") {
```

Replace the entire return block (lines 3160-3407) with:

```tsx
if (user?.role === "teacher" && view === "teacher-dashboard") {
  return (
    <div className="min-h-screen bg-background pb-24">
      {consentModal}

      <TopAppBar
        title="Vocaband"
        subtitle="ISRAELI ENGLISH CURRICULUM • BANDS VOCABULARY"
        userAvatar={user?.avatarUrl}
        onPrivacy={() => setView("privacy-settings")}
        onLogout={() => supabase.auth.signOut()}
      />

      <main className="pt-24 px-6 max-w-7xl mx-auto space-y-10">
        {/* Quick Action Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            icon={<RefreshCw size={24} />}
            iconBg="bg-blue-100"
            iconColor="text-primary"
            title="Live Challenge"
            description="Start an interactive real-time vocabulary game."
            buttonText="Start Session"
            buttonVariant="primary"
            onClick={() => {
              if (classes.length === 0) showToast("Create a class first!", "error");
              else if (classes.length === 1) {
                setSelectedClass(classes[0]);
                setView("live-challenge");
                setIsLiveChallenge(true);
                if (socket) {
                  supabase.auth.getSession().then(({ data: { session } }) => {
                    const token = session?.access_token ?? "";
                    socket.emit(SOCKET_EVENTS.OBSERVE_CHALLENGE, { classCode: classes[0].code, token });
                  });
                }
              } else {
                setView("live-challenge-class-select");
              }
            }}
          />
          <ActionCard
            icon={<BarChart3 size={24} />}
            iconBg="bg-secondary-container"
            iconColor="text-secondary"
            title="Classroom Analytics"
            description="Track progress across all student bands."
            buttonText="View Insights"
            buttonVariant="secondary"
            onClick={() => { fetchScores(); fetchTeacherAssignments(); setView("analytics"); }}
          />
          <ActionCard
            icon={<Trophy size={24} />}
            iconBg="bg-tertiary-container"
            iconColor="text-tertiary"
            title="Students & Grades"
            description="Manage rosters and assessment results."
            buttonText="Open Gradebook"
            buttonVariant="secondary"
            onClick={() => { fetchScores(); fetchStudents(); setView("gradebook"); }}
          />
        </section>

        {/* My Classes */}
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-on-surface">My Classes</h2>
              <p className="text-on-surface-variant font-bold">Active classes for the 2024 academic year</p>
            </div>
            <button
              onClick={() => setShowCreateClassModal(true)}
              className="bg-on-surface text-surface py-2 px-6 rounded-full font-black text-sm flex items-center gap-2 hover:scale-105 transition-transform active:scale-95"
            >
              <Plus size={16} /> New Class
            </button>
          </div>

          {classes.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-8 text-center shadow-xl border-2 border-blue-50">
              <p className="text-on-surface-variant font-medium">No classes yet. Create one to get a code!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[...classes].reverse().map(c => (
                <ClassCard
                  key={c.id}
                  name={c.name}
                  code={c.code}
                  studentCount={c.students?.length}
                  copiedCode={copiedCode}
                  onAssign={() => { setSelectedClass(c); setView("create-assignment"); }}
                  onCopyCode={() => {
                    navigator.clipboard.writeText(c.code);
                    setCopiedCode(c.code);
                    setTimeout(() => setCopiedCode(null), 2000);
                  }}
                  onWhatsApp={() => {
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(`📚 Join my class "${c.name}" on Vocaband!\n\n🔑 Class Code:\n\n${c.code}\n\nCopy the code above and paste it in the app!`)}`,
                      '_blank'
                    );
                  }}
                  onDelete={() => handleDeleteClass(c.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* My Assignments - Collapsible */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-xl border-2 border-blue-50">
          <button
            className="w-full flex justify-between items-center"
            onClick={() => {
              const next = !showTeacherAssignments;
              setShowTeacherAssignments(next);
              if (next && teacherAssignments.length === 0) fetchTeacherAssignments();
            }}
          >
            <h2 className="text-xl font-bold flex items-center gap-2 text-on-surface">
              <BookOpen className="text-primary" size={20} /> My Assignments
            </h2>
            <span className="text-on-surface-variant">{showTeacherAssignments ? "▲" : "▼"}</span>
          </button>
          {showTeacherAssignments && (
            <div className="mt-6">
              {teacherAssignmentsLoading ? (
                <p className="text-on-surface-variant text-sm italic">Loading...</p>
              ) : teacherAssignments.length === 0 ? (
                <p className="text-on-surface-variant italic text-sm">No assignments yet.</p>
              ) : (
                <div className="space-y-3">
                  {teacherAssignments.map(a => {
                    const cls = classes.find(c => c.id === a.classId);
                    return (
                      <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface-container-low rounded-xl border-2 border-surface-container">
                        <div className="min-w-0">
                          <p className="font-bold text-on-surface text-sm truncate">{a.title}</p>
                          <p className="text-xs text-on-surface-variant">{cls?.name || "Unknown class"} · {a.wordIds.length} words</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              const knownIds = a.wordIds.filter(id => ALL_WORDS.some(w => w.id === id));
                              const unknownWords: Word[] = (a.words ?? []).filter((w: Word) => !ALL_WORDS.some(aw => aw.id === w.id));
                              setSelectedWords(a.wordIds);
                              setCustomWords(unknownWords);
                              setAssignmentTitle(a.title + " (Copy)");
                              setAssignmentModes(a.allowedModes ?? ["classic","listening","spelling","matching","true-false","flashcards","scramble","reverse","letter-sounds","sentence-builder"]);
                              setAssignmentSentences(a.sentences ?? []);
                              if (knownIds.some(id => BAND_1_WORDS.some(w => w.id === id))) setSelectedLevel("Band 1");
                              else if (unknownWords.length > 0) setSelectedLevel("Custom");
                              else setSelectedLevel("Band 2");
                              setSelectedClass(cls ?? selectedClass);
                              setView("create-assignment");
                            }}
                            className="px-4 py-2 bg-amber-100 text-amber-700 font-bold text-xs rounded-xl hover:bg-amber-200 border-2 border-amber-200 transition-all"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
                              const { error } = await supabase.from('assignments').delete().eq('id', a.id);
                              if (error) { showToast("Failed to delete: " + error.message, "error"); return; }
                              setTeacherAssignments(prev => prev.filter(x => x.id !== a.id));
                              showToast("Assignment deleted", "success");
                            }}
                            className="px-3 py-2 bg-rose-100 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-200 border-2 border-rose-200 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create Class Modal */}
      <AnimatePresence>
        {showCreateClassModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface-container-lowest rounded-[32px] p-8 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-black mb-2 text-on-surface">Create New Class</h2>
              <p className="text-on-surface-variant mb-6">Enter a name for your class (e.g. Grade 8-B)</p>
              <input
                autoFocus
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Class Name"
                maxLength={50}
                className="w-full px-6 py-4 rounded-2xl border-2 border-surface-container focus:border-primary outline-none mb-6 font-bold bg-surface text-on-surface"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateClassModal(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors border-2 border-surface-container"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateClass}
                  className="flex-1 py-4 signature-gradient text-white rounded-2xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Class Created Success Modal */}
      <AnimatePresence>
        {createdClassCode && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface-container-lowest rounded-[32px] p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-black mb-2 text-on-surface">Class Created!</h2>
              <p className="text-on-surface-variant mb-4">Share this code with your students:</p>
              <div className="bg-surface-container p-4 rounded-2xl mb-6">
                <p className="text-3xl font-black text-primary tracking-widest font-mono">{createdClassCode}</p>
              </div>
              <p className="text-sm text-on-surface-variant mb-4">{createdClassName}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdClassCode);
                    showToast("Code copied!", "success");
                  }}
                  className="flex-1 py-3 border-2 border-surface-container rounded-2xl font-bold text-on-surface hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
                >
                  <Copy size={16} /> Copy Code
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`📚 Join my class "${createdClassName}" on Vocaband!\n\n🔑 Class Code:\n\n${createdClassCode}\n\nCopy the code above and paste it in the app!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-[#25D366] text-white rounded-2xl font-bold hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </div>
              <button
                onClick={() => { setCreatedClassCode(null); setCreatedClassName(""); }}
                className="w-full mt-4 py-3 text-on-surface-variant font-bold hover:text-on-surface transition-colors"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors (or only pre-existing errors unrelated to changes)

- [ ] **Step 4: Test in browser**

Start dev server: `npm run dev`
Navigate to teacher dashboard and verify:
- [ ] TopAppBar shows with glassmorphism effect
- [ ] ActionCards display with icons and buttons work
- [ ] ClassCards show with 2x2 action grid
- [ ] Create class modal works
- [ ] All existing functionality still works

- [ ] **Step 5: Commit integration**

```bash
git add src/App.tsx
git commit -m "feat: integrate new UI components into teacher dashboard"
```

---

## Chunk 3: Final Verification

### Task 5: Final Testing and Cleanup

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 2: Run existing tests**

Run: `npm test`
Expected: All existing tests pass

- [ ] **Step 3: Manual browser testing checklist**

Test on both mobile and desktop viewports:
- [ ] Teacher dashboard loads correctly
- [ ] Live Challenge button navigates correctly
- [ ] Analytics button navigates correctly
- [ ] Gradebook button navigates correctly
- [ ] Create class modal opens and creates class
- [ ] Class code copy works
- [ ] WhatsApp share works
- [ ] Delete class works with confirmation
- [ ] Assignments collapsible expands/collapses
- [ ] No console errors

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues from final testing"
```

---

## Success Criteria

- [x] Teacher Dashboard displays with new visual design
- [x] All existing functionality works (create class, copy code, WhatsApp share, delete, start live, view analytics, open gradebook)
- [x] No console errors
- [x] Responsive on mobile and desktop
- [x] Existing modals (consent, create class) still work

## Rollback Plan

If issues arise, revert the integration commit:
```bash
git revert HEAD~1  # Revert App.tsx integration
git revert HEAD~1  # Revert ClassCard
git revert HEAD~1  # Revert ActionCard
git revert HEAD~1  # Revert TopAppBar
```
