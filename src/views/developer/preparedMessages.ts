/**
 * Ready-made broadcast templates for the admin announcements panel.
 *
 * These pre-fill the publish form (headline + body + level + audience) so an
 * admin can grab users' attention about new features, promos, or tips without
 * writing copy from scratch. Picking one is non-destructive — the admin always
 * edits and reviews before publishing. Pure UI data; no DB involvement.
 */

export type AnnouncementLevel = "info" | "warning" | "critical";
export type AnnouncementAudience = "teachers" | "students" | "all";

export interface PreparedMessage {
  id: string;
  category: PreparedCategory;
  emoji: string;
  /** Short chip label shown in the picker. */
  label: string;
  /** Fills the headline field. */
  title: string;
  /** Fills the body field. */
  message: string;
  level: AnnouncementLevel;
  audience: AnnouncementAudience;
}

export type PreparedCategory =
  | "New feature"
  | "Engagement"
  | "Promotion"
  | "Tips & how-to"
  | "Seasonal";

export const PREPARED_CATEGORIES: PreparedCategory[] = [
  "New feature",
  "Engagement",
  "Promotion",
  "Tips & how-to",
  "Seasonal",
];

export const PREPARED_MESSAGES: PreparedMessage[] = [
  // ── New feature ──────────────────────────────────────────────────────────
  {
    id: "feat-live-challenge",
    category: "New feature",
    emoji: "⚡",
    label: "Live Challenge",
    title: "New: run a Live Challenge with your class",
    message:
      "Project a real-time leaderboard and let the whole class race through the words together. Open any assignment and tap Live Challenge to start.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "feat-custom-words",
    category: "New feature",
    emoji: "📸",
    label: "Snap a word list",
    title: "Turn any worksheet into a game",
    message:
      "Snap a photo of your vocabulary list and we'll build a custom assignment from it — translations and audio included. Try it from Create Assignment.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "feat-analytics",
    category: "New feature",
    emoji: "📊",
    label: "Class analytics",
    title: "See exactly where your class is stuck",
    message:
      "Your dashboard now breaks down progress word-by-word so you can spot the tricky ones before the test. Take a look on your teacher home screen.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "feat-ai-worksheets",
    category: "New feature",
    emoji: "🤖",
    label: "AI worksheets",
    title: "Generate a worksheet in seconds",
    message:
      "Pick a word set and let the AI lesson builder create a ready-to-print worksheet for your class. Find it in your teacher tools.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "feat-quick-play-qr",
    category: "New feature",
    emoji: "📱",
    label: "QR Quick Play",
    title: "Get the class playing in 10 seconds",
    message:
      "Show a QR code on the board and students join instantly — no logins, no class codes. Great for warm-ups and substitutes. Start it from Quick Play.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "feat-new-mode",
    category: "New feature",
    emoji: "🎮",
    label: "New game mode",
    title: "A new way to play just dropped",
    message:
      "There's a fresh game mode waiting in your next assignment. Jump in and be one of the first to try it!",
    level: "info",
    audience: "students",
  },
  {
    id: "feat-new-avatars",
    category: "New feature",
    emoji: "🦄",
    label: "New avatars",
    title: "New avatars in the shop",
    message:
      "Fresh avatars and titles just landed in the shop. Earn XP, then show off your new look in the leaderboard!",
    level: "info",
    audience: "students",
  },

  // ── Engagement ───────────────────────────────────────────────────────────
  {
    id: "eng-teacher-recap",
    category: "Engagement",
    emoji: "📈",
    label: "Weekly recap",
    title: "Your class's week in review",
    message:
      "See how your students did this week — top players, words mastered, and who might need a nudge. Open your dashboard for the full picture.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "eng-teacher-quiet-class",
    category: "Engagement",
    emoji: "🔔",
    label: "Re-engage a class",
    title: "Bring a quiet class back to life",
    message:
      "Haven't assigned anything in a while? Set a quick 5-minute assignment and watch your class jump back in. It takes under two minutes to create.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "eng-teacher-leaderboard",
    category: "Engagement",
    emoji: "🏅",
    label: "Class leaderboard",
    title: "Celebrate your top students",
    message:
      "Check this week's class leaderboard and give a shout-out to your hardest workers. A little recognition keeps the whole class motivated.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "eng-streak",
    category: "Engagement",
    emoji: "🔥",
    label: "Keep your streak",
    title: "Don't break your streak!",
    message:
      "Play just one round today to keep your streak alive. A few minutes is all it takes — your future self will thank you.",
    level: "info",
    audience: "students",
  },
  {
    id: "eng-daily-chest",
    category: "Engagement",
    emoji: "🎁",
    label: "Daily chest",
    title: "Your daily chest is ready",
    message:
      "Open today's chest for free XP and surprises. Come back every day for a bigger reward!",
    level: "info",
    audience: "students",
  },
  {
    id: "eng-weekly-challenge",
    category: "Engagement",
    emoji: "🏆",
    label: "Weekly challenge",
    title: "This week's challenge is live",
    message:
      "Complete the weekly challenge before Sunday for bonus XP. How far can you climb the leaderboard?",
    level: "info",
    audience: "students",
  },
  {
    id: "eng-comeback",
    category: "Engagement",
    emoji: "👋",
    label: "We miss you",
    title: "We miss you — come back and play!",
    message:
      "Your words are waiting and there's bonus XP for your comeback round. Jump back in and pick up where you left off.",
    level: "info",
    audience: "students",
  },
  {
    id: "eng-leaderboard",
    category: "Engagement",
    emoji: "🥇",
    label: "Climb the board",
    title: "You're close to the top!",
    message:
      "A few more rounds could move you up the class leaderboard. Think you can reach #1 this week?",
    level: "info",
    audience: "students",
  },

  // ── Promotion ────────────────────────────────────────────────────────────
  {
    id: "promo-invite",
    category: "Promotion",
    emoji: "🤝",
    label: "Invite a colleague",
    title: "Know a teacher who'd love this?",
    message:
      "Invite a colleague to Vocaband and help more students learn the fun way. Sharing takes one tap from your dashboard.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "promo-upgrade",
    category: "Promotion",
    emoji: "✨",
    label: "Upgrade offer",
    title: "Unlock the full Vocaband toolkit",
    message:
      "Upgrade to get unlimited custom lists, AI worksheets, and class analytics. See what's included on your account page.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "promo-trial-ending",
    category: "Promotion",
    emoji: "⏳",
    label: "Trial ending",
    title: "Your free trial is ending soon",
    message:
      "Don't lose access to your classes and assignments. Upgrade today to keep everything running without a break.",
    level: "warning",
    audience: "teachers",
  },
  {
    id: "promo-limited",
    category: "Promotion",
    emoji: "🎉",
    label: "Limited-time deal",
    title: "Limited-time offer — this week only",
    message:
      "For a limited time, upgrade at a special rate and unlock every premium feature for your classroom. Don't miss out!",
    level: "info",
    audience: "teachers",
  },

  // ── Tips & how-to ────────────────────────────────────────────────────────
  {
    id: "tip-assign-homework",
    category: "Tips & how-to",
    emoji: "📝",
    label: "Assign homework",
    title: "Set vocabulary homework in 2 minutes",
    message:
      "Pick a word set, choose the game modes, and assign it to your class. Students get instant practice — you get the results.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "tip-sentence-builder",
    category: "Tips & how-to",
    emoji: "🧩",
    label: "Sentence Builder",
    title: "Try Sentence Builder for deeper practice",
    message:
      "Sentence Builder helps students use words in context, not just memorize them. Add it to your next assignment and see the difference.",
    level: "info",
    audience: "all",
  },
  {
    id: "tip-project-board",
    category: "Tips & how-to",
    emoji: "📺",
    label: "Project on board",
    title: "Turn any lesson into a class game",
    message:
      "Project a Live Challenge on your board and run the whole class through the words together. It's the easiest way to fill the last 10 minutes.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "tip-upload-list",
    category: "Tips & how-to",
    emoji: "📋",
    label: "Upload your list",
    title: "Use your own vocabulary list",
    message:
      "Paste or snap a photo of your own word list and Vocaband builds the games for you — perfect for matching your textbook or unit.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "tip-ministry-sets",
    category: "Tips & how-to",
    emoji: "🎯",
    label: "Ministry word sets",
    title: "Aligned with the Ministry vocabulary",
    message:
      "Assign Set 1, Set 2, or Set 3 straight from the library — already aligned to the curriculum, so you can assign with one tap.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "tip-language",
    category: "Tips & how-to",
    emoji: "🌍",
    label: "Hebrew / Arabic",
    title: "Play in Hebrew or Arabic",
    message:
      "Switch the app language any time to see translations in Hebrew or Arabic. Find it in your settings.",
    level: "info",
    audience: "students",
  },

  // ── Seasonal ─────────────────────────────────────────────────────────────
  {
    id: "season-back-to-school",
    category: "Seasonal",
    emoji: "🍎",
    label: "Back to school",
    title: "Start the year strong",
    message:
      "Set up your classes and first assignments now so students hit the ground running. Need help? Everything starts from your dashboard.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "season-teacher-term-review",
    category: "Seasonal",
    emoji: "📚",
    label: "End-of-term review",
    title: "Build a quick end-of-term review",
    message:
      "Wrap up the term with a review assignment covering this period's words. Pick the sets, choose the modes, and send it home for revision.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "season-teacher-holiday-homework",
    category: "Seasonal",
    emoji: "✈️",
    label: "Holiday homework",
    title: "Set fun homework for the break",
    message:
      "Keep students practicing over the holiday with a light, game-based assignment. They keep their streaks — you come back to a class that's still sharp.",
    level: "info",
    audience: "teachers",
  },
  {
    id: "season-weekend",
    category: "Seasonal",
    emoji: "🎮",
    label: "Weekend play",
    title: "Weekend warrior bonus is on!",
    message:
      "Earn extra XP for every round you play this weekend. Grab the bonus before it's gone on Sunday night!",
    level: "info",
    audience: "students",
  },
  {
    id: "season-break-practice",
    category: "Seasonal",
    emoji: "☀️",
    label: "Holiday practice",
    title: "Keep your English sharp over the break",
    message:
      "A few minutes of play during the break keeps your streak and your skills going. See you back in class!",
    level: "info",
    audience: "students",
  },
  {
    id: "season-end-of-term",
    category: "Seasonal",
    emoji: "🎓",
    label: "End of term",
    title: "Final push before the test",
    message:
      "Review this term's words with a quick round before the test. You've got this — finish strong!",
    level: "info",
    audience: "students",
  },
];
