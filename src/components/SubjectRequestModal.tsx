import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, CheckCircle2, Phone, School, User } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { landingPageT } from "../locales/student/landing-page";

interface SubjectRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubjectRequestModal: React.FC<SubjectRequestModalProps> = ({ isOpen, onClose }) => {
  const { language, dir } = useLanguage();
  const t = landingPageT[language];
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    schoolType: "",
    schoolName: "",
    subjects: [] as string[],
    grade: "",
  });

  const subjects = [
    { value: "math", label: { en: "Mathematics", he: "מתמטיקה", ar: "الرياضيات" } },
    { value: "science", label: { en: "Science", he: "מדעים", ar: "العلوم" } },
    { value: "physics", label: { en: "Physics", he: "פיזיקה", ar: "الفيزياء" } },
    { value: "chemistry", label: { en: "Chemistry", he: "כימיה", ar: "الكيمياء" } },
    { value: "biology", label: { en: "Biology", he: "ביולוגיה", ar: "الأحياء" } },
    { value: "history", label: { en: "History", he: "היסטוריה", ar: "التاريخ" } },
    { value: "geography", label: { en: "Geography", he: "גאוגרפיה", ar: "الجغرافيا" } },
    { value: "bible", label: { en: "Bible", he: "תנ\"ך", ar: "الكتاب المقدس" } },
    { value: "grammar", label: { en: "Grammar", he: "דקדוק", ar: "القواعد" } },
    { value: "literature", label: { en: "Literature", he: "ספרות", ar: "الأدب" } },
    { value: "civics", label: { en: "Civics", he: "אזרחות", ar: "التربية المدنية" } },
    { value: "hebrew", label: { en: "Hebrew", he: "עברית", ar: "العبرية" } },
    { value: "arabic", label: { en: "Arabic", he: "ערבית", ar: "اللغة العربية" } },
    { value: "english", label: { en: "English", he: "אנגלית", ar: "اللغة الإنجليزية" } },
    { value: "computers", label: { en: "Computer Science", he: "מדעי המחשב", ar: "علوم الحاسوب" } },
    { value: "art", label: { en: "Art", he: "אמנות", ar: "الفن" } },
    { value: "music", label: { en: "Music", he: "מוזיקה", ar: "الموسيقى" } },
    { value: "pe", label: { en: "Physical Education", he: "חינוך גופני", ar: "التربية البدنية" } },
    { value: "other", label: { en: "Other", he: "אחר", ar: "أخرى" } },
  ];

  const grades = [
    { value: "elementary", label: { en: "Elementary (1-6)", he: "יסודי (1-6)", ar: "الابتدائية (1-6)" } },
    { value: "middle", label: { en: "Middle School (7-9)", he: "חטיבת ביניים (7-9)", ar: "المتوسطة (7-9)" } },
    { value: "high", label: { en: "High School (10-12)", he: "תיכון (10-12)", ar: "الثانوية (10-12)" } },
  ];

  const schoolTypes = [
    { value: "private", label: { en: "Private Tutoring", he: "שיעורים פרטיים", ar: "دروس خصوصية" } },
    { value: "school", label: { en: "School", he: "בית ספר", ar: "مدرسة" } },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one subject is selected
    if (formData.subjects.length === 0) {
      alert(language === "he"
        ? "בחר לפחות נושא אחד"
        : language === "ar"
        ? "اختر مادة واحدة على الأقل"
        : "Please select at least one subject"
      );
      return;
    }

    // Build email body with localized labels
    const getSubjectLabels = () => formData.subjects.map(s =>
      subjects.find(sub => sub.value === s)?.label[language] || s
    ).join(", ");
    const getGradeLabel = () => grades.find(g => g.value === formData.grade)?.label[language] || "";
    const getSchoolTypeLabel = () => schoolTypes.find(t => t.value === formData.schoolType)?.label[language] || "";

    const emailBody = language === "he"
      ? `שם: ${formData.name}
אימייל: ${formData.email}
טלפון: ${formData.phone}
סוג: ${getSchoolTypeLabel()}
שם בית הספר/מוסד: ${formData.schoolName}
נושאים מבוקשים: ${getSubjectLabels()}
רמת כיתה: ${getGradeLabel()}`
      : language === "ar"
      ? `الاسم: ${formData.name}
البريد الإلكتروني: ${formData.email}
الهاتف: ${formData.phone}
النوع: ${getSchoolTypeLabel()}
اسم المدرسة/المؤسسة: ${formData.schoolName}
المواد المطلوبة: ${getSubjectLabels()}
مستوى الصف: ${getGradeLabel()}`
      : `Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Type: ${getSchoolTypeLabel()}
School/Institution Name: ${formData.schoolName}
Subjects Requested: ${getSubjectLabels()}
Grade Level: ${getGradeLabel()}`;

    try {
      // Send to your backend/email service
      const response = await fetch("https://www.vocaband.com/api/subject-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          setSubmitted(false);
          setFormData({ name: "", email: "", phone: "", schoolType: "", schoolName: "", subjects: [], grade: "" });
        }, 3000);
      } else {
        // Fallback: open email client with pre-filled data
        const subject = encodeURIComponent(language === "he" ? "בקשת נושא חדש - Voca" : language === "ar" ? "طلب موضوع جديد - Voca" : "Voca Roadmap - Subject Request");
        window.location.href = `mailto:contact@vocaband.com?subject=${subject}&body=${encodeURIComponent(emailBody)}`;
        onClose();
      }
    } catch {
      // Fallback: open email client with pre-filled data
      const subject = encodeURIComponent(language === "he" ? "בקשת נושא חדש - Voca" : language === "ar" ? "طلب موضوع جديد - Voca" : "Voca Roadmap - Subject Request");
      window.location.href = `mailto:contact@vocaband.com?subject=${subject}&body=${encodeURIComponent(emailBody)}`;
      onClose();
    }
  };

  const handleSubjectToggle = (value: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(value)
        ? prev.subjects.filter(s => s !== value)
        : [...prev.subjects, value]
    }));
  };

  const getLabel = (label: { en: string; he: string; ar: string }) => {
    return label[language as keyof typeof label] || label.en;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto relative w-full max-w-lg"
              dir={dir}
            >
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5 flex items-center justify-between">
                  <h2 className="text-2xl font-black text-white">
                    {submitted
                      ? (language === "he" ? "הבקשה התקבלה!"
                        : language === "ar" ? "تم استلام الطلب!"
                        : "Request Received!")
                      : (language === "he" ? "בקש נושא חדש"
                        : language === "ar" ? "طلب موضوع جديد"
                        : "Request a Subject")
                    }
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors"
                    type="button"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6">
                  {submitted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-center py-8"
                    >
                      <CheckCircle2 size={64} className="mx-auto mb-4 text-emerald-500" />
                      <p className="text-lg font-bold text-slate-700">
                        {language === "he"
                          ? "נקלטה הבקשה שלך. נחזור אליך בהקדם!"
                          : language === "ar"
                          ? "تم استلام طلبك. سنعود إليك قريبًا!"
                          : "We got your request. We'll be in touch!"}
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      {/* Name - Optional */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          <User size={14} className="inline mr-1" />
                          {language === "he" ? "שם מלא" : language === "ar" ? "الاسم الكامل" : "Full Name"}
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={language === "he" ? "השם שלך" : language === "ar" ? "اسمك" : "Your name"}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-violet-500 focus:outline-none transition-colors text-sm"
                        />
                      </div>

                      {/* Email - Required */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          ✉️ {language === "he" ? "אימייל *" : language === "ar" ? "البريد الإلكتروني *" : "Email *"}
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="your@email.com"
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-violet-500 focus:outline-none transition-colors text-sm"
                          dir="ltr"
                        />
                      </div>

                      {/* Phone - Required */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          <Phone size={14} className="inline mr-1" />
                          {language === "he" ? "טלפון *" : language === "ar" ? "الهاتف *" : "Phone *"}
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder={language === "he" ? "050-000-0000" : language === "ar" ? "05xxxxxxxx" : "+972 50 000 0000"}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-violet-500 focus:outline-none transition-colors text-sm"
                          dir="ltr"
                        />
                      </div>

                      {/* School Type - Required */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          <School size={14} className="inline mr-1" />
                          {language === "he" ? "סוג *" : language === "ar" ? "النوع *" : "Type *"}
                        </label>
                        <select
                          required
                          value={formData.schoolType}
                          onChange={(e) => setFormData({ ...formData, schoolType: e.target.value, schoolName: e.target.value === "private" ? "" : formData.schoolName })}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-violet-500 focus:outline-none transition-colors bg-white text-sm"
                        >
                          <option value="">
                            {language === "he" ? "בחר סוג..." : language === "ar" ? "اختر النوع..." : "Select type..."}
                          </option>
                          {schoolTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {getLabel(type.label)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* School Name - Required for schools */}
                      {formData.schoolType === "school" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            {language === "he" ? "שם בית הספר *" : language === "ar" ? "اسم المدرسة *" : "School Name *"}
                          </label>
                          <input
                            type="text"
                            required={formData.schoolType === "school"}
                            value={formData.schoolName}
                            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                            placeholder={language === "he" ? "שם בית הספר" : language === "ar" ? "اسم المدرسة" : "School name"}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-violet-500 focus:outline-none transition-colors text-sm"
                          />
                        </motion.div>
                      )}

                      {/* Subjects - Multiple Selection (Required at least one) */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          📚 {language === "he" ? "נושאים מבוקשים *" : language === "ar" ? "المواد المطلوبة *" : "Subjects *"}
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border-2 border-slate-200 rounded-xl p-3">
                          {subjects.map((subject) => (
                            <label
                              key={subject.value}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                formData.subjects.includes(subject.value)
                                  ? "bg-violet-100 border border-violet-300"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.subjects.includes(subject.value)}
                                onChange={() => handleSubjectToggle(subject.value)}
                                className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                              />
                              <span className="text-xs font-medium">{getLabel(subject.label)}</span>
                            </label>
                          ))}
                        </div>
                        {formData.subjects.length === 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            {language === "he" ? "בחר לפחות נושא אחד" : language === "ar" ? "اختر مادة واحدة على الأقل" : "Select at least one subject"}
                          </p>
                        )}
                      </div>

                      {/* Grade Level */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          🎓 {language === "he" ? "רמת כיתה" : language === "ar" ? "مستوى الصف" : "Grade Level"}
                        </label>
                        <select
                          value={formData.grade}
                          onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-violet-500 focus:outline-none transition-colors bg-white text-sm"
                        >
                          <option value="">
                            {language === "he" ? "בחר רמה..." : language === "ar" ? "اختر المستوى..." : "Select grade..."}
                          </option>
                          {grades.map((g) => (
                            <option key={g.value} value={g.value}>
                              {getLabel(g.label)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Send size={18} />
                        {language === "he" ? "שלח בקשה" : language === "ar" ? "إرسال الطلب" : "Send Request"}
                      </motion.button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SubjectRequestModal;
