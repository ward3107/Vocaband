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
            className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center max-h-[90vh] overflow-y-auto"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2">{t.classCreatedTitle}</h2>
            <p className="text-stone-500 mb-6">{t.classCreatedBlurb}</p>

            <div className="bg-gradient-to-br from-blue-50 to-stone-50 p-6 rounded-3xl border-2 border-blue-100 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-stone-100 rounded-full -ml-8 -mb-8 opacity-50"></div>
              <p className="text-5xl font-mono font-black text-blue-700 tracking-widest relative z-10">{createdClassCode}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(t.classCardCopyMsg(createdClassName, createdClassCode));
                  setCopiedCode(createdClassCode);
                  setTimeout(() => setCopiedCode(null), 2000);
                }}
                className="py-4 bg-stone-100 text-stone-700 rounded-2xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center gap-2 hover:scale-105 border-2 border-blue-200"
              >
                {copiedCode === createdClassCode ? <Check size={20} className="text-blue-700" /> : <Copy size={20} />}
                <span>{t.copyShort}</span>
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
              className="w-full py-4 text-stone-500 font-bold hover:text-stone-700 hover:bg-stone-50 rounded-2xl transition-all"
            >
              {t.doneBtn}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
