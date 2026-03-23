# Marketing Pages Integration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate marketing landing, terms, and privacy pages from the HTML design into the React/TypeScript app.

**Architecture:** Add new "public" views alongside existing app views. Create reusable navigation components (desktop header, mobile bottom nav) and a cookie consent banner. The marketing landing becomes the new entry point for non-authenticated users, with the existing login functionality accessible via "Get Started" button.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Lucide React icons, Framer Motion

---

## Files to Create/Modify

### New Files (Components)
- `src/components/PublicNav.tsx` - Desktop navigation for public pages
- `src/components/MobileNav.tsx` - Bottom tab navigation for mobile
- `src/components/CookieBanner.tsx` - GDPR cookie consent banner
- `src/components/LandingPage.tsx` - Marketing landing page with hero, features, CTA
- `src/components/TermsPage.tsx` - Terms of Use content page
- `src/components/PublicPrivacyPage.tsx` - Public privacy policy page (distinct from privacy-settings)

### Modified Files
- `src/App.tsx` - Add new views to state type, integrate new components
- `src/index.css` - Add any additional styles needed (animations, glass effects)

---

## Chunk 1: Navigation Components

### Task 1: PublicNav Component

**Files:**
- Create: `src/components/PublicNav.tsx`

- [ ] **Step 1: Create PublicNav component**

```tsx
import React from "react";

interface PublicNavProps {
  currentPage: "home" | "terms" | "privacy" | "playground";
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}

const PublicNav: React.FC<PublicNavProps> = ({ currentPage, onNavigate, onGetStarted }) => {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-stone-100/80 backdrop-blur-md flex justify-between items-center px-6 py-4 border-b border-stone-200/50">
      <button
        onClick={() => onNavigate("home")}
        className="flex items-center gap-2"
      >
        <span className="text-2xl font-black text-primary font-headline tracking-tight">
          Vocaband
        </span>
        <span className="hidden md:inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
          Israeli English Curriculum
        </span>
      </button>

      <div className="hidden md:flex items-center gap-8">
        <button
          onClick={() => onNavigate("playground")}
          className={`font-bold transition-colors ${currentPage === "playground" ? "text-primary" : "text-stone-500 hover:text-primary"}`}
        >
          Games
        </button>
        <button
          onClick={() => onNavigate("terms")}
          className={`font-bold transition-colors ${currentPage === "terms" ? "text-primary" : "text-stone-500 hover:text-primary"}`}
        >
          Terms
        </button>
        <button
          onClick={() => onNavigate("privacy")}
          className={`font-bold transition-colors ${currentPage === "privacy" ? "text-primary" : "text-stone-500 hover:text-primary"}`}
        >
          Privacy
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onGetStarted}
          className="text-stone-600 font-bold px-4 py-2 hover:bg-stone-200 rounded-full transition-all"
        >
          Login
        </button>
        <button
          onClick={onGetStarted}
          className="signature-gradient text-white font-black px-6 py-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
        >
          Get Started
        </button>
      </div>
    </nav>
  );
};

export default PublicNav;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PublicNav.tsx
git commit -m "feat: add PublicNav component for marketing pages"
```

---

### Task 2: MobileNav Component

**Files:**
- Create: `src/components/MobileNav.tsx`

- [ ] **Step 1: Create MobileNav component**

```tsx
import React from "react";
import { Home, Gamepad2, Shield, Scale } from "lucide-react";

interface MobileNavProps {
  currentPage: "home" | "terms" | "privacy" | "playground";
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate }) => {
  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "playground" as const, label: "Play", icon: Gamepad2 },
    { id: "privacy" as const, label: "Privacy", icon: Shield },
    { id: "terms" as const, label: "Terms", icon: Scale },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-white/90 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.04)] rounded-t-[3rem]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center p-3 transition-all ${
              isActive
                ? "bg-primary text-white rounded-full scale-110 shadow-lg shadow-blue-500/30"
                : "text-stone-400"
            }`}
          >
            <Icon size={24} />
            <span className="text-[10px] font-black font-headline mt-1">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileNav;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MobileNav.tsx
git commit -m "feat: add MobileNav component for mobile bottom navigation"
```

---

### Task 3: CookieBanner Component

**Files:**
- Create: `src/components/CookieBanner.tsx`

- [ ] **Step 1: Create CookieBanner component**

```tsx
import React from "react";
import { Cookie } from "lucide-react";

interface CookieBannerProps {
  onAccept: () => void;
  onCustomize: () => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onAccept, onCustomize }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full z-[100] px-4 pb-8 md:px-8 md:pb-12 pointer-events-none">
      <div className="max-w-4xl mx-auto bg-surface-container-lowest/90 backdrop-blur-2xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] pointer-events-auto border border-surface-container-high/50 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <Cookie size={28} />
        </div>

        <div className="flex-1 text-center md:text-left">
          <p className="text-on-surface-variant font-bold text-sm md:text-base leading-relaxed">
            We use cookies to enhance your learning experience. By continuing to browse, you agree to our use of cookies.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={onCustomize}
            className="px-6 py-4 rounded-xl font-black text-sm text-on-surface border-2 border-outline-variant/20 hover:bg-surface-container-low transition-all"
          >
            Customize
          </button>
          <button
            onClick={onAccept}
            className="signature-gradient px-8 py-4 rounded-xl font-black text-sm text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CookieBanner.tsx
git commit -m "feat: add CookieBanner component for GDPR consent"
```

---

## Chunk 2: Page Components

### Task 4: LandingPage Component

**Files:**
- Create: `src/components/LandingPage.tsx`

- [ ] **Step 1: Create LandingPage component (Part 1 - Hero Section)**

```tsx
import React from "react";
import { ArrowRight, Stars, Bolt, Flame } from "lucide-react";
import PublicNav from "./PublicNav";
import MobileNav from "./MobileNav";

interface LandingPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onGetStarted }) => {
  return (
    <div className="animate-in fade-in duration-500">
      <PublicNav
        currentPage="home"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
      />

      <main className="pt-24 pb-32">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-12 lg:py-24 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-full">
              <Stars className="text-primary text-sm" size={16} />
              <span className="text-sm font-black text-on-surface-variant uppercase tracking-tighter">
                New Game Mode: Lyric Master
              </span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] text-on-surface">
              Turn Vocab Into{" "}
              <span className="text-primary italic">Your Rhythm.</span>
            </h1>

            <p className="text-xl text-on-surface-variant font-medium leading-relaxed max-w-xl">
              Master the Israeli Ministry of Education English curriculum through interactive music-based learning. Built for students who find textbooks boring and music essential.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => onNavigate("playground")}
                className="signature-gradient text-white font-black text-lg px-8 py-5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                Start Learning Free
                <ArrowRight size={20} />
              </button>
              <button
                onClick={onGetStarted}
                className="bg-surface-container-lowest border-2 border-outline-variant/20 text-on-surface font-black text-lg px-8 py-5 rounded-xl hover:bg-surface-container-low transition-all"
              >
                View Curriculum
              </button>
            </div>
          </div>

          {/* Hero Image Side */}
          <div className="lg:w-1/2 relative">
            <div className="relative w-full aspect-square max-w-md mx-auto">
              <div className="absolute inset-0 bg-primary-container rounded-[3rem] rotate-3 shadow-2xl overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-primary-container to-secondary-container opacity-80" />
              </div>

              {/* XP Reward Card */}
              <div className="absolute -top-4 -right-4 bg-surface-container-lowest p-6 rounded-3xl shadow-xl shadow-stone-900/10 -rotate-3 border border-surface-container-high">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-tertiary-container rounded-full flex items-center justify-center">
                    <Bolt className="text-on-tertiary-container" size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-stone-400">
                      Streak Reward
                    </div>
                    <div className="text-xl font-black text-on-surface">
                      +450 XP
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Card */}
              <div className="absolute -bottom-8 -left-8 bg-surface-container-lowest p-6 rounded-3xl shadow-xl shadow-stone-900/10 rotate-2 border border-surface-container-high w-64">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-black text-sm">Lyric Progress</span>
                  <span className="text-primary font-black">82%</span>
                </div>
                <div className="w-full h-4 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full signature-gradient w-[82%] relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface-container-lowest rounded-full shadow-md flex items-center justify-center">
                      <Flame className="text-orange-500" size={12} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MobileNav currentPage="home" onNavigate={onNavigate} />
    </div>
  );
};

export default LandingPage;
```

- [ ] **Step 2: Add feature section to LandingPage**

Append to LandingPage before `</main>`:

```tsx
        {/* Features Section */}
        <section className="container mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Ministry Approved Card */}
            <div className="md:col-span-8 bg-surface-container-low rounded-[3rem] p-12 flex flex-col justify-between min-h-[400px]">
              <div className="max-w-md">
                <h3 className="text-3xl font-black mb-4">
                  Ministry Approved <br /> Content Library
                </h3>
                <p className="text-on-surface-variant font-medium text-lg leading-relaxed">
                  Every song, activity, and assessment is meticulously aligned with the Israeli Band 1, 2, and 3 vocabulary requirements.
                </p>
              </div>
              <div className="flex gap-4 mt-8 flex-wrap">
                <span className="px-6 py-3 bg-surface-container-lowest rounded-full font-black text-primary shadow-sm">
                  Band 1 Beginner
                </span>
                <span className="px-6 py-3 bg-surface-container-lowest rounded-full font-black text-secondary shadow-sm">
                  Band 2 Intermediate
                </span>
                <span className="px-6 py-3 bg-surface-container-lowest rounded-full font-black text-tertiary shadow-sm">
                  Band 3 Academic
                </span>
              </div>
            </div>

            {/* Auditory Focus Card */}
            <div className="md:col-span-4 bg-secondary-container rounded-[3rem] p-10 flex flex-col items-center text-center justify-center gap-6">
              <div className="w-20 h-20 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-4xl text-secondary">
                  hearing
                </span>
              </div>
              <h3 className="text-2xl font-black text-on-secondary-container">
                Auditory Focus
              </h3>
              <p className="text-on-secondary-container/80 font-bold">
                Listen, record, and perfect your pronunciation with AI-driven feedback.
              </p>
            </div>

            {/* Smart Spacing Card */}
            <div className="md:col-span-4 bg-surface-container-high rounded-[3rem] p-10 flex flex-col justify-between">
              <span className="material-symbols-outlined text-4xl text-on-surface opacity-20">
                auto_awesome
              </span>
              <div>
                <h3 className="text-2xl font-black mb-2">Smart Spacing</h3>
                <p className="text-on-surface-variant font-bold">
                  Scientifically proven intervals for long-term memory retention.
                </p>
              </div>
            </div>

            {/* Teacher Dashboard Card */}
            <div className="md:col-span-8 bg-surface-container-lowest border-2 border-surface-container rounded-[3rem] p-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="w-full md:w-1/3 aspect-video bg-surface-container-high rounded-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">play_arrow</span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black mb-3">Teacher Dashboards</h3>
                <p className="text-on-surface-variant font-medium">
                  Real-time tracking of student progress, common struggles, and curriculum coverage.
                </p>
                <button className="inline-flex items-center gap-2 text-primary font-black mt-4 hover:underline">
                  Explore LMS Features{" "}
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-12">
          <div className="signature-gradient rounded-[3.5rem] p-12 lg:p-24 text-center relative overflow-hidden">
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 relative z-10">
              Ready to break the silence?
            </h2>
            <p className="text-on-primary font-bold text-xl mb-12 max-w-2xl mx-auto relative z-10">
              Join over 50,000 Israeli students learning English through the power of music and kinetic play.
            </p>
            <div className="flex justify-center gap-6 relative z-10">
              <button
                onClick={onGetStarted}
                className="bg-white text-primary font-black text-xl px-12 py-6 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                Create Free Account
              </button>
            </div>
          </div>
        </section>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat: add LandingPage component with hero and features"
```

---

### Task 5: TermsPage Component

**Files:**
- Create: `src/components/TermsPage.tsx`

- [ ] **Step 1: Create TermsPage component**

```tsx
import React from "react";
import { ArrowLeft, Shield, UserCircle, Scale, CheckCircle } from "lucide-react";
import MobileNav from "./MobileNav";

interface TermsPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}

const TermsPage: React.FC<TermsPageProps> = ({ onNavigate, onGetStarted }) => {
  return (
    <div className="animate-in fade-in duration-500">
      <header className="bg-stone-100/80 backdrop-blur-md flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-stone-200 transition-colors"
          >
            <ArrowLeft className="text-primary" size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-primary font-headline tracking-tight">
              Vocaband
            </span>
            <span className="text-[10px] font-bold tracking-[0.15em] text-on-surface-variant uppercase">
              TERMS OF USE
            </span>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto">
        <div className="relative mb-12">
          <h1 className="text-5xl md:text-7xl font-black text-on-surface mb-4 tracking-tighter leading-none">
            Terms of <span className="text-primary italic">Use</span>
          </h1>
          <p className="text-lg text-on-surface-variant max-w-2xl font-medium">
            Please read these terms carefully before exploring the digital playground of Vocaband. By using our platform, you're agreeing to the rules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Acceptance of Terms */}
          <section className="md:col-span-8 bg-surface-container-lowest p-8 md:p-12 rounded-[2rem] shadow-xl shadow-stone-900/5 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-primary bg-primary/10 p-2 rounded-lg">
                <Shield size={20} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">
                Acceptance of Terms
              </h2>
            </div>
            <div className="space-y-4 text-on-surface-variant leading-relaxed">
              <p>
                By accessing or using Vocaband, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use and our Privacy Policy.
              </p>
              <p>
                We reserve the right to modify these terms at any time. Your continued use of the Digital Playground following the posting of changes constitutes your acceptance of such changes.
              </p>
            </div>
          </section>

          {/* User Accounts */}
          <section className="md:col-span-4 bg-primary text-on-primary p-8 rounded-[2rem] shadow-xl shadow-blue-900/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="text-on-primary bg-white/20 p-2 rounded-lg">
                  <UserCircle size={20} />
                </div>
                <h2 className="text-2xl font-black tracking-tight">User Accounts</h2>
              </div>
              <p className="text-on-primary/80 font-medium mb-6 leading-snug">
                To access certain features, you must register. You are the guardian of your credentials.
              </p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm font-bold">
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> Accurate info required
              </li>
              <li className="flex items-start gap-2 text-sm font-bold">
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> One user per account
              </li>
            </ul>
          </section>

          {/* Code of Conduct */}
          <section className="md:col-span-12 bg-surface-container-low p-8 md:p-12 rounded-[2rem] flex flex-col md:flex-row gap-12 items-start">
            <div className="md:w-1/3">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-secondary bg-secondary/10 p-2 rounded-lg">
                  <Scale size={20} />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-secondary">
                  Code of Conduct
                </h2>
              </div>
              <p className="text-on-surface-variant font-medium">
                Vocaband is a space for growth. We maintain a high standard of academic integrity and mutual respect.
              </p>
            </div>
            <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-secondary/5">
                <h3 className="font-black mb-2 text-primary">No Cheating</h3>
                <p className="text-sm">Automated scripts or external aids are prohibited.</p>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-secondary/5">
                <h3 className="font-black mb-2 text-primary">Respect</h3>
                <p className="text-sm">Interactions must be constructive and kind.</p>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-20 border-t-2 border-surface-container-high pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-on-surface-variant">
            Questions?{" "}
            <span className="text-primary font-bold">hello@vocaband.edu</span>
          </p>
          <div className="flex gap-4">
            <button className="px-8 py-4 bg-surface-container-high text-on-surface font-black rounded-full">
              Print
            </button>
            <button
              onClick={onGetStarted}
              className="signature-gradient px-8 py-4 rounded-full font-black text-white shadow-lg"
            >
              Accept & Continue
            </button>
          </div>
        </footer>
      </main>

      <MobileNav currentPage="terms" onNavigate={onNavigate} />
    </div>
  );
};

export default TermsPage;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TermsPage.tsx
git commit -m "feat: add TermsPage component"
```

---

### Task 6: PublicPrivacyPage Component

**Files:**
- Create: `src/components/PublicPrivacyPage.tsx`

- [ ] **Step 1: Create PublicPrivacyPage component**

```tsx
import React from "react";
import { Shield, School, Lock, Mail } from "lucide-react";
import PublicNav from "./PublicNav";
import MobileNav from "./MobileNav";

interface PublicPrivacyPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}

const PublicPrivacyPage: React.FC<PublicPrivacyPageProps> = ({
  onNavigate,
  onGetStarted,
}) => {
  return (
    <div className="animate-in fade-in duration-500">
      <PublicNav
        currentPage="privacy"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
      />

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">
        <section className="mb-12 text-center md:text-left">
          <h2 className="text-5xl font-black text-on-background tracking-tight mb-4">
            Privacy Policy
          </h2>
          <p className="text-xl text-on-surface-variant font-medium max-w-2xl leading-relaxed">
            We believe your data belongs to you. Our commitment is to provide a safe, transparent learning environment.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Student Security Card */}
          <div className="md:col-span-12 lg:col-span-8 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full mb-6">
                <Shield size={14} />
                <span className="text-xs font-black uppercase tracking-wider">
                  Student Security
                </span>
              </div>
              <h3 className="text-3xl font-black mb-4">Anonymity by Design</h3>
              <p className="text-lg text-blue-100 font-medium leading-relaxed mb-6">
                Vocaband student accounts are built to be anonymous. We only require a name and class code. No personal emails or phones required for students.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 backdrop-blur-lg px-4 py-3 rounded-lg flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-200">
                    no_accounts
                  </span>
                  <span className="font-bold">No Tracking</span>
                </div>
                <div className="bg-white/10 backdrop-blur-lg px-4 py-3 rounded-lg flex items-center gap-3">
                  <Lock size={18} className="text-blue-200" />
                  <span className="font-bold">Encrypted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Educator Accounts Card */}
          <div className="md:col-span-6 lg:col-span-4 bg-surface-container-lowest rounded-[2rem] p-8 shadow-md border-2 border-primary/5 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <School size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Educator Accounts</h3>
              <p className="text-on-surface-variant leading-relaxed">
                We use Google OAuth for teachers to securely manage accounts via professional emails.
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-surface-container-high flex items-center gap-2 text-primary font-bold text-sm">
              <Lock size={14} /> Secure Google Auth
            </div>
          </div>

          {/* Contact Section */}
          <div className="md:col-span-12 bg-surface-container-high/50 rounded-[2rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <h3 className="text-2xl font-black">Have questions?</h3>
            <a
              href="mailto:support@vocaband.edu"
              className="inline-flex items-center gap-4 bg-on-background text-background px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all"
            >
              <Mail size={20} /> support@vocaband.edu
            </a>
          </div>
        </div>
      </main>

      <MobileNav currentPage="privacy" onNavigate={onNavigate} />
    </div>
  );
};

export default PublicPrivacyPage;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PublicPrivacyPage.tsx
git commit -m "feat: add PublicPrivacyPage component"
```

---

### Task 7: PlaygroundPage Component

**Files:**
- Create: `src/components/PlaygroundPage.tsx`

- [ ] **Step 1: Create PlaygroundPage component**

```tsx
import React from "react";
import { Rocket, Users, Gamepad2 } from "lucide-react";
import MobileNav from "./MobileNav";

interface PlaygroundPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}

const PlaygroundPage: React.FC<PlaygroundPageProps> = ({
  onNavigate,
  onGetStarted,
}) => {
  return (
    <div className="animate-in fade-in duration-500">
      <nav className="bg-[#fff5ee]/90 backdrop-blur-md shadow-xl shadow-stone-900/5 fixed top-0 w-full z-50 flex justify-between items-center px-8 h-20">
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-3"
        >
          <span className="material-symbols-outlined text-blue-600 text-3xl">
            auto_stories
          </span>
          <span className="text-2xl font-black text-blue-600 font-headline tracking-tighter">
            The Energetic Scholar
          </span>
        </button>
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => onNavigate("home")}
            className="text-stone-600 font-bold"
          >
            Home
          </button>
          <button className="text-blue-700 border-b-4 border-blue-600 font-bold">
            Games
          </button>
          <button className="text-stone-600 font-bold">Bands</button>
        </div>
        <button
          onClick={onGetStarted}
          className="bg-primary text-white px-6 py-2 rounded-full font-black"
        >
          Get Started
        </button>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 signature-gradient text-on-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="mb-6 flex flex-col items-center">
            <div className="w-24 h-24 bg-surface-container-lowest rounded-3xl shadow-xl flex items-center justify-center mb-4 rotate-3 hover:rotate-0 transition-transform duration-300">
              <span className="text-6xl font-black text-primary font-headline">
                V
              </span>
            </div>
            <p className="text-sm font-black tracking-widest uppercase opacity-90">
              Israeli English Curriculum • Bands Vocabulary
            </p>
          </div>
          <h1 className="text-5xl md:text-8xl font-black font-headline leading-none tracking-tighter mb-6 max-w-4xl">
            Level Up Your Vocabulary
          </h1>
          <p className="text-xl md:text-2xl font-bold opacity-90 mb-12 max-w-2xl leading-relaxed">
            The digital playground for Israeli EFL students. Master your bands vocabulary through play.
          </p>
          <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto">
            <button
              onClick={onGetStarted}
              className="bg-tertiary-container text-on-tertiary-container px-12 py-5 rounded-2xl text-2xl font-black shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
            >
              Start Learning <Rocket size={24} />
            </button>
            <button className="bg-surface-container-lowest/10 border-2 border-surface-container-lowest/30 backdrop-blur-sm text-on-primary px-10 py-5 rounded-2xl text-xl font-bold">
              Teacher Login
            </button>
          </div>
        </div>
      </section>

      {/* Game Modes Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8 bg-surface-container-low rounded-[3rem] p-10 flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <div className="bg-primary-container text-on-primary-container w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg">
                <Gamepad2 size={32} className="text-on-primary-container" />
              </div>
              <h3 className="text-4xl font-black font-headline mb-4">
                10 Fun Game Modes
              </h3>
              <p className="text-xl font-bold text-on-surface-variant max-w-md">
                From "Word War" to "Grammar Galaxy," we turn every vocabulary list into an epic quest.
              </p>
            </div>
            <div className="mt-12 flex gap-4 overflow-hidden">
              <div className="px-6 py-3 bg-surface-container-lowest rounded-full font-black shadow-sm group-hover:-translate-y-2 transition-transform">
                Flashcards
              </div>
              <div className="px-6 py-3 bg-surface-container-lowest rounded-full font-black shadow-sm group-hover:-translate-y-4 transition-transform">
                Speed Match
              </div>
            </div>
          </div>

          <div className="md:col-span-4 bg-secondary-container rounded-[3rem] p-10 flex flex-col items-center text-center">
            <div className="bg-surface-container-lowest text-secondary w-20 h-20 rounded-full flex items-center justify-center mb-8 shadow-xl">
              <Users size={40} />
            </div>
            <h3 className="text-3xl font-black font-headline mb-4">
              Live Classroom
            </h3>
            <p className="text-lg font-bold text-on-secondary-container">
              Battle classmates in real-time. Who will top the weekly leaderboard?
            </p>
          </div>
        </div>
      </section>

      {/* Band Levels Section */}
      <section className="py-20 bg-surface-container-lowest px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter mb-4">
            Master Your Band Levels
          </h2>
        </div>
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="space-y-4">
            <div className="flex justify-between items-end font-black">
              <span className="text-2xl">Band I (Foundation)</span>
              <span className="text-primary">85% Complete</span>
            </div>
            <div className="h-8 bg-surface-container-high rounded-full overflow-hidden relative border-4 border-surface-container-high">
              <div className="h-full bg-primary rounded-full w-[85%]" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-100 py-12 mb-20 md:mb-0">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 max-w-7xl mx-auto gap-8">
          <span className="text-lg font-black text-stone-800 font-headline">
            The Energetic Scholar
          </span>
          <div className="flex gap-8">
            <button
              onClick={() => onNavigate("privacy")}
              className="text-stone-500 font-bold"
            >
              Privacy
            </button>
            <button
              onClick={() => onNavigate("terms")}
              className="text-stone-500 font-bold"
            >
              Terms
            </button>
          </div>
        </div>
      </footer>

      <MobileNav currentPage="playground" onNavigate={onNavigate} />
    </div>
  );
};

export default PlaygroundPage;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlaygroundPage.tsx
git commit -m "feat: add PlaygroundPage component (digital playground)"
```

---

## Chunk 3: App Integration

### Task 8: Integrate Components into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports and view type**

Add to imports section (around line 50):

```tsx
import LandingPage from "./components/LandingPage";
import TermsPage from "./components/TermsPage";
import PublicPrivacyPage from "./components/PublicPrivacyPage";
import PlaygroundPage from "./components/PlaygroundPage";
import CookieBanner from "./components/CookieBanner";
```

- [ ] **Step 2: Update view state type**

Find the `useState` for `view` (around line 241) and update the type to include public views:

```tsx
const [view, setView] = useState<
  | "public-landing"
  | "public-terms"
  | "public-privacy"
  | "public-playground"
  | "landing"
  | "game"
  | "teacher-dashboard"
  | "student-dashboard"
  | "create-assignment"
  | "gradebook"
  | "live-challenge"
  | "live-challenge-class-select"
  | "analytics"
  | "global-leaderboard"
  | "students"
  | "shop"
  | "privacy-settings"
>("public-landing");
```

- [ ] **Step 3: Add cookie consent state**

Add after the view state (around line 242):

```tsx
const [showCookieBanner, setShowCookieBanner] = useState(() => {
  try {
    return !localStorage.getItem("vocaband_cookie_consent");
  } catch {
    return true;
  }
});

const handleCookieAccept = () => {
  try {
    localStorage.setItem("vocaband_cookie_consent", "true");
  } catch {}
  setShowCookieBanner(false);
};

const handlePublicNavigate = (page: "home" | "terms" | "privacy" | "playground") => {
  const viewMap = {
    home: "public-landing",
    terms: "public-terms",
    privacy: "public-privacy",
    playground: "public-playground",
  } as const;
  setView(viewMap[page]);
};
```

- [ ] **Step 4: Add public view rendering**

Add before `if (view === "landing" && !user)` (around line 2053):

```tsx
// --- PUBLIC VIEWS (No authentication required) ---
if (view === "public-landing" && !user) {
  return (
    <>
      <LandingPage
        onNavigate={handlePublicNavigate}
        onGetStarted={() => setView("landing")}
      />
      {showCookieBanner && (
        <CookieBanner
          onAccept={handleCookieAccept}
          onCustomize={() => {
            // For now, just accept - could expand to show preferences modal
            handleCookieAccept();
          }}
        />
      )}
    </>
  );
}

if (view === "public-terms" && !user) {
  return (
    <>
      <TermsPage
        onNavigate={handlePublicNavigate}
        onGetStarted={() => setView("landing")}
      />
      {showCookieBanner && (
        <CookieBanner
          onAccept={handleCookieAccept}
          onCustomize={handleCookieAccept}
        />
      )}
    </>
  );
}

if (view === "public-privacy" && !user) {
  return (
    <>
      <PublicPrivacyPage
        onNavigate={handlePublicNavigate}
        onGetStarted={() => setView("landing")}
      />
      {showCookieBanner && (
        <CookieBanner
          onAccept={handleCookieAccept}
          onCustomize={handleCookieAccept}
        />
      )}
    </>
  );
}

if (view === "public-playground" && !user) {
  return (
    <>
      <PlaygroundPage
        onNavigate={handlePublicNavigate}
        onGetStarted={() => setView("landing")}
      />
      {showCookieBanner && (
        <CookieBanner
          onAccept={handleCookieAccept}
          onCustomize={handleCookieAccept}
        />
      )}
    </>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate public marketing pages into App routing"
```

---

### Task 9: Add CSS Animations

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add fade-in animation**

Append to `src/index.css`:

```css
/* Fade-in animation for page transitions */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fade-in 0.5s ease-out forwards;
}

.fade-in {
  animation-name: fade-in;
}

/* Glass panel effect */
.glass-panel {
  background: rgba(255, 245, 238, 0.7);
  backdrop-filter: blur(20px);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "style: add fade-in animation and glass panel styles"
```

---

### Task 10: Final Testing and Polish

- [ ] **Step 1: Run development server and test**

Run: `npm run dev`
Test each page:
- Navigate to `/` - should show public landing
- Click "Games" - should show playground
- Click "Terms" - should show terms page
- Click "Privacy" - should show privacy page
- Click "Get Started" - should show login page
- Verify mobile navigation appears on small screens
- Verify cookie banner appears and dismisses on accept

- [ ] **Step 2: Run type check**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete marketing pages integration"
```

---

## Summary

This plan adds 6 new components and modifies 2 files to integrate marketing pages:

1. **PublicNav** - Desktop header for public pages
2. **MobileNav** - Bottom tab navigation for mobile
3. **CookieBanner** - GDPR consent banner
4. **LandingPage** - Marketing landing with hero, features, CTA
5. **TermsPage** - Terms of Use content
6. **PublicPrivacyPage** - Public privacy policy
7. **PlaygroundPage** - Digital playground/game selection

The routing flow is:
- Non-authenticated users → Public marketing pages
- "Get Started" button → Login page (existing)
- Authenticated users → Existing app flow
