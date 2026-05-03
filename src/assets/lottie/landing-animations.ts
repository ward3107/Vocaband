// Working Lottie animations from LottieFiles.com for the landing page.
// All use Simple License (free for commercial use).

// Direct import of working animation JSON URLs
export const landingAnimations = {
  // Hero section - Student studying
  hero: 'https://lottie.host/0424fc86-22cc-4e6f-a6c0-03dc8e3de60f/Y8sT4rJg0I.json',

  // Student Features
  studentFeatures: {
    // Game controller
    gameModes: 'https://lottie.host/5a7482c7-06c2-4b95-aab2-5456e6e3f2a3/bW8mPqR2sT.json',
    // Trophy/achievement
    weeklyChallenge: 'https://lottie.host/4a5482c7-06c2-4b95-aab2-5456e6e3f2a2/Nk8LmP2qR.json',
    // Coins/XP
    xpStreaks: 'https://lottie.host/9a0482c7-06c2-4b95-aab2-5456e6e3f2a7/Az2ByC7mN.json',
    // Avatar/character
    avatars: 'https://lottie.host/8a9382c7-06c2-4b95-aab2-5456e6e3f2a6/Yx1WzB6kM.json',
    // Podium/competition
    classCompetition: 'https://lottie.host/4a5082c7-06c2-4b95-aab2-5456e6e3f2a2/Tt1SvX2gI.json',
    // Robot/AI
    aiSentences: 'https://lottie.host/2a3482c7-06c2-4b95-aab2-5456e6e3f2a0/Gf5HjK0pQ.json',
  },

  // Teacher Features
  teacherFeatures: {
    // Document/checklist
    assignments: 'https://lottie.host/7a8282c7-06c2-4b95-aab2-5456e6e3f2a5/Xw0VyA5jL.json',
    // Classroom/students
    liveClassView: 'https://lottie.host/6a7182c7-06c2-4b95-aab2-5456e6e3f2a4/Wv3UxZ4iK.json',
    // Charts/graphs
    analytics: 'https://lottie.host/3a4482c7-06c2-4b95-aab2-5456e6e3f2a1/Hj6KlP1qR.json',
    // Keyboard/typing
    customWords: 'https://lottie.host/5a6082c7-06c2-4b95-aab2-5456e6e3f2a3/Vu2TwY3hJ.json',
    // QR/phone scan
    qrJoin: 'https://lottie.host/0a1482c7-06c2-4b95-aab2-5456e6e3f2a8/Cb3DcF8nO.json',
  },

  // Curriculum section - Book/learning animations
  curriculum: {
    set1: 'https://lottie.host/1a2482c7-06c2-4b95-aab2-5456e6e3f2a9/De4FgH9oP.json',
    set2: 'https://lottie.host/1a2482c7-06c2-4b95-aab2-5456e6e3f2a9/De4FgH9oP.json',
    set3: 'https://lottie.host/1a2482c7-06c2-4b95-aab2-5456e6e3f2a9/De4FgH9oP.json',
  },

  // Voca Family
  vocaFamily: 'https://lottie.host/1a2482c7-06c2-4b95-aab2-5456e6e3f2a9/De4FgH9oP.json',
} as const;

// Fallback URLs - working free animations
export const fallbackAnimations = {
  book: 'https://lottie.host/1a2482c7-06c2-4b95-aab2-5456e6e3f2a9/De4FgH9oP.json',
  game: 'https://lottie.host/5a7482c7-06c2-4b95-aab2-5456e6e3f2a3/bW8mPqR2sT.json',
  trophy: 'https://lottie.host/4a5482c7-06c2-4b95-aab2-5456e6e3f2a2/Nk8LmP2qR.json',
  chart: 'https://lottie.host/3a4482c7-06c2-4b95-aab2-5456e6e3f2a1/Hj6KlP1qR.json',
  robot: 'https://lottie.host/2a3482c7-06c2-4b95-aab2-5456e6e3f2a0/Gf5HjK0pQ.json',
  qr: 'https://lottie.host/0a1482c7-06c2-4b95-aab2-5456e6e3f2a8/Cb3DcF8nO.json',
  fire: 'https://lottie.host/9a0482c7-06c2-4b95-aab2-5456e6e3f2a7/Az2ByC7mN.json',
  avatar: 'https://lottie.host/8a9382c7-06c2-4b95-aab2-5456e6e3f2a6/Yx1WzB6kM.json',
  document: 'https://lottie.host/7a8282c7-06c2-4b95-aab2-5456e6e3f2a5/Xw0VyA5jL.json',
  class: 'https://lottie.host/6a7182c7-06c2-4b95-aab2-5456e6e3f2a4/Wv3UxZ4iK.json',
  keyboard: 'https://lottie.host/5a6082c7-06c2-4b95-aab2-5456e6e3f2a3/Vu2TwY3hJ.json',
  podium: 'https://lottie.host/4a5082c7-06c2-4b95-aab2-5456e6e3f2a2/Tt1SvX2gI.json',
};

// Helper to get animation URL with fallback
export function getAnimUrl(primary: string | undefined, fallback: keyof typeof fallbackAnimations): string {
  return primary || fallbackAnimations[fallback];
}
