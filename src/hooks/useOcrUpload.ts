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
 *      - **NEW (Phase 2): also persist the extracted words to the
 *        Vocabulary Library as a new Set so the work survives a
 *        tab-close.  Best-effort — failure is swallowed; the existing
 *        flow continues either way.**
 *      - Navigate to create-assignment if the teacher has a class.
 *
 * Mechanical extraction. Kept the full App.tsx behaviour — status UI,
 * simulated progress, audio gen, dictionary cross-check — which the
 * pre-existing useTeacherActions version didn't have.
 */
import { useCallback, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { type ClassData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import { getCachedVocabulary } from "./useVocabularyLazy";
import { trackAutoError } from "../errorTracking";
import { requestCustomWordAudio } from "../utils/requestCustomWordAudio";
import { postOcrImage, isPostOcrImageError } from "../utils/postOcrImage";
import { createSet, addWordsToSet } from "../core/vocabularyLibrary";

export interface UseOcrUploadParams {
  classes: ClassData[];
  setSelectedClass: (c: ClassData | null) => void;
  setCustomWords: Dispatch<SetStateAction<Word[]>>;
  setSelectedWords: Dispatch<SetStateAction<number[]>>;
  setSelectedLevel: (v: string) => void;
  setView: (v: string) => void;
  setIsOcrProcessing: (v: boolean) => void;
  setOcrProgress: (v: number) => void;
  setOcrStatus: (v: string) => void;
  setOcrPendingFile: (v: { file: File; inputRef: ChangeEvent<HTMLInputElement> | null } | null) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  /** Optional paywall toast helper — shown when /api/ocr returns 403
   *  ai_requires_pro.  Falls back to plain showToast when not provided
   *  (callers that haven't adopted the paywall flow keep working). */
  showPaywallToast?: (message: string) => void;
  translateWordsBatch: (words: string[]) => Promise<Map<string, { hebrew: string; arabic: string; match: number }>>;
  /** When set, extracted words are also persisted to the Vocabulary
   *  Library as a new Set owned by this teacher (Phase 2). Best-effort:
   *  if the save fails (RLS, network, etc.) the existing in-memory flow
   *  still runs. Pass `undefined` for anonymous flows like Quick Play
   *  where there's no teacher account to attach the Set to. */
  teacherUid?: string;
}

export function useOcrUpload(params: UseOcrUploadParams) {
  const {
    classes, setSelectedClass,
    setCustomWords, setSelectedWords, setSelectedLevel, setView,
    setIsOcrProcessing, setOcrProgress, setOcrStatus, setOcrPendingFile,
    showToast, showPaywallToast, translateWordsBatch,
    teacherUid,
  } = params;

  // Step 2: User confirms from the preview → run OCR
  const processOcrFile = useCallback(async (
    fileToProcess: File,
    originalEvent?: ChangeEvent<HTMLInputElement> | null,
  ) => {
    setOcrPendingFile(null);
    setIsOcrProcessing(true);

    try {
      // Shared HTTP plumbing (compression, auth, fetch, error handling)
      // lives in postOcrImage so the Hebrew pipeline can share it.
      // English-specific post-processing (translate, cross-check,
      // custom-word audio gen, navigation) stays here.
      let ocrResult;
      try {
        ocrResult = await postOcrImage(fileToProcess, "en", {
          onProgress: setOcrProgress,
          onStatus: setOcrStatus,
        });
      } catch (err) {
        if (isPostOcrImageError(err)) {
          if (err.isPaywall && showPaywallToast) {
            showPaywallToast(err.message);
            const paywallErr = new Error(err.message);
            (paywallErr as Error & { _paywallShown?: true })._paywallShown = true;
            throw paywallErr;
          }
          throw new Error(err.message);
        }
        throw err;
      }

      const extractedWords = ocrResult.words;
      const rawText = ocrResult.rawText;

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

        // ── Phase 2: persist to the Vocabulary Library ──────────────
        // Best-effort save so an OCR extraction is no longer ephemeral.
        // Runs in the background; the existing flow doesn't wait on it.
        // Failure is silent (logged for telemetry) — the in-memory
        // customWords state stays valid and the teacher's working
        // session is unaffected.
        let savedSetName: string | null = null;
        if (teacherUid) {
          try {
            const today = new Date().toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            const setName = `Photo · ${today}`;
            const newSet = await createSet({
              teacherUid,
              name: setName,
              sourceType: "ocr_image",
              languagePair: "en-he-ar",
              emoji: "📷",
            });
            await addWordsToSet(
              newSet.id,
              customWordsFromOCR.map((w, idx) => ({
                position: idx,
                english: w.english,
                hebrew: w.hebrew || null,
                arabic: w.arabic || null,
                partOfSpeech: null,
                difficulty: null,
                curriculumWordId: null,
                audioUrl: null,
                metadata: {},
              }))
            );
            savedSetName = newSet.name;
          } catch (saveErr) {
            // Silent — the user still gets the in-memory flow.
            // Logged so we can spot RLS or schema regressions early.
            console.warn("[useOcrUpload] library save failed:", saveErr);
          }
        }

        // Navigate to create-assignment view so user can see the matched words
        if (classes.length > 0) {
          setSelectedClass(classes[0]);
          setView("create-assignment");
        }

        const unknownCount = customWordsFromOCR.length - knownCustomIds.length;
        const baseMsg = knownCustomIds.length > 0 && unknownCount > 0
          ? `Found ${customWordsFromOCR.length} words — ${knownCustomIds.length} curriculum matches auto-selected, ${unknownCount} need review.`
          : `Found ${customWordsFromOCR.length} words from the image!`;
        const successMsg = savedSetName
          ? `${baseMsg} 📚 Saved to your Library as "${savedSetName}".`
          : baseMsg;
        showToast(successMsg, "success");
      }
    } catch (err) {
      // Paywall toast was already shown above (with Upgrade button) --
      // skip the generic "...Please try again" toast that would muddle
      // the message.  The sentinel is set inside the response.ok block.
      if ((err as { _paywallShown?: true })?._paywallShown) {
        // already toasted
      } else if (err instanceof DOMException && err.name === 'AbortError') {
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
    showToast, showPaywallToast, translateWordsBatch, teacherUid,
  ]);

  const handleOcrUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    processOcrFile(rawFile, e);
  }, [processOcrFile]);

  return { handleOcrUpload, processOcrFile };
}
