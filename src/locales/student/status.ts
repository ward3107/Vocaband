import type { Language } from "../../hooks/useLanguage";

export interface StatusT {
  backButton: string;
  title: string;
  subtitle: string;
  lastUpdated: string;

  // Status levels
  operational: string;
  degraded: string;
  outage: string;
  maintenance: string;

  // Systems
  systemWebApp: string;
  systemApi: string;
  systemDatabase: string;
  systemAuth: string;
  systemLiveGames: string;

  // Incidents section
  incidentsTitle: string;
  incidentsSubtitle: string;
  noIncidents: string;

  // Uptime section
  uptimeTitle: string;
  uptimeDay: string;
  uptimeWeek: string;
  uptimeMonth: string;
  uptimeYear: string;

  // Metrics
  uptimePercent: string;
  avgResponse: string;
  incidentsCount: string;

  // Footer note
  note: string;

  // Incident types (for future use)
  incidentTypeResolved: string;
  incidentTypeInvestigating: string;
  incidentTypeMonitoring: string;
  incidentTypeScheduled: string;
}

export const statusT: Record<Language, StatusT> = {
  en: {
    backButton: "Back",
    title: "System Status",
    subtitle: "Real-time status of Vocaband services",
    lastUpdated: "Last updated",

    operational: "Operational",
    degraded: "Degraded Performance",
    outage: "Service Outage",
    maintenance: "Under Maintenance",

    systemWebApp: "Web Application",
    systemApi: "API Services",
    systemDatabase: "Database",
    systemAuth: "Authentication",
    systemLiveGames: "Live Games",

    incidentsTitle: "Recent Incidents",
    incidentsSubtitle: "Past 90 days",
    noIncidents: "No incidents reported in the past 90 days. Everything is running smoothly!",

    uptimeTitle: "Uptime Metrics",
    uptimeDay: "24 hours",
    uptimeWeek: "7 days",
    uptimeMonth: "30 days",
    uptimeYear: "90 days",

    uptimePercent: "Uptime",
    avgResponse: "Avg Response",
    incidentsCount: "Incidents",

    note: "This page is updated every minute. Follow us on Twitter @vocabandstatus for real-time updates.",

    incidentTypeResolved: "Resolved",
    incidentTypeInvestigating: "Investigating",
    incidentTypeMonitoring: "Monitoring",
    incidentTypeScheduled: "Scheduled Maintenance",
  },

  he: {
    backButton: "חזרה",
    title: "סטטוס מערכת",
    subtitle: "סטטוס זמן-אמת של שירותי Vocaband",
    lastUpdated: "עודכן לאחרונה",

    operational: "תקין",
    degraded: "ביצועים ירודים",
    outage: "הפסקת שירות",
    maintenance: "בתחזוקה",

    systemWebApp: "אפליקציית אינטרנט",
    systemApi: "שירות API",
    systemDatabase: "מסד נתונים",
    systemAuth: "אימות",
    systemLiveGames: "משחקים חיים",

    incidentsTitle: "תקריות אחרונות",
    incidentsSubtitle: "90 ימים אחרונים",
    noIncidents: "לא דווחו תקריות ב-90 הימים האחרונים. הכל פועל חלק!",

    uptimeTitle: "מדדי זמינות",
    uptimeDay: "24 שעות",
    uptimeWeek: "7 ימים",
    uptimeMonth: "30 יום",
    uptimeYear: "90 יום",

    uptimePercent: "זמינות",
    avgResponse: "זמן תגובה ממוצע",
    incidentsCount: "תקריות",

    note: "דף זה מתעדכן כל דקה. עקבו אחרינו בטוויטר @vocabandstatus לעדכונים בזמן אמת.",

    incidentTypeResolved: "נפתר",
    incidentTypeInvestigating: "בבדיקה",
    incidentTypeMonitoring: "במעקב",
    incidentTypeScheduled: "תחזוקה מתוכננת",
  },

  ar: {
    backButton: "رجوع",
    title: "حالة النظام",
    subtitle: "حالة فورية لخدمات Vocaband",
    lastUpdated: "آخر تحديث",

    operational: "يعمل",
    degraded: "أداء منخفض",
    outage: "انقطاع الخدمة",
    maintenance: "تحت الصيانة",

    systemWebApp: "تطبيق الويب",
    systemApi: "خدمات API",
    systemDatabase: "قاعدة البيانات",
    systemAuth: "المصادقة",
    systemLiveGames: "الألعاب المباشرة",

    incidentsTitle: "الحوادث الأخيرة",
    incidentsSubtitle: "آخر 90 يومًا",
    noIncidents: "لم يتم الإبلاغ عن أي حوادث في آخر 90 يومًا. كل شيء يعمل بسلاسة!",

    uptimeTitle: "مقاييس وقت التشغيل",
    uptimeDay: "24 ساعة",
    uptimeWeek: "7 أيام",
    uptimeMonth: "30 يومًا",
    uptimeYear: "90 يومًا",

    uptimePercent: "وقت التشغيل",
    avgResponse: "معدل الاستجابة",
    incidentsCount: "الحوادث",

    note: "يتم تحديث هذه الصفحة كل دقيقة. تابعنا على تويتر @vocabandstatus للحصول على تحديثات فورية.",

    incidentTypeResolved: "تم الحل",
    incidentTypeInvestigating: "قيد التحقيق",
    incidentTypeMonitoring: "تحت المراقبة",
    incidentTypeScheduled: "صيانة مجدولة",
  },
};
