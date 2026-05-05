import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, CheckCircle2, Lightbulb, Star, Sparkles } from "lucide-react";
import { useLanguage, Language } from "../hooks/useLanguage";

interface FeatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeatureRequestT {
  title: string;
  subtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  categoryGame: string;
  categoryTeacher: string;
  categoryStudent: string;
  categoryUi: string;
  categoryOther: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  descriptionHint: string;
  priorityLabel: string;
  priorityNice: string;
  priorityImportant: string;
  priorityCritical: string;
  submitButton: string;
  successTitle: string;
  successMessage: string;
}

const featureRequestT: Record<Language, FeatureRequestT> = {
  en: {
    title: "Request a Feature",
    subtitle: "Have an idea? We'd love to hear it!",
    nameLabel: "Your Name",
    namePlaceholder: "Optional",
    emailLabel: "Email",
    emailPlaceholder: "For follow-up (optional)",
    categoryLabel: "Feature Type",
    categoryPlaceholder: "Select category...",
    categoryGame: "🎮 Game Mode",
    categoryTeacher: "👨‍🏫 Teacher Feature",
    categoryStudent: "🎓 Student Feature",
    categoryUi: "🎨 UI/UX Improvement",
    categoryOther: "✨ Other",
    descriptionLabel: "Describe Your Idea",
    descriptionPlaceholder: "Tell us about your feature idea...",
    descriptionHint: "The more details, the better!",
    priorityLabel: "How important is this?",
    priorityNice: "Nice to have",
    priorityImportant: "Important",
    priorityCritical: "Must have!",
    submitButton: "Submit Request",
    successTitle: "Request Received!",
    successMessage: "Thanks for helping us improve Vocaband! We'll review your idea.",
  },
  he: {
    title: "הצע פיצ'ר חדש",
    subtitle: "יש לך רעיון? נשמח לשמוע!",
    nameLabel: "השם שלך",
    namePlaceholder: "אופציונלי",
    emailLabel: "אימייל",
    emailPlaceholder: "ליצירת קשר (אופציונלי)",
    categoryLabel: "סוג הפיצ'ר",
    categoryPlaceholder: "בחר קטגוריה...",
    categoryGame: "🎮 מצב משחק",
    categoryTeacher: "👨‍🏫 פיצ'ר למורים",
    categoryStudent: "🎓 פיצ'ר לתלמידים",
    categoryUi: "🎨 שיפור ממשק",
    categoryOther: "✨ אחר",
    descriptionLabel: "תאר את הרעיון",
    descriptionPlaceholder: "ספר לנו על הרעיון שלך...",
    descriptionHint: "כמה שיותר פרטים, כך יותר טוב!",
    priorityLabel: "מה חשיבות הדבר?",
    priorityNice: "כיף להשיג",
    priorityImportant: "חשוב",
    priorityCritical: "חייב להיות!",
    submitButton: "שלח בקשה",
    successTitle: "הבקשה התקבלה!",
    successMessage: "תודה שעוזרים לנו לשפר את Vocaband! נבחן את הרעיון שלך.",
  },
  ar: {
    title: "اقترح ميزة جديدة",
    subtitle: "لديك فكرة؟ نود سماعها!",
    nameLabel: "اسمك",
    namePlaceholder: "اختياري",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "للمتابعة (اختياري)",
    categoryLabel: "نوع الميزة",
    categoryPlaceholder: "اختر الفئة...",
    categoryGame: "🎮 وضع لعب",
    categoryTeacher: "👨‍🏫 ميزة للمعلمين",
    categoryStudent: "🎓 ميزة للطلاب",
    categoryUi: "🎨 تحسين الواجهة",
    categoryOther: "✨ أخرى",
    descriptionLabel: "صف فكرتك",
    descriptionPlaceholder: "أخبرنا عن فكرتك...",
    descriptionHint: "كلما زادت التفاصيل، كان ذلك أفضل!",
    priorityLabel: "ما أهمية هذا؟",
    priorityNice: "جيد أن يكون",
    priorityImportant: "مهم",
    priorityCritical: "ضروري!",
    submitButton: "إرسال الطلب",
    successTitle: "تم استلام الطلب!",
    successMessage: "شكرًا لمساعدتنا في تحسين Vocaband! سنراجع فكرتك.",
  },
};

const FeatureRequestModal: React.FC<FeatureRequestModalProps> = ({ isOpen, onClose }) => {
  const { language, dir } = useLanguage();
  const t = featureRequestT[language];
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "",
    description: "",
    priority: "important",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      alert(language === "he"
        ? "נא לתאר את הפיצ'ר"
        : language === "ar"
        ? "الرجاء وصف الميزة"
        : "Please describe the feature"
      );
      return;
    }

    const getCategoryLabel = () => {
      const categories = {
        game: t.categoryGame,
        teacher: t.categoryTeacher,
        student: t.categoryStudent,
        ui: t.categoryUi,
        other: t.categoryOther,
      };
      return categories[formData.category as keyof typeof categories] || formData.category;
    };

    const getPriorityLabel = () => {
      const priorities = {
        nice: t.priorityNice,
        important: t.priorityImportant,
        critical: t.priorityCritical,
      };
      return priorities[formData.priority as keyof typeof priorities] || formData.priority;
    };

    const emailBody = language === "he"
      ? `שם: ${formData.name || "לא צוין"}
אימייל: ${formData.email || "לא צוין"}
סוג פיצ'ר: ${getCategoryLabel()}
חשיבות: ${getPriorityLabel()}

תיאור:
${formData.description}`
      : language === "ar"
      ? `الاسم: ${formData.name || "لم يتم التحديد"}
البريد الإلكتروني: ${formData.email || "لم يتم التحديد"}
نوع الميزة: ${getCategoryLabel()}
الأهمية: ${getPriorityLabel()}

الوصف:
${formData.description}`
      : `Name: ${formData.name || "Not specified"}
Email: ${formData.email || "Not specified"}
Feature Type: ${getCategoryLabel()}
Priority: ${getPriorityLabel()}

Description:
${formData.description}`;

    try {
      const response = await fetch("https://www.vocaband.com/api/feature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          resetForm();
        }, 3000);
      } else {
        throw new Error("API failed");
      }
    } catch {
      const subject = encodeURIComponent(
        language === "he"
          ? "הצעת פיצ'ר חדש - Vocaband"
          : language === "ar"
          ? "اقتراح ميزة جديدة - Vocaband"
          : "Feature Request - Vocaband"
      );
      window.location.href = `mailto:contact@vocaband.com?subject=${subject}&body=${encodeURIComponent(emailBody)}`;
      onClose();
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setFormData({ name: "", email: "", category: "", description: "", priority: "important" });
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
              className="pointer-events-auto"
              className="relative w-full max-w-lg"
              dir={dir}
            >
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Lightbulb size={22} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">{t.title}</h2>
                      <p className="text-white/80 text-xs font-medium">{t.subtitle}</p>
                    </div>
                  </div>
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
                      <h3 className="text-xl font-black text-slate-800 mb-2">{t.successTitle}</h3>
                      <p className="text-sm text-slate-600">{t.successMessage}</p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          {t.nameLabel}
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t.namePlaceholder}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none transition-colors text-sm"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          {t.emailLabel}
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder={t.emailPlaceholder}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none transition-colors text-sm"
                          dir="ltr"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          {t.categoryLabel}
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none transition-colors bg-white text-sm"
                        >
                          <option value="">{t.categoryPlaceholder}</option>
                          <option value="game">{t.categoryGame}</option>
                          <option value="teacher">{t.categoryTeacher}</option>
                          <option value="student">{t.categoryStudent}</option>
                          <option value="ui">{t.categoryUi}</option>
                          <option value="other">{t.categoryOther}</option>
                        </select>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          {t.descriptionLabel} *
                        </label>
                        <textarea
                          required
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder={t.descriptionPlaceholder}
                          rows={4}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none transition-colors text-sm resize-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">{t.descriptionHint}</p>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                          <Star size={14} className="inline mr-1 text-amber-500" />
                          {t.priorityLabel}
                        </label>
                        <div className="flex gap-2">
                          {[
                            { value: "nice", label: t.priorityNice, icon: "😊" },
                            { value: "important", label: t.priorityImportant, icon: "🔥" },
                            { value: "critical", label: t.priorityCritical, icon: "⚡" },
                          ].map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, priority: p.value })}
                              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                                formData.priority === p.value
                                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              <span className="block text-lg mb-1">{p.icon}</span>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles size={18} />
                        {t.submitButton}
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

export default FeatureRequestModal;
