/**
 * WorksheetShareCard — QR + link + Copy/WhatsApp/Save buttons for an
 * interactive worksheet slug. Reused from ShareWorksheetDialog (after
 * a fresh mint) and WorksheetAttemptsView (so a teacher can re-share
 * an existing worksheet without remounting the share dialog).
 *
 * Image / PDF download is rendered straight off the QR matrix so we
 * don't need an extra rasteriser dependency — jspdf is already in the
 * tree for the gradebook export, so the PDF branch reuses it.
 */
import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { Check, Copy, Download, FileText, MessageCircle, Share2 } from "lucide-react";
import { jsPDF } from "jspdf";
import type { shareWorksheetT } from "../locales/teacher/share-worksheet";

type ShareStrings = (typeof shareWorksheetT)["en"];

interface Props {
  slug: string;
  topicName: string;
  t: ShareStrings;
}

// QR module → PNG dataURL via an offscreen canvas. Kept inline so the
// component doesn't take a runtime dep on qrcode.react (we already
// have qrcode-generator for the SVG render path).
const qrMatrixToPngDataUrl = (
  qr: ReturnType<typeof qrcode>,
  pixelSize = 12,
  margin = 32,
): string => {
  const moduleCount = qr.getModuleCount();
  const size = moduleCount * pixelSize + margin * 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(margin + c * pixelSize, margin + r * pixelSize, pixelSize, pixelSize);
      }
    }
  }
  return canvas.toDataURL("image/png");
};

// Safe filename slug — strips characters that would break Windows /
// macOS save dialogs while keeping unicode topic names readable.
const safeFilename = (topic: string): string =>
  topic
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60) || "worksheet";

const triggerDownload = (dataUrl: string, filename: string) => {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const WorksheetShareCard: React.FC<Props> = ({ slug, topicName, t }) => {
  const shareUrl = `${window.location.origin}/w/${slug}`;
  const [copied, setCopied] = useState(false);

  const qr = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(shareUrl);
    q.make();
    return q;
  }, [shareUrl]);

  const qrSvgMarkup = useMemo(
    () => qr.createSvgTag({ cellSize: 4, margin: 1, scalable: true }),
    [qr],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(t.copyPromptTitle, shareUrl);
    }
  };

  const handleWhatsApp = () => {
    const text = t.whatsappText(topicName, shareUrl);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share !== "function") {
      handleWhatsApp();
      return;
    }
    try {
      await navigator.share({
        title: t.nativeShareTitle(topicName),
        text: t.nativeShareText,
        url: shareUrl,
      });
    } catch {
      /* user cancelled */
    }
  };

  const handleDownloadPng = () => {
    const dataUrl = qrMatrixToPngDataUrl(qr);
    if (!dataUrl) return;
    triggerDownload(dataUrl, `${safeFilename(topicName)}-qr.png`);
  };

  const handleDownloadPdf = () => {
    const dataUrl = qrMatrixToPngDataUrl(qr);
    if (!dataUrl) return;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text(topicName, pageWidth / 2, 30, { align: "center", maxWidth: pageWidth - 20 });
    const qrSizeMm = 110;
    pdf.addImage(dataUrl, "PNG", (pageWidth - qrSizeMm) / 2, 55, qrSizeMm, qrSizeMm);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.text(shareUrl, pageWidth / 2, 185, { align: "center", maxWidth: pageWidth - 20 });
    pdf.setFontSize(10);
    pdf.setTextColor(120);
    pdf.text("vocaband.com", pageWidth / 2, 200, { align: "center" });
    pdf.save(`${safeFilename(topicName)}-qr.pdf`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center bg-white rounded-xl border border-stone-200 p-4">
        <div
          className="w-44 h-44"
          aria-label={t.qrAria}
          dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
        />
      </div>

      <div className="rounded-xl bg-stone-50 border border-stone-200 px-3 py-3">
        <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-1">
          {t.linkLabel}
        </p>
        <p className="font-mono text-sm break-all text-stone-800">{shareUrl}</p>
        <p className="text-xs text-stone-500 mt-1">{t.expiresNote}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center gap-2 transition-all"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? t.copiedBtn : t.copyBtn}
        </button>
        <button
          type="button"
          onClick={handleWhatsApp}
          className="py-2.5 rounded-xl bg-[#25D366] hover:opacity-90 text-white font-bold flex items-center justify-center gap-2 transition-all"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <MessageCircle size={16} />
          {t.whatsappBtn}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleDownloadPng}
          className="py-2.5 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 font-bold flex items-center justify-center gap-2 transition-all"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <Download size={16} />
          {t.downloadPngBtn}
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="py-2.5 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 font-bold flex items-center justify-center gap-2 transition-all"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <FileText size={16} />
          {t.downloadPdfBtn}
        </button>
      </div>

      {typeof navigator.share === "function" && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="w-full py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold flex items-center justify-center gap-2 transition-all border border-stone-200"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <Share2 size={16} />
          {t.moreShareBtn}
        </button>
      )}

      <button
        type="button"
        onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}
        className="w-full text-center text-sm font-bold text-emerald-700 hover:text-emerald-900 py-1"
      >
        {t.openAsStudent}
      </button>
    </div>
  );
};

export default WorksheetShareCard;
