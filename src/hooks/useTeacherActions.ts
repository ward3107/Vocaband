import React from "react";
import {
  supabase,
  mapClass,
  mapAssignment,
  mapProgress,
  handleDbError,
  hasTeacherAccess,
  OperationType,
  ASSIGNMENT_COLUMNS,
  type AppUser,
  type ClassData,
  type AssignmentData,
  type ProgressData,
} from "../core/supabase";
import type { Word } from "../data/vocabulary";
import { getCachedVocabulary, ensureVocabulary } from "./useVocabularyLazy";
import { chunkArray } from "../utils";
import { trackAutoError } from "../errorTracking";
import { compressImageForUpload } from "../utils/compressImage";
import { logAudit } from "../utils/audit";
import { pushNotify } from "../utils/pushNotify";
import { isPro, FREE_TIER_LIMITS } from "../core/plan";
import { createCompetition } from "./useCompetitions";

export interface UseTeacherActionsParams {
  user: AppUser | null;
  /** The Voca tab the teacher is currently on.  Drives the `subject`
   *  column written when creating new classes/assignments so the row
   *  shows up on the right tab.  Null is read as 'english' (the DB
   *  default and the legacy behaviour). */
  activeVoca?: "english" | "hebrew" | null;
  classes: ClassData[];
  setClasses: React.Dispatch<React.SetStateAction<ClassData[]>>;
  newClassName: string;
  setNewClassName: (v: string) => void;
  setCreatedClassCode: (v: string | null) => void;
  setCreatedClassName: (v: string) => void;
  setShowCreateClassModal: (v: boolean) => void;
  selectedClass: ClassData | null;
  setSelectedClass: (v: ClassData | null) => void;
  editingAssignment: AssignmentData | null;
  setEditingAssignment: React.Dispatch<React.SetStateAction<AssignmentData | null>>;
  selectedWords: number[];
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  customWords: Word[];
  setCustomWords: React.Dispatch<React.SetStateAction<Word[]>>;
  selectedLevel: string;
  setSelectedLevel: (v: string) => void;
  assignmentTitle: string;
  setAssignmentTitle: (v: string) => void;
  assignmentDeadline: string;
  setAssignmentDeadline: (v: string) => void;
  assignmentModes: string[];
  setAssignmentModes: (v: string[]) => void;
  assignmentSentences: string[];
  setAssignmentSentences: (v: string[]) => void;
  sentenceDifficulty: number;
  setSentenceDifficulty: (v: 1 | 2 | 3 | 4) => void;
  setAssignmentStep: (v: number) => void;
  setIsOcrProcessing: (v: boolean) => void;
  setOcrProgress: (v: string | number) => void;
  teacherAssignments: AssignmentData[];
  setTeacherAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  setTeacherAssignmentsLoading: (v: boolean) => void;
  pendingStudents: Array<{ id: string; displayName: string; classCode: string; className: string; joinedAt: string }>;
  setPendingStudents: React.Dispatch<React.SetStateAction<Array<{ id: string; displayName: string; classCode: string; className: string; joinedAt: string }>>>;
  allScores: ProgressData[];
  setAllScores: React.Dispatch<React.SetStateAction<ProgressData[]>>;
  setClassStudents: React.Dispatch<React.SetStateAction<{ name: string; classCode: string; lastActive: string }[]>>;
  setGlobalLeaderboard: React.Dispatch<React.SetStateAction<{ name: string; score: number; avatar: string }[]>>;
  setActiveAssignment: (v: AssignmentData | null) => void;
  setAssignmentWords: (v: Word[]) => void;
  setShowModeSelection: (v: boolean) => void;
  setConfirmDialog: (v: { show: boolean; message: string; onConfirm: () => void }) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  setView: (v: string) => void;
  lastFetchRef: React.MutableRefObject<Record<string, number>>;
}

export function useTeacherActions(params: UseTeacherActionsParams) {
  const {
    user, activeVoca, classes, setClasses,
    newClassName, setNewClassName,
    setCreatedClassCode, setCreatedClassName, setShowCreateClassModal,
    selectedClass, setSelectedClass,
    editingAssignment, setEditingAssignment,
    selectedWords, setSelectedWords,
    customWords, setCustomWords,
    setSelectedLevel,
    assignmentTitle, setAssignmentTitle,
    assignmentDeadline, setAssignmentDeadline,
    assignmentModes, setAssignmentModes,
    assignmentSentences, setAssignmentSentences,
    sentenceDifficulty, setSentenceDifficulty,
    setAssignmentStep,
    setIsOcrProcessing, setOcrProgress,
    setTeacherAssignments, setTeacherAssignmentsLoading,
    setPendingStudents,
    setAllScores,
    setClassStudents, setGlobalLeaderboard,
    setActiveAssignment, setAssignmentWords, setShowModeSelection,
    setConfirmDialog, showToast, setView,
    lastFetchRef,
  } = params;

  const handleCreateClass = async () => {
    if (!newClassName || !user) return;

    // Free-tier gate: 1 class max.  Pro/School/trialing teachers are
    // unlimited.  This is the client-side gate; server-side enforcement
    // is a follow-up (RLS or RPC) per docs/PRICING-MODEL.md Status.
    if (!isPro(user) && classes.length >= FREE_TIER_LIMITS.MAX_CLASSES) {
      showToast(
        `Free plan is limited to ${FREE_TIER_LIMITS.MAX_CLASSES} class. Upgrade to Pro for unlimited classes.`,
        "error",
      );
      setShowCreateClassModal(false);
      return;
    }

    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I to avoid confusion
    const randomValues = crypto.getRandomValues(new Uint32Array(8));
    const code = Array.from(randomValues)
      .map(x => {
        // Rejection sampling to avoid modulo bias
        const limit = Math.floor(0x100000000 / alphabet.length) * alphabet.length;
        let val = x;
        while (val >= limit) {
          val = crypto.getRandomValues(new Uint32Array(1))[0];
        }
        return alphabet[val % alphabet.length];
      })
      .join("");
    const newClass = {
      name: newClassName,
      teacherUid: user.uid,
      code: code
    };

    try {
      const subjectForInsert = activeVoca ?? 'english';
      const { data: docRow, error } = await supabase
        .from('classes')
        .insert({
          name: newClass.name,
          teacher_uid: newClass.teacherUid,
          code: newClass.code,
          subject: subjectForInsert,
        })
        .select()
        .single();
      if (error) throw error;
      setClasses([...classes, mapClass(docRow)]);
      setCreatedClassName(newClass.name);
      setShowCreateClassModal(false);
      setNewClassName("");
      setCreatedClassCode(code);
    } catch (error) {
      console.error("Error creating class:", error);
      showToast("Failed to create class.", "error");
    }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    // Pro-only feature.  The button that triggers this should already be
    // hidden for Free users (see ConfigureStep), but keep the gate here
    // too — the file input is not always reachable through that single
    // button (paste-from-clipboard, drag-drop, etc.) and we don't want
    // a tech-savvy Free user to bypass via the DOM.
    if (!isPro(user)) {
      showToast(
        "Camera scanning of word lists is a Pro feature. Upgrade to use it.",
        "error",
      );
      // Reset the input so the same file can be retried after upgrade
      e.target.value = "";
      return;
    }

    setIsOcrProcessing(true);
    setOcrProgress(5); // Starting compression

    try {
      // Compress large mobile photos (3-12 MB → ~1-2 MB) before upload.
      // No client-side size check — compression handles all sizes, and
      // the server's multer limit (15 MB) is the real safety net.
      const file = await compressImageForUpload(rawFile);
      setOcrProgress(10);

      // Get auth token for teacher authentication
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { showToast("Please sign in again.", "error"); return; }

      // Create FormData with the (possibly compressed) image file
      const formData = new FormData();
      formData.append('file', file);

      // OCR target — same-origin /api/ocr.  Cloudflare Worker
      // proxies to Fly.io (api.vocaband.com / Render is gone post
      // 2026-04-25 migration).  Worker timeout 30s; Gemini Vision
      // typically completes in 5-15s.
      //
      // Hardcoded — was previously conditional on VITE_API_URL
      // ("set this env var to bypass the Worker for long jobs").
      // The conditional was a footgun: if Cloudflare Pages or a
      // stale .env.local set VITE_API_URL to the dead Render URL,
      // every OCR request hit api.vocaband.com → ERR_CONNECTION_CLOSED
      // and the user saw a silent failure with no diagnostic.
      // Hardcoding /api/ocr removes that ambiguity completely.
      const ocrUrl = '/api/ocr';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90_000); // 90s for OCR

      // Simulate smooth progress during the API call (10% → 85%)
      let simProgress = 10;
      const progressInterval = setInterval(() => {
        simProgress += (85 - simProgress) * 0.08;
        setOcrProgress(Math.round(simProgress));
      }, 400);

      let response: Response;
      try {
        response = await fetch(ocrUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
        clearInterval(progressInterval);
      }

      setOcrProgress(88);

      if (!response.ok) {
        let errorMessage = `OCR failed (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch { /* response wasn't JSON */ }
        throw new Error(errorMessage);
      }

      let ocrData: any;
      try {
        ocrData = await response.json();
      } catch {
        throw new Error('Server returned an invalid response. Please try again.');
      }
      setOcrProgress(95); // Processing complete

      // Extract words from the OCR service response
      // The service already returns English-only words (filtered by regex on server)
      const extractedWords = ocrData.words || [];
      const rawText = ocrData.raw_text || '';

      console.log('OCR service response:', ocrData);
      console.log('Extracted English words:', extractedWords);
      console.log('Raw text for reference:', rawText.substring(0, 100) + '...');

      // Create Word objects for custom assignment
      const customWordsFromOCR: Word[] = extractedWords.map((word: string, index: number) => ({
        id: Date.now() + index, // Generate unique ID
        english: word,
        hebrew: '', // Leave empty - user can add later
        arabic: '',
        level: 'Custom',
        recProd: 'Prod'
      }));

      console.log('Created custom words count:', customWordsFromOCR.length);
      if (customWordsFromOCR.length > 0) {
        console.log('Custom words:', customWordsFromOCR.map(w => w.english));
      }

      if (customWordsFromOCR.length === 0) {
        if (rawText.trim().length === 0) {
          showToast(
            "OCR couldn't read any text. Make sure the photo is clear, well-lit, and the page is flat.",
            "error"
          );
        } else {
          showToast(
            `OCR found text but no English words. Read: "${rawText.substring(0, 80)}${rawText.length > 80 ? '…' : ''}"`,
            "info"
          );
        }
        trackAutoError(new Error("OCR returned no words"), "OCR empty result", {
          rawTextLength: rawText.length,
        });
      } else {
        // Add all detected words to the Custom tab and select them
        setCustomWords(customWordsFromOCR);
        setSelectedLevel("Custom");
        setSelectedWords(customWordsFromOCR.map(w => w.id));

        // Navigate to create-assignment view so user can see the matched words
        if (classes.length > 0) {
          setSelectedClass(classes[0]);
          setView("create-assignment");
        }

        showToast(`Found ${customWordsFromOCR.length} words from the image!`, "success");
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
      // Reset the file input so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  const handleSaveAssignment = async (
    wordsOverride?: number[],
    modesOverride?: string[],
    enableCompetition?: boolean,
  ) => {
    // Use override values if provided (e.g. from SetupWizard completion)
    // so the wizard's latest in-memory picks take effect even if they
    // haven't flushed to state yet. Otherwise fall back to state.
    const wordsToCheck = wordsOverride ?? selectedWords;
    const modesToCheck = modesOverride ?? assignmentModes;

    // For editing, allow custom-only assignments
    const hasWords = editingAssignment
      ? wordsToCheck.length > 0 || customWords.length > 0
      : wordsToCheck.length > 0;

    if (!selectedClass || !hasWords || !assignmentTitle) {
      showToast("Please enter a title and select words.", "error");
      return;
    }

    // Check if there's at least one database word (not custom/session-only)
    // For creating new assignments, require at least one database word
    // For editing, allow custom-only assignments
    const hasDbWords = wordsToCheck.some(id => id > 0);
    if (!hasDbWords && !editingAssignment) {
      showToast("Please select at least one word from the vocabulary database.", "error");
      return;
    }
    // For editing, if no database words, ensure we have at least one custom word
    if (!hasDbWords && editingAssignment && customWords.length === 0 && wordsToCheck.length === 0) {
      showToast("Please select at least one word (database or custom).", "error");
      return;
    }

    // Source of truth for the `words` JSONB column.  English assignments
    // pull from ALL_WORDS + the teacher's session-scoped custom words.
    // Hebrew assignments pull from the static HEBREW_LEMMAS corpus —
    // its row shape (lemmaNiqqud/shoresh/etc.) is intentionally different
    // from Word; the student-side renderer disambiguates via the
    // assignment's `subject` column.
    //
    // Lemma ids do collide with English Word ids (both start at 1) —
    // this is fine because the assignment row's subject column is the
    // single source of truth for which corpus to look up against.
    const isHebrewClass = selectedClass.subject === 'hebrew';
    // Lemma/Word objects collapse to a structural { id: number } match
    // for the dedup + filter step below.  The `unknown` hop is needed
    // because Word and HebrewLemma don't share a base type, even though
    // both expose `id`.
    //
    // The Hebrew lemma corpus (vocabulary-hebrew) is large and only
    // needed the moment a teacher saves a Hebrew assignment, so it's
    // dynamic-imported here rather than statically.  A static import
    // dragged the whole corpus onto the shared app-shell chunk that
    // EVERY login (including students, who never touch this handler)
    // had to download — a major login-latency regression.
    let allPossibleWords: ReadonlyArray<{ id: number }>;
    if (isHebrewClass) {
      const { HEBREW_LEMMAS } = await import("../data/vocabulary-hebrew");
      allPossibleWords = HEBREW_LEMMAS as unknown as ReadonlyArray<{ id: number }>;
    } else {
      // AWAIT the corpus — never `getCachedVocabulary()?.ALL_WORDS ?? []`.
      // This is a WRITE path: on a cold cache the `?? []` default silently
      // reduced `allPossibleWords` to just `customWords`, so every
      // curriculum word the teacher picked was dropped from the `words`
      // JSONB and the row persisted as `words: []`.  The student side
      // then resolved that to zero words and the game substituted a
      // generic Set-2 sample — the "student sees the demo list" bug.
      // The Hebrew branch above already awaited its corpus; this one
      // silently didn't.
      const { ALL_WORDS } = getCachedVocabulary() ?? (await ensureVocabulary());
      allPossibleWords = [...ALL_WORDS, ...customWords] as ReadonlyArray<{ id: number }>;
    }
    const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
    const wordsToCheckSet = new Set(wordsToCheck);
    const wordsToSave = uniqueWords.filter(w => wordsToCheckSet.has(w.id));

    // Refuse to persist an assignment whose word list resolved to nothing.
    // The validation above only proved the teacher SELECTED ids; this
    // proves those ids actually resolved against a corpus. Saving anyway
    // produces a row that looks valid to the teacher but is unplayable
    // for students, which is exactly how the bad rows got created.
    if (wordsToSave.length === 0) {
      showToast(
        "Could not load the vocabulary for these words. Please check your connection and try saving again.",
        "error",
      );
      return;
    }

    const assignmentData = {
      classId: selectedClass.id,
      // word_ids carries ONLY ids that actually resolved against a corpus and
      // are not custom. The old `id > 0` test was not enough: the vocabulary
      // library mints synthetic custom ids as `100_000_000 + Math.abs(hash)`
      // (LibrarySetsPanel), which are POSITIVE, so they flowed into this
      // INTEGER[] column. |hash| reaches 2^31, so the value can exceed int4
      // and fail the entire write (22003), and the ones that fit become
      // phantom ids that resolveAssignmentWords later reports as "missing" —
      // the same empty-list path that serves students the generic sample.
      // AssignSetToClassModal already filters on level exactly this way.
      wordIds: wordsToSave
        .filter((w) => w.id > 0 && (w as { level?: string }).level !== 'Custom')
        .map((w) => w.id),
      // JSONB column carries either Word[] (English) or HebrewLemma[] (Hebrew);
      // the subject column disambiguates at read time.
      words: wordsToSave as unknown as Word[],
      title: assignmentTitle,
      deadline: assignmentDeadline || null,
      allowedModes: modesToCheck,
      sentences: assignmentSentences.filter(s => s.trim()),
      sentenceDifficulty,
    };

    try {
      if (editingAssignment) {
        // UPDATE existing assignment
        const updatePayload: Record<string, unknown> = {
          class_id: assignmentData.classId,
          word_ids: assignmentData.wordIds,
          words: assignmentData.words,
          title: assignmentData.title,
          deadline: assignmentData.deadline,
          allowed_modes: assignmentData.allowedModes,
          sentence_difficulty: assignmentData.sentenceDifficulty,
        };
        if (assignmentData.sentences.length > 0) {
          updatePayload.sentences = assignmentData.sentences;
        }

        const { error } = await supabase
          .from('assignments')
          .update(updatePayload)
          .eq('id', editingAssignment.id);

        if (error) throw error;
        void logAudit('edit_assignment', 'assignments', {
          metadata: { assignment_id: editingAssignment.id },
        });
        showToast("Assignment updated successfully!", "success");

        // Update the assignment in the list
        setTeacherAssignments(prev =>
          prev.map(a => a.id === editingAssignment.id
            ? { ...a, ...assignmentData }
            : a
          )
        );
        // Also update editingAssignment so the wizard shows the new data
        setEditingAssignment(prev => prev ? { ...prev, ...assignmentData } : null);
      } else {
        // CREATE new assignment
        const newAssignment = {
          ...assignmentData,
          createdAt: new Date().toISOString(),
        };

        // Subject is denormalized from the parent class so the
        // dashboard can filter assignments by Voca tab without a join.
        // The parent class lookup wins over activeVoca to be robust
        // against tab-switch races during a long create flow.
        const parentClass = classes.find((c) => c.id === newAssignment.classId);
        const subjectForInsert =
          parentClass?.subject ?? activeVoca ?? 'english';
        const insertPayload: Record<string, unknown> = {
          class_id: newAssignment.classId,
          word_ids: newAssignment.wordIds,
          words: newAssignment.words,
          title: newAssignment.title,
          deadline: newAssignment.deadline,
          created_at: newAssignment.createdAt,
          allowed_modes: newAssignment.allowedModes,
          sentence_difficulty: newAssignment.sentenceDifficulty,
          subject: subjectForInsert,
        };
        if (newAssignment.sentences.length > 0) {
          insertPayload.sentences = newAssignment.sentences;
        }

        // Capture the new row's id so we can optionally create a
        // companion `competitions` row referencing it.  Returning a
        // single column keeps the round-trip cheap.
        const { data: insertedRows, error } = await supabase
          .from('assignments')
          .insert(insertPayload)
          .select('id')
          .single();
        if (error) throw error;
        const newAssignmentId = insertedRows?.id as string | undefined;

        // Companion competition row.  Best-effort: failure here doesn't
        // roll back the assignment — the teacher can re-toggle it later
        // by re-saving.  Deadline must parse as a real timestamp;
        // ReviewStep already prevented the toggle from being on without
        // one, but we re-check here as a defensive measure.
        if (
          enableCompetition
          && newAssignmentId
          && newAssignment.deadline
        ) {
          const closesAtDate = new Date(newAssignment.deadline);
          if (!Number.isNaN(closesAtDate.getTime()) && closesAtDate.getTime() > Date.now()) {
            await createCompetition({
              assignmentId: newAssignmentId,
              classId: newAssignment.classId,
              closesAt: closesAtDate.toISOString(),
            });
          }
        }
        showToast("Assignment created successfully!", "success");

        // Best-effort push to opted-in students ("New task from your
        // teacher"). No-ops unless the push_notifications flag is on +
        // students have subscribed — never blocks the create flow.
        void pushNotify("new_assignment", { classCode: selectedClass?.code });

        // Refresh assignments list — await so the teacher-dashboard
        // redirect below doesn't land on a stale list.
        await fetchTeacherAssignments();

        // Only redirect and reset form when creating (not when editing)
        setView("teacher-dashboard");
        setSelectedWords([]);
        setAssignmentTitle("");
        setAssignmentDeadline("");
        setAssignmentModes([]); // No default selection - teacher must choose
        setAssignmentStep(1);
        setAssignmentSentences([]);
        setSentenceDifficulty(2);
      }
    } catch (error) {
      handleDbError(error, editingAssignment ? OperationType.UPDATE : OperationType.CREATE, "assignments");
    }
  };

  const handlePreviewAssignment = async () => {
    if (selectedWords.length === 0) {
      showToast("Please select at least one word to preview.", "error");
      return;
    }

    // Get the selected words. Awaits the corpus for the same reason the
    // save path does: on a cold cache the old `?? []` default resolved
    // zero words, and the game view then substituted its generic Set-2
    // sample — so the teacher's own preview showed words they never picked.
    const { ALL_WORDS } = getCachedVocabulary() ?? (await ensureVocabulary());
    const allPossibleWords = [...ALL_WORDS, ...customWords];
    const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
    const wordsToPreview = uniqueWords.filter(w => new Set(selectedWords).has(w.id));

    if (wordsToPreview.length === 0) {
      showToast("Could not load the vocabulary for these words. Please try again.", "error");
      return;
    }

    // Create a temporary assignment object with selected modes
    const previewAssignment: AssignmentData = {
      id: "preview",
      classId: selectedClass?.id || "",
      wordIds: selectedWords.filter(id => id > 0), // Filter out custom words for consistency
      words: wordsToPreview,
      title: assignmentTitle || "Preview Assignment",
      deadline: null,
      createdAt: new Date().toISOString(),
      allowedModes: assignmentModes,
      sentences: assignmentSentences.filter(s => s.trim()),
      sentenceDifficulty,
    };

    // Set up the game with the preview assignment
    setAssignmentWords(wordsToPreview);
    setActiveAssignment(previewAssignment);
    setView("game");
    setShowModeSelection(true);
  };

  const handleDeleteClass = async (classId: string) => {
    setConfirmDialog({
      show: true,
      message: "Are you sure you want to delete this class? This will also remove access for all students in this class.",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('classes').delete().eq('id', classId);
          if (error) throw error;
          setClasses(prev => prev.filter(c => c.id !== classId));
          // Best-effort audit entry — fire and forget; never blocks UX.
          // Records that this teacher deleted this class, with the
          // class_id in metadata for forensic lookup.  Required by
          // PPA Reg 2017 § 7 monitoring obligations for High-level DBs.
          void logAudit('delete_class', 'classes', { metadata: { class_id: classId } });
          showToast("Class deleted successfully.", "success");
        } catch (error) {
          handleDbError(error, OperationType.DELETE, `classes/${classId}`);
        }
        setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
      }
    });
  };

  const loadPendingStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select(`
          id,
          display_name,
          class_code,
          joined_at
        `)
        .eq('status', 'pending_approval')
        .order('joined_at', { ascending: false });

      if (error) throw error;

      setPendingStudents((data || []).map(s => {
        // Find class name from local classes state
        const classObj = classes.find(c => c.code === s.class_code);
        return {
          id: s.id,
          displayName: s.display_name,
          classCode: s.class_code,
          className: classObj?.name || s.class_code,
          joinedAt: s.joined_at
        };
      }));
    } catch (error) {
      trackAutoError(error, 'Failed to load pending students list');
    }
  };

  const fetchStudents = async () => {
    if (!hasTeacherAccess(user) || classes.length === 0) return;
    const now = Date.now();
    if (now - (lastFetchRef.current.students ?? 0) < 10000) return;
    lastFetchRef.current.students = now;
    const codes = classes.map(c => c.code);
    const chunks = chunkArray(codes, 30);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRows: any[] = [];

    for (const chunk of chunks) {
      const { data } = await supabase.from('progress').select('student_name, class_code, completed_at').in('class_code', chunk).limit(500);
      if (data) allRows.push(...data);
    }

    const studentMap: Record<string, {name: string, classCode: string, lastActive: string}> = {};
    allRows.forEach(row => {
      const key = `${row.student_name}-${row.class_code}`;
      if (!studentMap[key] || new Date(row.completed_at) > new Date(studentMap[key].lastActive)) {
        studentMap[key] = {
          name: row.student_name,
          classCode: row.class_code,
          lastActive: row.completed_at,
        };
      }
    });

    setClassStudents(Object.values(studentMap));
  };

  const fetchGlobalLeaderboard = async () => {
    const classCode = user?.classCode;
    if (!classCode) return;
    const now = Date.now();
    if (now - (lastFetchRef.current.leaderboard ?? 0) < 10000) return;
    lastFetchRef.current.leaderboard = now;
    const { data } = await supabase
      .from('progress').select('student_name, score, avatar')
      .eq('class_code', classCode)
      .order('score', { ascending: false }).limit(10);
    const scores = (data ?? []).map(row => ({
      name: row.student_name,
      score: row.score,
      avatar: row.avatar || "🦊",
    }));
    setGlobalLeaderboard(scores);
  };

  const fetchScores = async () => {
    if (!hasTeacherAccess(user)) return;
    const now = Date.now();
    if (now - (lastFetchRef.current.scores ?? 0) < 10000) return;

    // Don't mark the fetch as done if classes haven't loaded yet.
    // Teacher dashboard load order is: setUser() → classes arrive async →
    // Analytics view reads from allScores. If fetchScores fired before
    // classes were populated, the old code still set lastFetchRef.current
    // and returned with setAllScores([]), locking in an empty array for
    // the next 10 seconds. When classes finally loaded, the retry was
    // throttled away — so Analytics and Gradebook saw "no data" even
    // though the DB had 100+ rows. Move the timestamp update below the
    // classes-length guard so it only marks SUCCESSFUL fetches.
    if (classes.length === 0) {
      setAllScores([]);
      setClassStudents([]);
      return;
    }

    lastFetchRef.current.scores = now;

    const codes = classes.map(c => c.code);
    const chunks = chunkArray(codes, 30);
    const allRows: ProgressData[] = [];

    // Bound the analytics dataset to a recent window instead of "the last
    // 1000 rows of all time". Two problems with the old unbounded query:
    //   1. Correctness — `.limit(1000)` silently truncated, so an active
    //      class accumulating a full year of plays had its analytics quietly
    //      under-count (oldest-within-the-cap rows dropped, totals wrong).
    //   2. Cost — every open re-scanned more of an ever-growing table.
    // A 90-day window (≈ a term) keeps the view accurate and bounded: within
    // it the row cap is comfortably sufficient for a normal class, and the
    // `progress(completed_at)` index makes the range scan cheap. The cap is
    // also raised (1000 → 2000) as headroom and now logs in dev if it's still
    // hit, so truncation can't silently return as volumes grow. The full
    // server-side aggregate RPC (no row cap at all) remains the eventual fix
    // for very high-volume teachers.
    const ANALYTICS_WINDOW_DAYS = 90;
    const ANALYTICS_ROW_CAP = 2000;
    const sinceIso = new Date(Date.now() - ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    for (const chunk of chunks) {
      const { data } = await supabase
        .from('progress').select('id, student_name, student_uid, assignment_id, class_code, score, mode, completed_at, mistakes, avatar')
        .in('class_code', chunk)
        .gte('completed_at', sinceIso)
        .order('completed_at', { ascending: false })
        .limit(ANALYTICS_ROW_CAP);
      if (import.meta.env.DEV && data && data.length === ANALYTICS_ROW_CAP) {
        console.warn(
          `[fetchScores] hit the ${ANALYTICS_ROW_CAP}-row cap within ${ANALYTICS_WINDOW_DAYS}d ` +
          `for a class chunk — analytics may under-count; consider the aggregate RPC.`,
        );
      }
      if (data) allRows.push(...data.map(mapProgress));
    }

    setAllScores(allRows);

    // NOTE on audit logging: we deliberately DO NOT call logAudit here.
    // fetchScores is on the realtime hot path — every progress INSERT
    // a student commits triggers a postgres_changes broadcast that
    // re-fires fetchScores on every connected teacher dashboard.
    // Logging here doubled the request count for what's essentially
    // background data refresh.  The audit-log entry for "teacher
    // accessed gradebook" is now written ONCE per session-mount of
    // the classroom view, from useViewGuards (or wherever that view
    // first loads), not on every refresh.  See 2026-05-04 request-
    // storm audit notes in COMPLIANCE-CHECKLIST-PLAIN.md.

    // Derive students from the same data — avoids a separate query
    const studentMap: Record<string, {name: string, classCode: string, lastActive: string}> = {};
    allRows.forEach(row => {
      const key = `${row.studentName}-${row.classCode}`;
      if (!studentMap[key] || new Date(row.completedAt) > new Date(studentMap[key].lastActive)) {
        studentMap[key] = { name: row.studentName, classCode: row.classCode, lastActive: row.completedAt };
      }
    });
    setClassStudents(Object.values(studentMap));
    lastFetchRef.current.students = now;
  };

  const fetchTeacherAssignments = async (classIdsOverride?: string[]) => {
    // Use optional chaining on user state, but don't early return - the caller ensures valid context
    setTeacherAssignmentsLoading(true);
    const classIds = classIdsOverride || classes.map(c => c.id);
    // Use ASSIGNMENT_COLUMNS (instead of '*') so the mapper and the
    // query stay in sync and we don't haul columns the UI never reads.
    const { data } = await supabase
      .from('assignments')
      .select(ASSIGNMENT_COLUMNS)
      .in('class_id', classIds)
      .order('created_at', { ascending: false });
    setTeacherAssignments((data ?? []).map(mapAssignment));
    setTeacherAssignmentsLoading(false);
  };



  return {
    handleCreateClass,
    handleOcrUpload,
    handleSaveAssignment,
    handlePreviewAssignment,
    handleDeleteClass,
    loadPendingStudents,
    fetchStudents,
    fetchGlobalLeaderboard,
    fetchScores,
    fetchTeacherAssignments,
  };
}
