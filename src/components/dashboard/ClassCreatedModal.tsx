import type { Dispatch, SetStateAction } from 'react';
import { Check, Copy, MessageCircle } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";
import ModalShell, { ModalPrimaryButton } from "../ui/ModalShell";

interface ClassCreatedModalProps {
  createdClassCode: string | null;
  createdClassName: string;
  copiedCode: string | null;
  setCopiedCode: Dispatch<SetStateAction<string | null>>;
  onDone: () => void;
}

/**
 * "Class created!" success modal — success-variant shell with the
 * generated join code as the visual hero and Copy + WhatsApp share
 * buttons under it.  Footer single CTA dismisses the modal.
 */
export default function ClassCreatedModal({
  createdClassCode,
  createdClassName,
  copiedCode,
  setCopiedCode,
  onDone,
}: ClassCreatedModalProps) {
  const { language, dir } = useLanguage();
  const t = teacherModalsT[language];

  return (
    <ModalShell
      open={!!createdClassCode}
      onClose={onDone}
      variant="success"
      icon="🎉"
      title={language === "he" ? "הכיתה נוצרה!" : language === "ar" ? "تم إنشاء الصف!" : "Class created!"}
      subtitle={
        language === "he"
          ? "שתפו את הקוד הזה עם התלמידים"
          : language === "ar"
            ? "شارك هذا الرمز مع طلابك"
            : "Share this code with your students so they can join."
      }
      dir={dir}
      footer={<ModalPrimaryButton onClick={onDone} className="w-full justify-center">{t.doneBtn}</ModalPrimaryButton>}
    >
      {createdClassCode && (
        <>
          {/* Big join-code hero — frosted mint surface so the eye
              lands on the 8-char code first. */}
          <div
            className="rounded-2xl px-6 py-7 mb-5 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(94,201,166,0.18), rgba(63,166,137,0.10))",
              border: "1px solid rgba(94,201,166,0.30)",
            }}
          >
            <p
              className="text-5xl font-mono font-black tracking-[0.25em]"
              style={{ color: "#1F5A4A" }}
            >
              {createdClassCode}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(t.classCardCopyMsg(createdClassName, createdClassCode));
                setCopiedCode(createdClassCode);
                setTimeout(() => setCopiedCode(null), 2000);
              }}
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent" as never,
                background: "#FFFFFF",
                border: "1px solid rgba(99,102,241,0.10)",
                color: "#1F1147",
                boxShadow: "0 4px 14px -8px rgba(99,102,241,0.3)",
              }}
              className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-bold transition-transform active:scale-95"
            >
              {copiedCode === createdClassCode ? (
                <Check size={18} className="text-emerald-500" />
              ) : (
                <Copy size={18} />
              )}
              <span>{language === "he" ? "העתק" : language === "ar" ? "نسخ" : "Copy"}</span>
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(t.classCardCopyMsg(createdClassName, createdClassCode))}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent" as never,
                background: "#25D366",
                boxShadow: "0 10px 22px -10px rgba(37,211,102,0.55)",
              }}
              className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-bold text-white transition-transform active:scale-95"
            >
              <MessageCircle size={18} />
              <span>{t.whatsAppShort}</span>
            </a>
          </div>
        </>
      )}
    </ModalShell>
  );
}
