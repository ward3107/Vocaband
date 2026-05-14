import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Check, Copy, MessageCircle } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";

interface ClassCreatedModalProps {
  createdClassCode: string | null;
  createdClassName: string;
  copiedCode: string | null;
  setCopiedCode: React.Dispatch<React.SetStateAction<string | null>>;
  onDone: () => void;
}

export default function ClassCreatedModal({
  createdClassCode, createdClassName, copiedCode, setCopiedCode, onDone,
}: ClassCreatedModalProps) {
  const { language, dir } = useLanguage();
  const t = teacherModalsT[language];
  return (
    <AnimatePresence>
      {createdClassCode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <motion.div
            dir={dir}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ backgroundColor: 'var(--vb-surface)' }}
            className="rounded-[32px] p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center max-h-[90vh] overflow-y-auto"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                backgroundColor: 'var(--vb-accent-soft)',
                color: 'var(--vb-accent)',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--vb-text-primary)' }}>
              Class Created!
            </h2>
            <p className="mb-6" style={{ color: 'var(--vb-text-secondary)' }}>
              Share this code with your students so they can join.
            </p>

            <div
              className="p-6 rounded-3xl border-2 mb-6 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--vb-accent-soft)',
                borderColor: 'var(--vb-border)',
              }}
            >
              <p
                className="text-5xl font-mono font-black tracking-widest relative z-10"
                style={{ color: 'var(--vb-accent)' }}
              >
                {createdClassCode}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(t.classCardCopyMsg(createdClassName, createdClassCode));
                  setCopiedCode(createdClassCode);
                  setTimeout(() => setCopiedCode(null), 2000);
                }}
                style={{
                  backgroundColor: 'var(--vb-surface-alt)',
                  color: 'var(--vb-text-primary)',
                  borderColor: 'var(--vb-border)',
                }}
                className="py-4 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 hover:scale-105 border-2"
              >
                {copiedCode === createdClassCode
                  ? <Check size={20} style={{ color: 'var(--vb-accent)' }} />
                  : <Copy size={20} />
                }
                <span>{language === 'he' ? 'העתק' : language === 'ar' ? 'نسخ' : 'Copy'}</span>
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(createdClassCode || "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-4 bg-[#25D366] text-white rounded-2xl font-bold hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 hover:scale-105 shadow-lg shadow-green-100"
              >
                <MessageCircle size={20} />
                <span>{t.whatsAppShort}</span>
              </a>
            </div>

            <button
              onClick={onDone}
              style={{ color: 'var(--vb-text-secondary)' }}
              className="w-full py-4 font-bold hover:opacity-80 rounded-2xl transition-all"
            >
              {t.doneBtn}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
