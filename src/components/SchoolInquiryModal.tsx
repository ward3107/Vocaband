import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../hooks/useLanguage";
import { X, Mail, Users, GraduationCap, Phone, Send, Loader2, CheckCircle2 } from "lucide-react";

interface SchoolInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SchoolInquiryModal: React.FC<SchoolInquiryModalProps> = ({ isOpen, onClose }) => {
  const { language, dir, isRTL } = useLanguage();
  const [formData, setFormData] = useState({
    schoolName: "",
    contactName: "",
    email: "",
    whatsapp: "",
    studentsCount: "",
    teachersCount: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Translations
  const t = {
    en: {
      title: "School Inquiry",
      subtitle: "Tell us about your school and we'll get back to you within 24 hours",
      schoolName: "School Name",
      schoolNamePlaceholder: "Enter your school name",
      contactName: "Contact Person",
      contactNamePlaceholder: "Your name",
      email: "Email Address",
      emailPlaceholder: "your@school.com",
      whatsapp: "WhatsApp Number",
      whatsappPlaceholder: "+1234567890",
      studentsCount: "Number of Students",
      studentsCountPlaceholder: "e.g., 500",
      teachersCount: "Number of Teachers",
      teachersCountPlaceholder: "e.g., 25",
      submit: "Send Inquiry",
      submitting: "Sending...",
      success: "Thank you! We'll contact you soon.",
      close: "Close",
      required: "Required",
    },
    he: {
      title: "פניית בית ספר",
      subtitle: "ספרו לנו על בית הספר שלכם ונחזור אליכם תוך 24 שעות",
      schoolName: "שם בית הספר",
      schoolNamePlaceholder: "הזינו את שם בית הספר",
      contactName: "איש קשר",
      contactNamePlaceholder: "השם שלך",
      email: "כתובת אימייל",
      emailPlaceholder: "your@school.com",
      whatsapp: "מספר וואטסאפ",
      whatsappPlaceholder: "+972123456789",
      studentsCount: "מספר תלמידים",
      studentsCountPlaceholder: "למשל, 500",
      teachersCount: "מספר מורים",
      teachersCountPlaceholder: "למשל, 25",
      submit: "שלח פנייה",
      submitting: "שולח...",
      success: "תודה! נחזור אליכם בהקדם.",
      close: "סגור",
      required: "נדרש",
    },
    ar: {
      title: "استعلام المدرسة",
      subtitle: "أخبرنا عن مدرستك وسنعاود الاتصال بك خلال 24 ساعة",
      schoolName: "اسم المدرسة",
      schoolNamePlaceholder: "أدخل اسم مدرستك",
      contactName: "الشخص المسؤول",
      contactNamePlaceholder: "اسمك",
      email: "البريد الإلكتروني",
      emailPlaceholder: "your@school.com",
      whatsapp: "رقم واتساب",
      whatsappPlaceholder: "+966123456789",
      studentsCount: "عدد الطلاب",
      studentsCountPlaceholder: "مثال: 500",
      teachersCount: "عدد المعلمين",
      teachersCountPlaceholder: "مثال: 25",
      submit: "إرسال الاستعلام",
      submitting: "جاري الإرسال...",
      success: "شكراً لك! سنتصل بك قريبًا.",
      close: "إغلاق",
      required: "مطلوب",
    },
  }[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Email fallback - create mailto with form data
    const subject = encodeURIComponent(`School Inquiry - ${formData.schoolName}`);
    const body = encodeURIComponent(
      `School: ${formData.schoolName}\n` +
      `Contact: ${formData.contactName}\n` +
      `Email: ${formData.email}\n` +
      `WhatsApp: ${formData.whatsapp}\n` +
      `Students: ${formData.studentsCount}\n` +
      `Teachers: ${formData.teachersCount}`
    );

    // Open email client
    window.location.href = `mailto:contact@vocaband.com?subject=${subject}&body=${body}`;

    setIsSuccess(true);
    setIsSubmitting(false);

    // Reset after 3 seconds
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      setFormData({
        schoolName: "",
        contactName: "",
        email: "",
        whatsapp: "",
        studentsCount: "",
        teachersCount: "",
      });
    }, 3000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - clickable to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal container - pointer-events-none lets clicks pass to backdrop */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto"
              dir={dir}
            >
              {/* Header */}
              <div className="relative p-6 md:p-8 border-b border-white/20">
                <button
                  onClick={onClose}
                  type="button"
                  className={`absolute top-4 ${isRTL ? "left-4" : "right-4"} w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all`}
                >
                  <X size={20} className="text-white" />
                </button>

                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <GraduationCap size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white">{t.title}</h2>
                  </div>
                </div>
                <p className="text-white/80 text-sm" dir={dir}>{t.subtitle}</p>
              </div>

              {/* Body */}
              <div className="p-6 md:p-8 bg-white">
                {isSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <CheckCircle2 size={64} className="mx-auto mb-4 text-emerald-500" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{t.success}</h3>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* School Name */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                        <GraduationCap size={16} className="text-orange-500" />
                        {t.schoolName} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t.schoolNamePlaceholder}
                        value={formData.schoolName}
                        onChange={(e) => handleChange("schoolName", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all"
                        dir={dir}
                      />
                    </div>

                    {/* Contact Name */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                        <Users size={16} className="text-orange-500" />
                        {t.contactName} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t.contactNamePlaceholder}
                        value={formData.contactName}
                        onChange={(e) => handleChange("contactName", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all"
                        dir={dir}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                        <Mail size={16} className="text-orange-500" />
                        {t.email} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder={t.emailPlaceholder}
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all"
                        dir="ltr"
                      />
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                        <Phone size={16} className="text-orange-500" />
                        {t.whatsapp} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder={t.whatsappPlaceholder}
                        value={formData.whatsapp}
                        onChange={(e) => handleChange("whatsapp", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all"
                        dir="ltr"
                      />
                    </div>

                    {/* Students Count */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                        <Users size={16} className="text-orange-500" />
                        {t.studentsCount} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder={t.studentsCountPlaceholder}
                        value={formData.studentsCount}
                        onChange={(e) => handleChange("studentsCount", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all"
                        dir="ltr"
                      />
                    </div>

                    {/* Teachers Count */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                        <GraduationCap size={16} className="text-orange-500" />
                        {t.teachersCount} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder={t.teachersCountPlaceholder}
                        value={formData.teachersCount}
                        onChange={(e) => handleChange("teachersCount", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all"
                        dir="ltr"
                      />
                    </div>

                    {/* Submit Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      type="submit"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          {t.submitting}
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          {t.submit}
                        </>
                      )}
                    </motion.button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SchoolInquiryModal;
