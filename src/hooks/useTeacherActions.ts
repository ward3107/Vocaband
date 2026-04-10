import React from "react";
import {
  supabase,
  mapClass,
  mapAssignment,
  mapProgress,
  handleDbError,
  OperationType,
  type AppUser,
  type ClassData,
  type AssignmentData,
  type ProgressData,
} from "../core/supabase";
import { ALL_WORDS, BAND_2_WORDS, Word } from "../data/vocabulary";
import { chunkArray } from "../utils";
import { loadMammoth } from "../utils/lazyLoad";
import { trackAutoError } from "../errorTracking";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_IMPORT_WORDS = 500;

export interface UseTeacherActionsParams {
  user: AppUser | null;
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
  pastedText: string;
  setPastedText: (v: string) => void;
  setPasteMatchedCount: (v: number) => void;
  pasteUnmatched: string[];
  setPasteUnmatched: (v: string[]) => void;
  setShowPasteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  tagInput: string;
  setTagInput: (v: string) => void;
  setIsOcrProcessing: (v: boolean) => void;
  setOcrProgress: (v: string | number) => void;
  gSheetsUrl: string;
  setGSheetsUrl: (v: string) => void;
  setGSheetsLoading: (v: boolean) => void;
  setWordSearchQuery: (v: string) => void;
  setSelectedCore: (v: any) => void;
  setSelectedRecProd: (v: string) => void;
  setSelectedPos: (v: string) => void;
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
    user, classes, setClasses,
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
    pastedText, setPastedText,
    setPasteMatchedCount, pasteUnmatched, setPasteUnmatched, setShowPasteDialog,
    tagInput, setTagInput,
    setIsOcrProcessing, setOcrProgress,
    gSheetsUrl, setGSheetsUrl, setGSheetsLoading,
    setWordSearchQuery, setSelectedCore, setSelectedRecProd, setSelectedPos,
    setTeacherAssignments, setTeacherAssignmentsLoading,
    setPendingStudents,
    setAllScores,
    setClassStudents, setGlobalLeaderboard,
    setActiveAssignment, setAssignmentWords, setShowModeSelection,
    setConfirmDialog, showToast, setView,
    lastFetchRef,
  } = params;

  // --- Helper: extract words from pasted text ---
  const extractWordsFromPaste = (text: string): string[] => {
    const cleaned = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    const words = cleaned
      .split(/[,\n;\t\|]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length >= 2 && w.length <= 100);
    const unique = [...new Set(words)];
    if (unique.length > MAX_IMPORT_WORDS) {
      console.warn(`Large paste: ${unique.length} words (processing first ${MAX_IMPORT_WORDS})`);
    }
    return unique.slice(0, MAX_IMPORT_WORDS);
  };

  // --- Helper: find matching Band 2 words ---
  const findMatchesInBand2 = (words: string[]): { matched: Word[]; unmatched: string[] } => {
    const allMatches: Word[] = [];
    const unmatched: string[] = [];
    for (const word of words) {
      const matches = BAND_2_WORDS.filter(w =>
        w.english.toLowerCase() === word ||
        w.english.toLowerCase().startsWith(word) ||
        w.english.toLowerCase().endsWith(word)
      );
      if (matches.length > 0) {
        allMatches.push(...matches);
      } else {
        unmatched.push(word);
      }
    }
    const groupedMatches = new Map<string, Word[]>();
    for (const match of allMatches) {
      const base = match.english.replace(/\(n\)$/, '').toLowerCase().trim();
      if (!groupedMatches.has(base)) groupedMatches.set(base, []);
      groupedMatches.get(base)!.push(match);
    }
    const matched: Word[] = [];
    for (const [, group] of groupedMatches) {
      const hebrewParts = group.map(w => w.hebrew.trim()).filter(h => h.length > 0);
      const arabicParts = group.map(w => w.arabic.trim()).filter(a => a.length > 0);
      matched.push({
        ...group[0],
        english: group[0].english.replace(/\(n\)$/, '').trim(),
        hebrew: [...new Set(hebrewParts)].join(' | '),
        arabic: [...new Set(arabicParts)].join(' | '),
      });
    }
    return { matched, unmatched };
  };

  const handleCreateClass = async () => {
    if (!newClassName || !user) return;

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
      const { data: docRow, error } = await supabase.from('classes').insert({ name: newClass.name, teacher_uid: newClass.teacherUid, code: newClass.code }).select().single();
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
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image too large (max 5 MB).", "error"); e.target.value = ""; return; }

    setIsOcrProcessing(true);
    setOcrProgress(10); // Initial progress

    try {
      // Get auth token for teacher authentication
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { showToast("Please sign in again.", "error"); return; }

      // Create FormData with the image file
      const formData = new FormData();
      formData.append('file', file);

      // Send to server-side OCR microservice
      const apiUrl = (import.meta as any).env?.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/ocr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // JWT token for teacher authentication
        },
        body: formData,
      });

      setOcrProgress(50); // Upload complete

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR service error');
      }

      const ocrData = await response.json();
      setOcrProgress(90); // Processing complete

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
        showToast(
          `No English words found. OCR recognized: "${rawText.substring(0, 100)}${rawText.length > 100 ? '...' : ''}"`,
          "info"
        );
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
      trackAutoError(err, 'OCR processing failed');
      const errorMessage = err instanceof Error ? err.message : 'Error processing image';
      console.error('OCR error:', errorMessage);
      showToast(`${errorMessage}. Please try again.`, "error");
    } finally {
      setIsOcrProcessing(false);
      setOcrProgress(0);
      // Reset the file input so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  const handlePasteSubmit = () => {
    const words = extractWordsFromPaste(pastedText);
    if (words.length === 0) return;

    const { matched, unmatched } = findMatchesInBand2(words);

    setPasteMatchedCount(matched.length);
    setPasteUnmatched(unmatched);
    setShowPasteDialog(true);

    // Auto-add matched words
    const newSelected = [...selectedWords];
    matched.forEach(w => {
      if (!newSelected.includes(w.id)) {
        newSelected.push(w.id);
      }
    });
    setSelectedWords(newSelected);
    setPastedText("");
  };

  const handleAddUnmatchedAsCustom = () => {
    const newCustomWords = pasteUnmatched.map((word, idx) => ({
      id: Date.now() + idx,
      english: word,
      hebrew: "",
      arabic: "",
      level: "Custom" as const
    }));
    setCustomWords(prev => [...prev, ...newCustomWords]);
    setSelectedWords(prev => [...prev, ...newCustomWords.map(w => w.id)]);
    // Switch to Custom tab so users can see the added words
    setSelectedLevel("Custom");
    // Clear search and filters so all words are visible
    setWordSearchQuery("");
    setSelectedCore("");
    setSelectedPos("");
    setSelectedRecProd("");
    setShowPasteDialog(false);
    setPasteUnmatched([]);
    setPasteMatchedCount(0);
  };

  const handleSkipUnmatched = () => {
    setShowPasteDialog(false);
    setPasteUnmatched([]);
    setPasteMatchedCount(0);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !tagInput.trim()) return;
    e.preventDefault();
    const word: Word = { id: Date.now(), english: tagInput.trim(), hebrew: "", arabic: "", level: "Custom" };
    setCustomWords(prev => [...prev, word]);
    setSelectedWords(prev => [...prev, word.id]);
    setSelectedLevel("Custom");
    setTagInput("");
  };

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_SIZE) { showToast("File too large (max 5 MB).", "error"); e.target.value = ""; return; }
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Lazy load mammoth
      const mammothModule = await loadMammoth();
      const mammoth = mammothModule.default || mammothModule;
      const result = await mammoth.extractRawText({ arrayBuffer });
      setPastedText(result.value);
      showToast("Word document text extracted — click Import Words to continue.", "info");
    } catch {
      showToast("Could not read Word document.", "error");
    }
    e.target.value = "";
  };

  const handleGSheetsImport = async () => {
    if (!gSheetsUrl.trim()) return;
    try {
      const parsed = new URL(gSheetsUrl.trim());
      if (parsed.hostname !== "google.com" && !parsed.hostname.endsWith(".google.com")) {
        showToast("Only Google Sheets URLs are allowed.", "error");
        return;
      }
    } catch {
      showToast("Invalid URL.", "error");
      return;
    }
    setGSheetsLoading(true);
    try {
      const csvUrl = gSheetsUrl.replace(/\/edit.*$/, "/export?format=csv");
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Could not fetch sheet");
      const text = await res.text();
      const lines = text.split("\n");
      const words: Word[] = lines.slice(1).map((line, idx) => {
        const [english, hebrew, arabic] = line.split(",");
        return { id: 7000 + idx, english: english?.trim() ?? "", hebrew: hebrew?.trim() ?? "", arabic: arabic?.trim() ?? "", level: "Custom" as const };
      }).filter(w => w.english);
      if (words.length === 0) { showToast("No words found in the sheet. Make sure column A is English.", "error"); return; }
      const limited = words.slice(0, MAX_IMPORT_WORDS);
      if (words.length > MAX_IMPORT_WORDS) showToast(`Only the first ${MAX_IMPORT_WORDS} words were imported.`, "info");
      setCustomWords(prev => [...prev, ...limited]);
      setSelectedWords(prev => [...prev, ...limited.map(w => w.id)]);
      setSelectedLevel("Custom");
      setGSheetsUrl("");
      showToast(`Imported ${limited.length} words from Google Sheets.`, "success");
    } catch {
      showToast("Could not import from Google Sheets. Make sure the sheet is public and the URL is correct.", "error");
    } finally {
      setGSheetsLoading(false);
    }
  };

  const handleSaveAssignment = async () => {
    // For editing, allow custom-only assignments
    const hasWords = editingAssignment
      ? selectedWords.length > 0 || customWords.length > 0
      : selectedWords.length > 0;

    if (!selectedClass || !hasWords || !assignmentTitle) {
      showToast("Please enter a title and select words.", "error");
      return;
    }

    // Check if there's at least one database word (not custom/session-only)
    // For creating new assignments, require at least one database word
    // For editing, allow custom-only assignments
    const hasDbWords = selectedWords.some(id => id > 0);
    if (!hasDbWords && !editingAssignment) {
      showToast("Please select at least one word from the vocabulary database.", "error");
      return;
    }
    // For editing, if no database words, ensure we have at least one custom word
    if (!hasDbWords && editingAssignment && customWords.length === 0 && selectedWords.length === 0) {
      showToast("Please select at least one word (database or custom).", "error");
      return;
    }

    const allPossibleWords = [...ALL_WORDS, ...customWords];
    const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
    const wordsToSave = uniqueWords.filter(w => new Set(selectedWords).has(w.id));

    const assignmentData = {
      classId: selectedClass.id,
      wordIds: selectedWords.filter(id => id > 0), // Only save positive IDs (database words, not custom/phrases)
      words: wordsToSave,
      title: assignmentTitle,
      deadline: assignmentDeadline || null,
      allowedModes: assignmentModes,
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

        const insertPayload: Record<string, unknown> = {
          class_id: newAssignment.classId,
          word_ids: newAssignment.wordIds,
          words: newAssignment.words,
          title: newAssignment.title,
          deadline: newAssignment.deadline,
          created_at: newAssignment.createdAt,
          allowed_modes: newAssignment.allowedModes,
          sentence_difficulty: newAssignment.sentenceDifficulty,
        };
        if (newAssignment.sentences.length > 0) {
          insertPayload.sentences = newAssignment.sentences;
        }

        const { error } = await supabase.from('assignments').insert(insertPayload);
        if (error) throw error;
        showToast("Assignment created successfully!", "success");

        // Refresh assignments list
        fetchTeacherAssignments();

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

  const handlePreviewAssignment = () => {
    if (selectedWords.length === 0) {
      showToast("Please select at least one word to preview.", "error");
      return;
    }

    // Get the selected words
    const allPossibleWords = [...ALL_WORDS, ...customWords];
    const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
    const wordsToPreview = uniqueWords.filter(w => new Set(selectedWords).has(w.id));

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
    if (!user || user.role !== "teacher" || classes.length === 0) return;
    const now = Date.now();
    if (now - (lastFetchRef.current.students ?? 0) < 10000) return;
    lastFetchRef.current.students = now;
    const codes = classes.map(c => c.code);
    const chunks = chunkArray(codes, 30);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRows: any[] = [];

    for (const chunk of chunks) {
      const { data } = await supabase.from('progress').select('*').in('class_code', chunk).limit(5000);
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
    if (!user || user.role !== "teacher") return;
    const now = Date.now();
    if (now - (lastFetchRef.current.scores ?? 0) < 10000) return;
    lastFetchRef.current.scores = now;

    if (classes.length === 0) {
      setAllScores([]);
      setClassStudents([]);
      return;
    }

    const codes = classes.map(c => c.code);
    const chunks = chunkArray(codes, 30);
    const allRows: ProgressData[] = [];

    for (const chunk of chunks) {
      const { data } = await supabase
        .from('progress').select('*')
        .in('class_code', chunk)
        .order('completed_at', { ascending: false })
        .limit(5000);
      if (data) allRows.push(...data.map(mapProgress));
    }

    setAllScores(allRows);

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
    const { data } = await supabase.from('assignments').select('*').in('class_id', classIds).order('created_at', { ascending: false });
    setTeacherAssignments((data ?? []).map(mapAssignment));
    setTeacherAssignmentsLoading(false);
  };



  return {
    handleCreateClass,
    handleOcrUpload,
    handlePasteSubmit,
    handleAddUnmatchedAsCustom,
    handleSkipUnmatched,
    handleTagInputKeyDown,
    handleDocxUpload,
    handleGSheetsImport,
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
