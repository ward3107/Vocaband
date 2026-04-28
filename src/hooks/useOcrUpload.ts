/**
 * useOcrUpload — the teacher-side OCR pipeline for turning a photo of
 * a word list into a Custom Words tab ready to drop into an assignment.
 *
 * Flow:
 *   1. `handleOcrUpload(e)` — entry from the file input `onChange`.
 *      Grabs the first File and kicks processOcrFile.
 *   2. `processOcrFile(file, originalEvent?)` — the heavy lifter:
 *      - Compress the image client-side (keeps Worker payload modest).
 *      - POST to /api/ocr (Cloudflare Worker wraps the vendor vision
 *        API and returns an `english[]` word list).
 *      - Simulated progress bar + status messages so the teacher sees
 *        something happening during the 5-15s server round-trip.
 *      - Auto-translate the extracted words to HE/AR in one batch
 *        via useTranslate.
 *      - Dictionary cross-check against ALL_WORDS — curriculum matches
 *        are auto-selected, unknown words (possible hallucinations)
 *        are added but left unchecked for the teacher to review.
 *      - Fire Neural2 audio generation for the custom words so
 *        students hear real pronunciations in-game.
 *      - Navigate to create-assignment if the teacher has a class.
 *
 * Mechanical extraction. Kept the full App.tsx behaviour — status UI,
 * simulated progress, audio gen, dictionary cross-check — which the
 * pre-existing useTeacherActions version didn't have.
 */
import { useCallback } from "react";
import { supabase, type ClassData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import { getCachedVocabulary } from "./useVocabularyLazy";
import { trackAutoError } from "../errorTracking";
import { compressImageForUpload } from "../utils/compressImage";
import { requestCustomWordAudio } from "../utils/requestCustomWordAudio";

export interface UseOcrUploadParams {
  classes: ClassData[];
  setSelectedClass: (c: ClassData | null) => void;
  setCustomWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedLevel: (v: string) => void;
  setView: (v: string) => void;
  setIsOcrProcessing: (v: boolean) => void;
  setOcrProgress: (v: number) => void;
  setOcrStatus: (v: string) => void;
  setOcrPendingFile: (v: { file: File; inputRef: React.ChangeEvent<HTMLInputElement> | null } | null) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  translateWordsBatch: (words: string[]) => Promise<Map<string, { hebrew: string; arabic: string; match: number }>>;
}

export function useOcrUpload(params: UseOcrUploadParams) {
  const {
    classes, setSelectedClass,
    setCustomWords, setSelectedWords, setSelectedLevel, setView,
    setIsOcrProcessing, setOcrProgress, setOcrStatus, setOcrPendingFile,
    showToast, translateWordsBatch,
  } = params;

  // Step 2: User confirms from the preview → run OCR
  const processOcrFile = useCallback(async (
    fileToProcess: File,
    originalEvent?: React.ChangeEvent<HTMLInputElement> | null,
  ) => {
    setOcrPendingFile(null);
    setIsOcrProcessing(true);
    setOcrProgress(5);
    setOcrStatus("Compressing image...");

    try {
      const file = await compressImageForUpload(fileToProcess);
      const fileSizeKB = Math.round(file.size / 1024);
      setOcrProgress(10);
      setOcrStatus(`Uploading image... (${fileSizeKB} KB)`);

      // Get auth token for teacher authentication
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { showToast("Please sign in again.", "error"); return; }

      // OCR runs directly in the Cloudflare Worker (same-origin, no Render,
      // no CORS, no cold starts). The Worker calls Claude Vision API.
      const formData = new FormData();
      formData.append('file', file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s

      // Simulate smooth progress during the API call (10% → 85%)
      let simProgress = 15;
      setOcrProgress(15);
      const progressInterval = setInterval(() => {
        simProgress += (85 - simProgress) * 0.08;
        setOcrProgress(Math.round(simProgress));
      }, 400);

      // Update status while waiting
      const statusTimer1 = setTimeout(() => setOcrStatus("Analyzing with AI..."), 2000);
      const statusTimer2 = setTimeout(() => setOcrStatus("Extracting words..."), 6000);

      let response: Response;
      try {
        response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
        clearTimeout(statusTimer1);
        clearTimeout(statusTimer2);
        clearInterval(progressInterval);
      }

      setOcrProgress(88);
      setOcrStatus("Processing results...");

      if (!response.ok) {
        let errorMessage = `OCR failed (${response.status})`;
        try {
          const errorData = await response.json();
          // Prefer the detailed 'message' field (which has the actual
          // vendor error reason) over the generic 'error' field.
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch { /* response wasn't JSON */ }
        throw new Error(errorMessage);
      }

      let ocrData: { words?: string[]; raw_text?: string };
      try {
        ocrData = await response.json();
      } catch {
        throw new Error('Server returned an invalid response. Please try again.');
      }
      setOcrProgress(95);

      // Extract words from the OCR service response
      // The service already returns English-only words (filtered by regex on server)
      const extractedWords = ocrData.words || [];
      const rawText = ocrData.raw_text || '';

      // Dictionary cross-check to catch vision-model hallucinations. Any OCR
      // result that matches a curriculum word (ALL_WORDS, ~9k entries) is
      // treated as high confidence; anything else could be a ghost word the
      // model made up, or a legitimate non-curriculum word (proper noun,
      // slang). We keep BOTH in the custom words list so teachers don't
      // lose real words, but only auto-select the known ones. Unknown
      // words show up unchecked so the teacher can dismiss obvious
      // nonsense with a glance instead of it silently joining the
      // assignment.
      const normalizeWord = (w: string) => w.toLowerCase().trim();
      const knownEnglishSet = new Set((getCachedVocabulary()?.ALL_WORDS ?? []).map(w => normalizeWord(w.english)));
      const isKnownWord = (w: string) => knownEnglishSet.has(normalizeWord(w));

      // Auto-translate OCR words to Hebrew + Arabic via the same
      // /api/translate endpoint the paste flow uses. Done BEFORE creating
      // the Word objects so the translations land on first render.
      // Failure is silent — teachers see a "Translate" button per word
      // as the fallback.
      setOcrStatus("Translating to Hebrew + Arabic…");
      const translations = await translateWordsBatch(extractedWords);

      const customWordsFromOCR: Word[] = extractedWords.map((word: string, index: number) => {
        const t = translations.get(word.toLowerCase().trim());
        return {
          id: Date.now() + index,
          english: word,
          hebrew: t?.hebrew || '',
          arabic: t?.arabic || '',
          level: 'Custom',
          recProd: 'Prod',
        };
      });

      if (customWordsFromOCR.length === 0) {
        showToast(
          rawText
            ? `No English words found. AI saw: "${rawText.substring(0, 120)}${rawText.length > 120 ? '...' : ''}"`
            : "No words found — the image may be unclear. Try a closer photo with better lighting.",
          "error"
        );
      } else {
        // Add all detected words to the Custom tab, but only auto-select the
        // ones that match our curriculum dictionary. Unknown words (possible
        // hallucinations) appear unchecked for the teacher to review.
        setCustomWords(customWordsFromOCR);
        setSelectedLevel("Custom");
        const knownCustomIds = customWordsFromOCR
          .filter(w => isKnownWord(w.english))
          .map(w => w.id);
        const autoSelectIds = knownCustomIds.length > 0
          ? knownCustomIds
          : customWordsFromOCR.map(w => w.id);
        setSelectedWords(autoSelectIds);

        // Fire off Neural2 audio generation so students hear real pronunciations.
        void requestCustomWordAudio(customWordsFromOCR);

        // Navigate to create-assignment view so user can see the matched words
        if (classes.length > 0) {
          setSelectedClass(classes[0]);
          setView("create-assignment");
        }

        const unknownCount = customWordsFromOCR.length - knownCustomIds.length;
        const successMsg = knownCustomIds.length > 0 && unknownCount > 0
          ? `Found ${customWordsFromOCR.length} words — ${knownCustomIds.length} curriculum matches auto-selected, ${unknownCount} need review.`
          : `Found ${customWordsFromOCR.length} words from the image!`;
        showToast(successMsg, "success");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        showToast("OCR timed out — the image may be too complex. Try a clearer photo or a smaller area.", "error");
      } else {
        trackAutoError(err, 'OCR processing failed');
        const errorMessage = err instanceof Error ? err.message : 'Error processing image';
        console.error('OCR error:', errorMessage);
        showToast(`${errorMessage}. Please try again.`, "error");
      }
    } finally {
      setIsOcrProcessing(false);
      setOcrProgress(0);
      setOcrStatus("");
      // Reset the file input so the same file can be uploaded again if needed
      if (originalEvent?.target) originalEvent.target.value = '';
    }
  }, [
    classes, setSelectedClass,
    setCustomWords, setSelectedWords, setSelectedLevel, setView,
    setIsOcrProcessing, setOcrProgress, setOcrStatus, setOcrPendingFile,
    showToast, translateWordsBatch,
  ]);

  const handleOcrUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    processOcrFile(rawFile, e);
  }, [processOcrFile]);

  return { handleOcrUpload, processOcrFile };
}
