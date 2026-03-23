# Teacher Dashboard Design Refresh

## Overview
Apply the new visual design from the prototype to the existing Teacher Dashboard without breaking or removing any functionality. This is an incremental approach starting with just the Teacher Dashboard view.

## Scope

### In Scope
- Teacher Dashboard main view (`view === "teacher-dashboard"`)
- New UI components: TopAppBar, ActionCard, ClassCard
- Visual refresh using existing MD3 color tokens

### Out of Scope (for this iteration)
- Student Dashboard
- Game modes
- Landing/Login pages
- Analytics page
- Gradebook page
- Live Challenge page
- Shop
- Bottom navigation bar (can be added later)

## Design Decisions

### Visual Language
- **Color Palette:** Use semantic MD3 tokens from `index.css` (`surface`, `surface-container-low`, `primary`, `secondary`, `tertiary`, etc.) instead of `stone-*` Tailwind colors
- **Buttons:** Pill-shaped (`rounded-full`) instead of rounded rectangles
- **Cards:** Larger padding, subtle shadows, icon boxes with colored backgrounds
- **Header:** Glassmorphism effect (semi-transparent white with backdrop blur)

### Typography
- Headlines: Plus Jakarta Sans (already configured in `index.css`)
- Body: Be Vietnam Pro (already configured in `index.css`)

## Component Specifications

### 1. TopAppBar

**File:** `src/components/TopAppBar.tsx`

**Props:**
```typescript
interface TopAppBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  userAvatar?: string;
}
```

**Visual Specs:**
- Fixed position (`fixed top-0 left-0 w-full z-50`)
- Background: `bg-white/80 backdrop-blur-md`
- Border bottom: `border-b border-stone-200/50`
- Padding: `px-6 py-4`
- Height: ~80px with content

**Elements:**
- Back button: circular, 40x40px, `bg-surface-container-high`, only visible when `showBack={true}`
- Title: `text-2xl font-black text-primary`
- Subtitle: `text-[10px] font-bold tracking-widest text-on-surface-variant uppercase`
- Avatar: circular, 40x40px, `bg-primary-container border-2 border-surface-container-highest`

---

### 2. ActionCard

**File:** `src/components/ActionCard.tsx`

**Props:**
```typescript
interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  buttonText: string;
  buttonVariant: "primary" | "secondary";
  onClick: () => void;
}
```

**Visual Specs:**
- Container: `bg-surface-container-lowest rounded-xl p-6 shadow-xl shadow-stone-900/5 border-2 border-blue-50`
- Hover: `hover:scale-[1.02] transition-transform duration-300`
- Icon box: 48x48px, `rounded-lg`, with provided `iconBg` background
- Title: `text-xl font-black text-on-surface`
- Description: `text-sm text-on-surface-variant font-medium`
- Primary button: `signature-gradient text-white rounded-full py-3`
- Secondary button: `border-2 border-outline-variant/20 rounded-full py-3`

---

### 3. ClassCard

**File:** `src/components/ClassCard.tsx`

**Props:**
```typescript
interface ClassCardProps {
  name: string;
  code: string;
  studentCount: number;
  onAssign: () => void;
  onCopyCode: () => void;
  onWhatsApp: () => void;
  onDelete: () => void;
}
```

**Visual Specs:**
- Container: `bg-surface-container-lowest rounded-xl overflow-hidden shadow-xl shadow-stone-900/5 border-2 border-blue-50`
- Padding: `p-8`
- Title: `text-2xl font-black text-on-surface`
- Code badge: `px-3 py-1 bg-primary-container text-on-primary-container text-xs font-black rounded-full`
- Student count: `text-xs font-bold text-on-surface-variant`
- Icon circle: 48x48px, `rounded-full bg-blue-50 text-primary`
- Action grid: 2x2, each button `py-3 rounded-xl font-black text-sm`
  - Assign: `signature-gradient text-white`
  - Copy: `bg-surface-container-low`
  - WhatsApp: `bg-[#25D366]/10 text-[#128C7E]`
  - Delete: `bg-error-container/10 text-error`

---

## Integration

### File Changes

#### New Files
1. `src/components/TopAppBar.tsx`
2. `src/components/ActionCard.tsx`
3. `src/components/ClassCard.tsx`

#### Modified Files
1. `src/App.tsx`
   - Add imports for new components
   - Update teacher-dashboard return block JSX (lines ~3159-3350)
   - Keep all existing logic, handlers, and state

### App.tsx Changes Detail

**Imports to add:**
```typescript
import TopAppBar from "./components/TopAppBar";
import ActionCard from "./components/ActionCard";
import ClassCard from "./components/ClassCard";
```

**Teacher Dashboard structure:**
```tsx
if (user?.role === "teacher" && view === "teacher-dashboard") {
  return (
    <div className="min-h-screen bg-background pb-24">
      {consentModal}
      <TopAppBar
        title="Vocaband"
        subtitle="ISRAELI ENGLISH CURRICULUM • BANDS VOCABULARY"
        userAvatar={user?.avatarUrl}
      />

      <main className="pt-24 px-6 max-w-7xl mx-auto space-y-10">
        {/* Quick Action Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            icon={<Zap size={24} />}
            iconBg="bg-blue-100"
            iconColor="text-primary"
            title="Live Challenge"
            description="Start an interactive real-time vocabulary game."
            buttonText="Start Session"
            buttonVariant="primary"
            onClick={...}
          />
          <ActionCard
            icon={<BarChart3 size={24} />}
            iconBg="bg-secondary-container"
            iconColor="text-secondary"
            title="Classroom Analytics"
            description="Track progress across all student bands."
            buttonText="View Insights"
            buttonVariant="secondary"
            onClick={...}
          />
          <ActionCard
            icon={<Trophy size={24} />}
            iconBg="bg-tertiary-container"
            iconColor="text-tertiary"
            title="Students & Grades"
            description="Manage rosters and assessment results."
            buttonText="Open Gradebook"
            buttonVariant="secondary"
            onClick={...}
          />
        </section>

        {/* My Classes */}
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-on-surface">My Classes</h2>
              <p className="text-on-surface-variant font-bold">Active classes for the 2024 academic year</p>
            </div>
            <button onClick={() => setShowCreateClassModal(true)} className="...">
              New Class
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {classes.map(c => (
              <ClassCard
                key={c.id}
                name={c.name}
                code={c.code}
                studentCount={...}
                onAssign={...}
                onCopyCode={...}
                onWhatsApp={...}
                onDelete={...}
              />
            ))}
          </div>
        </section>

        {/* My Assignments - Keep existing collapsible */}
        ...
      </main>

      {/* Create Class Modal - Keep existing */}
      ...
    </div>
  );
}
```

## Success Criteria
- Teacher Dashboard displays with new visual design
- All existing functionality works (create class, copy code, WhatsApp share, delete, start live, view analytics, open gradebook)
- No console errors
- Responsive on mobile and desktop
- Existing modals (consent, create class) still work

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Break existing handlers | Copy exact handler logic from original JSX |
| Mobile responsiveness breaks | Test on mobile viewport, use responsive grid classes |
| Color tokens don't render correctly | Tokens already defined in index.css, verify usage |
| Icon imports missing | Use existing Lucide icons from App.tsx imports |

## Files to Not Touch
- `src/supabase.ts` - backend integration
- `src/types.ts` - type definitions
- `src/vocabulary.ts` - word data
- `src/utils.ts` - helper functions
- All other views in App.tsx (student dashboard, game, analytics, etc.)
