/**
 * Locale file for the per-page "first-time" walkthroughs (FirstTimeGuide).
 *
 * Each major teacher page has a 3-step guide:
 *   - createAssignment (SetupWizard, assignment mode)
 *   - classroom        (ClassroomView)
 *   - approvals        (TeacherApprovalsView)
 *   - worksheet        (WorksheetView)
 *   - classShow        (ClassShowSetup)
 *   - quickPlayMonitor (QuickPlayMonitor)
 *
 * Tone matches dashboard.ts — warm, direct, plain English.  Hebrew +
 * Arabic translations follow the same conventions used elsewhere in
 * src/locales/teacher.
 */
import type { Language } from "../../hooks/useLanguage";

export interface GuideStepStrings {
  title: string;
  body: string;
  icon?: string;
}

export interface GuidePageStrings {
  heading: string;
  subheading: string;
  steps: GuideStepStrings[];
}

export interface GuideStrings {
  common: {
    next: string;
    gotIt: string;
    skip: string;
    triggerAria: string;
    /** "Step {current} of {total}" header above each bubble. */
    progress: (current: number, total: number) => string;
  };
  createAssignment: GuidePageStrings;
  classroom: GuidePageStrings;
  approvals: GuidePageStrings;
  worksheet: GuidePageStrings;
  classShow: GuidePageStrings;
  quickPlayMonitor: GuidePageStrings;
}

export const teacherGuidesT: Record<Language, GuideStrings> = {
  en: {
    common: {
      next: "Next",
      gotIt: "Got it",
      skip: "Skip",
      triggerAria: "Show page guide",
      progress: (current, total) => `Step ${current} of ${total}`,
    },
    createAssignment: {
      heading: "Create Assignment",
      subheading: "Build a vocabulary task in three steps",
      steps: [
        {
          icon: "📚",
          title: "Pick words",
          body: "Choose vocabulary from Set 1, Set 2, or paste your own list. The OCR camera button reads words off a page photo.",
        },
        {
          icon: "⚙️",
          title: "Configure",
          body: "Pick the game modes your students will play. We'll auto-fill a title and instructions you can edit.",
        },
        {
          icon: "✅",
          title: "Review and assign",
          body: "Confirm the words + modes, set an optional deadline, and tap Assign. The class code at the top is what students type to join.",
        },
      ],
    },
    classroom: {
      heading: "Classroom",
      subheading: "Everything about your class in one place",
      steps: [
        {
          icon: "🌡️",
          title: "Today",
          body: "Who needs your attention right now — active students this week, average score, recent plays.",
        },
        {
          icon: "👥",
          title: "Students",
          body: "Tap any student to see their per-mode strengths, struggling words, and recent attempts.",
        },
        {
          icon: "📊",
          title: "Reports",
          body: "Per-week trend, top struggling words, and CSV / PDF export of every play in this class.",
        },
      ],
    },
    approvals: {
      heading: "Student Approvals",
      subheading: "Approve students who signed up for your classes",
      steps: [
        {
          icon: "✅",
          title: "Approve to unlock",
          body: "After you approve, the student can log in and start earning XP. Their progress is saved automatically.",
        },
        {
          icon: "⚡",
          title: "Approve all at once",
          body: "If you trust everyone in the list, the bulk button at the top processes them in one tap.",
        },
        {
          icon: "❌",
          title: "Reject if you don't recognize them",
          body: "Rejecting forces the student to sign up again with a new class code — useful for typos or wrong-class joins.",
        },
      ],
    },
    worksheet: {
      heading: "Worksheet",
      subheading: "Print or save vocabulary practice as PDF",
      steps: [
        {
          icon: "📋",
          title: "Pick sheet types",
          body: "Combine word lists, scrambles, fill-in-the-blank, matching, and more on a single printable.",
        },
        {
          icon: "🌐",
          title: "Pick translation language",
          body: "The translation column reads in Hebrew or Arabic depending on the language you pick here.",
        },
        {
          icon: "🖨️",
          title: "Print or save as PDF",
          body: "The Print button opens your browser's print dialog — choose Save as PDF to download instead of printing.",
        },
      ],
    },
    classShow: {
      heading: "Class Show",
      subheading: "Project a vocabulary game on the classroom screen",
      steps: [
        {
          icon: "📺",
          title: "One screen for the whole class",
          body: "Pick a mode, hit Start, and the class watches together. Students answer by raising hands or shouting.",
        },
        {
          icon: "🎮",
          title: "12 game modes",
          body: "From Spelling to Memory Flip — pick what fits the lesson.",
        },
        {
          icon: "🛠️",
          title: "Build your word list",
          body: "Use a class assignment, paste your own list, or generate words by topic with AI.",
        },
      ],
    },
    quickPlayMonitor: {
      heading: "Quick Play",
      subheading: "Live leaderboard for your classroom",
      steps: [
        {
          icon: "📱",
          title: "Students scan the QR",
          body: "No login. They open their phone camera, scan the code, type a nickname, and they're in.",
        },
        {
          icon: "🏆",
          title: "Watch the podium update live",
          body: "Top 3 students animate to the top as they finish rounds. Tap a student name to remove them.",
        },
        {
          icon: "🎵",
          title: "Background music + themes",
          body: "Optional looped music + 7 colour themes for the projector. All saved to your dashboard for next time.",
        },
      ],
    },
  },

  he: {
    common: {
      next: "הבא",
      gotIt: "הבנתי",
      skip: "דלג",
      triggerAria: "הצג מדריך לדף",
      progress: (current, total) => `שלב ${current} מתוך ${total}`,
    },
    createAssignment: {
      heading: "יצירת משימה",
      subheading: "בנה משימת אוצר מילים בשלושה שלבים",
      steps: [
        {
          icon: "📚",
          title: "בחר מילים",
          body: "בחר אוצר מילים מסט 1, סט 2, או הדבק רשימה משלך. כפתור מצלמת ה-OCR קורא מילים מתצלום של דף.",
        },
        {
          icon: "⚙️",
          title: "הגדר",
          body: "בחר את מצבי המשחק שהתלמידים שלך ישחקו. נמלא אוטומטית כותרת והוראות שתוכל לערוך.",
        },
        {
          icon: "✅",
          title: "בדוק ושייך",
          body: "אשר את המילים והמצבים, קבע תאריך יעד אופציונלי, והקש שייך. קוד הכיתה למעלה הוא מה שהתלמידים מקלידים כדי להצטרף.",
        },
      ],
    },
    classroom: {
      heading: "כיתה",
      subheading: "כל מה שקשור לכיתה במקום אחד",
      steps: [
        {
          icon: "🌡️",
          title: "היום",
          body: "מי זקוק לתשומת ליבך עכשיו — תלמידים פעילים השבוע, ציון ממוצע, ומשחקים אחרונים.",
        },
        {
          icon: "👥",
          title: "תלמידים",
          body: "הקש על כל תלמיד כדי לראות חוזקות לפי מצב משחק, מילים מאתגרות וניסיונות אחרונים.",
        },
        {
          icon: "📊",
          title: "דוחות",
          body: "מגמה שבועית, מילים מאתגרות במיוחד, וייצוא CSV / PDF של כל המשחקים בכיתה הזו.",
        },
      ],
    },
    approvals: {
      heading: "אישורי תלמידים",
      subheading: "אשר תלמידים שנרשמו לכיתות שלך",
      steps: [
        {
          icon: "✅",
          title: "אשר כדי לפתוח גישה",
          body: "לאחר אישור, התלמיד יוכל להתחבר ולהתחיל לצבור XP. ההתקדמות נשמרת אוטומטית.",
        },
        {
          icon: "⚡",
          title: "אשר את כולם בבת אחת",
          body: "אם אתה סומך על כל מי שברשימה, כפתור האישור הקבוצתי למעלה מאשר את כולם בהקשה אחת.",
        },
        {
          icon: "❌",
          title: "דחה אם אינך מזהה",
          body: "דחייה תאלץ את התלמיד להירשם שוב עם קוד כיתה חדש — שימושי לטעויות הקלדה או הצטרפות לכיתה הלא נכונה.",
        },
      ],
    },
    worksheet: {
      heading: "דף עבודה",
      subheading: "הדפס או שמור תרגול אוצר מילים כ-PDF",
      steps: [
        {
          icon: "📋",
          title: "בחר סוגי דפים",
          body: "שלב רשימות מילים, ערבובים, השלמת חסר, התאמה ועוד בדף אחד להדפסה.",
        },
        {
          icon: "🌐",
          title: "בחר שפת תרגום",
          body: "עמודת התרגום נקראת בעברית או בערבית בהתאם לשפה שתבחר כאן.",
        },
        {
          icon: "🖨️",
          title: "הדפס או שמור כ-PDF",
          body: "כפתור ההדפסה פותח את חלון ההדפסה של הדפדפן — בחר 'שמור כ-PDF' להורדה במקום הדפסה.",
        },
      ],
    },
    classShow: {
      heading: "מצב כיתה",
      subheading: "הקרן משחק אוצר מילים על מסך הכיתה",
      steps: [
        {
          icon: "📺",
          title: "מסך אחד לכל הכיתה",
          body: "בחר מצב, הקש התחל, והכיתה צופה ביחד. התלמידים עונים בהרמת יד או בקריאה בקול.",
        },
        {
          icon: "🎮",
          title: "12 מצבי משחק",
          body: "מאיות ועד 'הפוך זיכרון' — בחר מה שמתאים לשיעור.",
        },
        {
          icon: "🛠️",
          title: "בנה את רשימת המילים שלך",
          body: "השתמש במשימת כיתה, הדבק רשימה משלך, או צור מילים לפי נושא בעזרת בינה מלאכותית.",
        },
      ],
    },
    quickPlayMonitor: {
      heading: "משחק מהיר",
      subheading: "טבלת מובילים חיה לכיתה שלך",
      steps: [
        {
          icon: "📱",
          title: "התלמידים סורקים את ה-QR",
          body: "ללא התחברות. הם פותחים את מצלמת הטלפון, סורקים את הקוד, מקלידים כינוי וזהו.",
        },
        {
          icon: "🏆",
          title: "צפה בפודיום מתעדכן בזמן אמת",
          body: "שלושת המובילים מטפסים לראש בסיום הסיבובים. הקש על שם תלמיד כדי להסיר אותו.",
        },
        {
          icon: "🎵",
          title: "מוזיקת רקע + ערכות צבע",
          body: "מוזיקה מלולאת אופציונלית + 7 ערכות צבע למקרן. הכול נשמר בלוח הבקרה שלך לפעם הבאה.",
        },
      ],
    },
  },

  ar: {
    common: {
      next: "التالي",
      gotIt: "فهمت",
      skip: "تخطي",
      triggerAria: "عرض دليل الصفحة",
      progress: (current, total) => `الخطوة ${current} من ${total}`,
    },
    createAssignment: {
      heading: "إنشاء واجب",
      subheading: "ابنِ مهمّة مفردات في ثلاث خطوات",
      steps: [
        {
          icon: "📚",
          title: "اختر الكلمات",
          body: "اختر مفردات من المجموعة 1، المجموعة 2، أو الصق قائمتك الخاصة. زر كاميرا OCR يقرأ الكلمات من صورة صفحة.",
        },
        {
          icon: "⚙️",
          title: "اضبط الإعدادات",
          body: "اختر أوضاع اللعب التي سيلعبها طلابك. سنملأ تلقائيًا عنوانًا وتعليمات يمكنك تعديلها.",
        },
        {
          icon: "✅",
          title: "راجع وأسنِد",
          body: "أكّد الكلمات والأوضاع، حدّد موعدًا نهائيًا اختياريًا، واضغط أسنِد. رمز الفصل في الأعلى هو ما يكتبه الطلاب للانضمام.",
        },
      ],
    },
    classroom: {
      heading: "الفصل",
      subheading: "كل ما يخصّ فصلك في مكان واحد",
      steps: [
        {
          icon: "🌡️",
          title: "اليوم",
          body: "من يحتاج اهتمامك الآن — الطلاب النشطون هذا الأسبوع، المعدّل، وآخر اللعبات.",
        },
        {
          icon: "👥",
          title: "الطلاب",
          body: "اضغط على أي طالب لرؤية نقاط قوّته في كل وضع، الكلمات الصعبة، والمحاولات الأخيرة.",
        },
        {
          icon: "📊",
          title: "التقارير",
          body: "اتجاه أسبوعي، أصعب الكلمات، وتصدير CSV / PDF لكل لعبة في هذا الفصل.",
        },
      ],
    },
    approvals: {
      heading: "موافقات الطلاب",
      subheading: "وافق على الطلاب الذين سجّلوا في فصولك",
      steps: [
        {
          icon: "✅",
          title: "وافق لفتح الوصول",
          body: "بعد الموافقة يستطيع الطالب تسجيل الدخول والبدء بكسب XP. يُحفظ تقدّمه تلقائيًا.",
        },
        {
          icon: "⚡",
          title: "وافق على الجميع دفعة واحدة",
          body: "إذا كنت تثق بكل من في القائمة، فإن زر الموافقة الجماعية في الأعلى يعالجهم بضغطة واحدة.",
        },
        {
          icon: "❌",
          title: "ارفض إن لم تتعرّف عليهم",
          body: "الرفض يجبر الطالب على التسجيل مرّة أخرى برمز فصل جديد — مفيد عند الأخطاء الإملائية أو الانضمام لفصل خاطئ.",
        },
      ],
    },
    worksheet: {
      heading: "ورقة عمل",
      subheading: "اطبع أو احفظ تمارين المفردات بصيغة PDF",
      steps: [
        {
          icon: "📋",
          title: "اختر أنواع الأوراق",
          body: "اجمع قوائم كلمات، خلط حروف، ملء الفراغ، ومطابقة، وغيرها في مطبوع واحد.",
        },
        {
          icon: "🌐",
          title: "اختر لغة الترجمة",
          body: "يظهر عمود الترجمة بالعبرية أو العربية حسب اللغة التي تختارها هنا.",
        },
        {
          icon: "🖨️",
          title: "اطبع أو احفظ بصيغة PDF",
          body: "زر الطباعة يفتح حوار الطباعة في متصفّحك — اختر 'حفظ كـ PDF' للتنزيل بدل الطباعة.",
        },
      ],
    },
    classShow: {
      heading: "عرض الفصل",
      subheading: "اعرض لعبة مفردات على شاشة الفصل",
      steps: [
        {
          icon: "📺",
          title: "شاشة واحدة للفصل كلّه",
          body: "اختر وضعًا، اضغط ابدأ، ويشاهد الفصل معًا. يجيب الطلاب برفع اليد أو بالنداء.",
        },
        {
          icon: "🎮",
          title: "12 وضع لعب",
          body: "من التهجئة إلى قلب الذاكرة — اختر ما يناسب الدرس.",
        },
        {
          icon: "🛠️",
          title: "ابنِ قائمة كلماتك",
          body: "استخدم واجبًا للفصل، الصق قائمتك الخاصة، أو ولّد كلمات حسب الموضوع باستخدام الذكاء الاصطناعي.",
        },
      ],
    },
    quickPlayMonitor: {
      heading: "لعب سريع",
      subheading: "لوحة المتصدّرين الحيّة لفصلك",
      steps: [
        {
          icon: "📱",
          title: "يمسح الطلاب رمز QR",
          body: "بدون تسجيل دخول. يفتحون كاميرا الهاتف، يمسحون الرمز، يكتبون اسمًا مستعارًا، ودخلوا.",
        },
        {
          icon: "🏆",
          title: "شاهد المنصّة تتحدّث مباشرة",
          body: "أعلى 3 طلاب يصعدون إلى القمّة عند إكمال الجولات. اضغط على اسم طالب لإزالته.",
        },
        {
          icon: "🎵",
          title: "موسيقى خلفية + سمات",
          body: "موسيقى متكرّرة اختيارية + 7 سمات لونية لجهاز العرض. كل شيء محفوظ في لوحتك للمرّة القادمة.",
        },
      ],
    },
  },
};
