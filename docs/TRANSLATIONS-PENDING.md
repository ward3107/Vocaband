# Vocaband — Pending Translations

> **Workflow:** I extract every untranslated user-visible English string into this doc.
> You fill in **HE** (Hebrew) and **AR** (Arabic) for each entry, hand it back via
> a PR comment / patched file / pasted reply, and I plug them into the locale
> files (`src/locales/student/*.ts`). Once shipped, every Vocaband surface will
> render correctly when a teacher picks Hebrew or Arabic — no more English
> fall-throughs.

## How to fill this in

For each entry below, replace the `___` placeholders with your translation:

```
- en: Print worksheet
- he: ___      ← put the Hebrew here
- ar: ___      ← put the Arabic here
```

**Conventions:**
- Keep the English line unchanged so I can match keys when integrating.
- Hebrew + Arabic should both be written in their **native script** (no transliteration).
- For sentences that contain a placeholder like `{name}` or `{n}`, keep the placeholder in your translation — I parse those out at integration time.
- Punctuation (`,`, `.`, `:`, `?`, `!`) — feel free to localise if needed (Arabic uses `،` for comma, `؟` for question mark, etc.).
- Buttons / labels: keep them concise — they sit inside fixed-width UI elements.
- Where the same string appears in multiple files, you only need to translate it once and tell me — I'll dedupe.

## What's already done

These don't need translation work — they already resolve in HE / AR via existing locale files:

- ✅ Teacher login (`teacher-login.ts`)
- ✅ Student login (`student-login.ts`)
- ✅ Student dashboard + sub-cards (`student-dashboard.ts`)
- ✅ Game-mode selection / intro / active / finished (`game-modes.ts`, `mode-intro.ts`, `game-active.ts`, `game-finished.ts`)
- ✅ Shop (`shop.ts`)
- ✅ Class Show core (`class-show.ts`)
- ✅ Demo Mode (embedded `demoTranslations`)
- ✅ Privacy / Terms / Security / Accessibility (their own locale)
- ✅ Landing page hero + section H2s + CTAs + footer copyright (just landed in `landing-page.ts`)
- ✅ PublicNav chrome (TRY DEMO + CEFR badge)

## What's pending — fill this in

Total: ~150 strings across 8 sections below.

---

## Section 1 — LandingPage feature card body copy

These are the headlines and descriptions inside each colored feature card on the landing page below the section H2s.

### Card: 11 Game Modes (students section)

```yaml
- key: card_11modes_title
  en: 11 Game Modes
  he: ___
  ar: ___

- key: card_11modes_desc
  en: From Classic to Sentence Builder — every mode teaches differently. Find your favorite!
  he: ___
  ar: ___
```

### Card: Live Challenges

```yaml
- key: card_live_title
  en: Live Challenges
  he: ___
  ar: ___

- key: card_live_desc
  en: Battle classmates in real-time podiums!
  he: ___
  ar: ___
```

### Card: XP Shop

```yaml
- key: card_xpshop_title
  en: XP Shop
  he: ___
  ar: ___

- key: card_xpshop_desc
  en: Earn XP, spend on avatars, frames & power-ups!
  he: ___
  ar: ___
```

### Card: Mystery Eggs

```yaml
- key: card_eggs_title
  en: Mystery Eggs
  he: ___
  ar: ___

- key: card_eggs_desc
  en: Crack eggs to unlock legendary avatars!
  he: ___
  ar: ___
```

### Card: Power Boosters

```yaml
- key: card_boosters_title
  en: Power Boosters
  he: ___
  ar: ___

- key: card_boosters_desc
  en: XP multipliers, streak freeze & more!
  he: ___
  ar: ___
```

### Card: Pet Friends

```yaml
- key: card_pets_title
  en: Pet Friends
  he: ___
  ar: ___

- key: card_pets_desc
  en: Unlock cute pets that cheer you on!
  he: ___
  ar: ___
```

### Card: Daily Streaks

```yaml
- key: card_streaks_title
  en: Daily Streaks
  he: ___
  ar: ___

- key: card_streaks_desc
  en: Keep the flame burning! Earn rewards.
  he: ___
  ar: ___
```

### Card: Auto-Grading (teachers section)

```yaml
- key: card_auto_title
  en: Auto-Grading
  he: ___
  ar: ___

- key: card_auto_desc
  en: Every practice session graded instantly. No worksheets to collect, no stacks to review. Focus on teaching, not paperwork.
  he: ___
  ar: ___
```

### Card: Use Your Own Words

```yaml
- key: card_ownwords_title
  en: Use Your Own Words
  he: ___
  ar: ___

- key: card_ownwords_desc
  en: Upload your custom vocabulary lists. Assign any words you need.
  he: ___
  ar: ___
```

### Card: Spot Who's Struggling

```yaml
- key: card_spot_title
  en: Spot Who's Struggling
  he: ___
  ar: ___

- key: card_spot_desc
  en: Per-student reports show exactly which words each kid stumbles on.
  he: ___
  ar: ___
```

### Card: Setup in 30 Seconds

```yaml
- key: card_setup_title
  en: Setup in 30 Seconds
  he: ___
  ar: ___

- key: card_setup_desc
  en: Paste a word list. Pick a class. Done. Your assignment is live.
  he: ___
  ar: ___
```

### Card: They Actually Want to Practice

```yaml
- key: card_practice_title
  en: They Actually Want to Practice
  he: ___
  ar: ___

- key: card_practice_desc
  en: Game modes, XP, streaks — students voluntarily study at home.
  he: ___
  ar: ___
```

### Card: AI Sentence Builder

```yaml
- key: card_ai_title
  en: AI Sentence Builder
  he: ___
  ar: ___

- key: card_ai_desc
  en: One click, 10 example sentences per word — at the right level for your grade.
  he: ___
  ar: ___

- key: card_ai_example_sentence
  en: She sprinted across the field to catch the ball.
  he: ___      # Translate the sentence; "sprinted" is the target word — we'll re-highlight it in the translation
  ar: ___
```

### Card: Snap a Wordlist

```yaml
- key: card_snap_title
  en: Snap a Wordlist
  he: ___
  ar: ___

- key: card_snap_desc
  en: Take a photo of any printed list — handwriting, textbook page, board — words extracted in seconds.
  he: ___
  ar: ___
```

### Card: Quick Play

```yaml
- key: card_qp_title
  en: Quick Play — No-Signup Live Game
  he: ___
  ar: ___

- key: card_qp_desc
  en: Project a QR on the board, students join with their phones — no accounts, no class code typing, no setup. Live podium, real-time scores, ready in 10 seconds.
  he: ___
  ar: ___
```

### Card: Hebrew + Arabic, built in

```yaml
- key: card_rtl_title
  en: Hebrew + Arabic, built in
  he: ___
  ar: ___

- key: card_rtl_desc
  en: All game modes adapt for RTL — Hebrew and Arabic learners get the full experience, no asterisks.
  he: ___
  ar: ___
```

### Curriculum sets (Set 1 / 2 / 3 cards)

```yaml
- key: set1_label
  en: Set 1 — Foundation
  he: ___
  ar: ___

- key: set1_desc
  en: Beginner vocabulary
  he: ___
  ar: ___

- key: set2_label
  en: Set 2 — Intermediate
  he: ___
  ar: ___

- key: set2_desc
  en: Building complexity
  he: ___
  ar: ___

- key: set3_label
  en: Set 3 — Academic
  he: ___
  ar: ___

- key: set3_desc
  en: Advanced mastery
  he: ___
  ar: ___

- key: set_progress_label
  en: Progress
  he: ___
  ar: ___

- key: set_words_count_template
  en: ~{n} words
  he: ___       # e.g. "כ-{n} מילים"
  ar: ___       # e.g. "نحو {n} كلمة"
```

### Voca Family roadmap subjects

```yaml
- key: voca_history_tag
  en: Dates · figures · events
  he: ___
  ar: ___

- key: voca_science_tag
  en: Terms · concepts · diagrams
  he: ___
  ar: ___

- key: voca_hebrew_tag
  en: Hebrew vocabulary
  he: ___
  ar: ___

- key: voca_arabic_tag
  en: Arabic vocabulary
  he: ___
  ar: ___

- key: voca_math_tag
  en: Definitions · formulas
  he: ___
  ar: ___
```

---

## Section 2 — WorksheetView (the Print Worksheet builder)

```yaml
- key: ws_title
  en: Print worksheet
  he: ___
  ar: ___

- key: ws_subtitle
  en: Pick a sheet, set the title, hit Print.
  he: ___
  ar: ___

- key: ws_back
  en: Back
  he: ___
  ar: ___

- key: ws_sheet_type_label
  en: Sheet type
  he: ___
  ar: ___

- key: ws_sheet_wordlist_label
  en: Word list
  he: ___
  ar: ___

- key: ws_sheet_wordlist_desc
  en: Bilingual reference sheet
  he: ___
  ar: ___

- key: ws_sheet_scramble_label
  en: Scramble
  he: ___
  ar: ___

- key: ws_sheet_scramble_desc
  en: Unscramble each word
  he: ___
  ar: ___

- key: ws_sheet_fillblank_label
  en: Fill in the blank
  he: ___
  ar: ___

- key: ws_sheet_fillblank_desc
  en: Sentences with missing words
  he: ___
  ar: ___

- key: ws_sheet_matchup_label
  en: Match-up
  he: ___
  ar: ___

- key: ws_sheet_matchup_desc
  en: Draw lines between English + translation
  he: ___
  ar: ___

- key: ws_word_source_label
  en: Word source
  he: ___
  ar: ___

- key: ws_custom_selection
  en: My custom selection
  he: ___
  ar: ___

- key: ws_custom_built_with
  en: Built with paste / OCR / packs
  he: ___
  ar: ___

- key: ws_build_custom_button
  en: Build a custom list (paste, OCR, topic packs, saved groups)
  he: ___
  ar: ___

- key: ws_title_label
  en: Worksheet title
  he: ___
  ar: ___

- key: ws_title_default
  en: Vocabulary worksheet
  he: ___
  ar: ___

- key: ws_words_count_label
  en: Words on sheet
  he: ___
  ar: ___

- key: ws_include_answer_key
  en: Include answer key (separate page)
  he: ___
  ar: ___

- key: ws_preview_label
  en: Preview
  he: ___
  ar: ___

- key: ws_print_button
  en: Print
  he: ___
  ar: ___

- key: ws_answer_key_heading
  en: Answer key
  he: ___
  ar: ___

# Worksheet PRINT-only labels (printed on paper / saved PDF)

- key: ws_print_class_label
  en: Class
  he: ___
  ar: ___

- key: ws_print_date_label
  en: Date
  he: ___
  ar: ___

- key: ws_print_name_label
  en: Name
  he: ___
  ar: ___

- key: ws_print_english_col
  en: English
  he: ___
  ar: ___

- key: ws_print_translation_col
  en: Translation
  he: ___
  ar: ___

- key: ws_print_scrambled_col
  en: Scrambled
  he: ___
  ar: ___

- key: ws_print_hint_col
  en: Hint
  he: ___
  ar: ___

- key: ws_print_your_answer_col
  en: Your answer
  he: ___
  ar: ___

- key: ws_print_answer_col
  en: Answer
  he: ___
  ar: ___

- key: ws_print_matchup_instructions
  en: Draw a line from each English word to its translation. (Or write the matching letter on the line.)
  he: ___
  ar: ___

- key: ws_print_writeasentence
  en: Write a sentence using {word}:
  he: ___       # keep {word} placeholder
  ar: ___
```

---

## Section 3 — Teacher dashboard modals

### CreateClassModal

```yaml
- key: create_class_heading
  en: Create New Class
  he: ___
  ar: ___

- key: create_class_subtitle
  en: Enter a name for your class (e.g. Grade 8-B)
  he: ___
  ar: ___

- key: create_class_placeholder
  en: Class Name
  he: ___
  ar: ___

- key: create_class_cancel
  en: Cancel
  he: ___
  ar: ___

- key: create_class_create
  en: Create
  he: ___
  ar: ___
```

### EditClassModal

```yaml
- key: edit_class_heading
  en: Edit class
  he: ___
  ar: ___

- key: edit_class_subtitle
  en: Rename this class or pick a new avatar — students, assignments, and progress all stay intact. Class code stays the same.
  he: ___
  ar: ___

- key: edit_class_name_label
  en: Class name
  he: ___
  ar: ___

- key: edit_class_placeholder
  en: e.g. Grade 8-B
  he: ___
  ar: ___

- key: edit_class_code_label
  en: Class code
  he: ___       # appears like "Class code: ABC123 (cannot change)"
  ar: ___

- key: edit_class_code_cannot_change
  en: cannot change
  he: ___
  ar: ___

- key: edit_class_avatar_label
  en: Class avatar
  he: ___
  ar: ___

- key: edit_class_default_icon_title
  en: Use default icon
  he: ___
  ar: ___

- key: edit_class_cancel
  en: Cancel
  he: ___
  ar: ___

- key: edit_class_save_changes
  en: Save changes
  he: ___
  ar: ___

- key: edit_class_saving
  en: Saving…
  he: ___
  ar: ___
```

### ClassCreatedModal

```yaml
- key: class_created_heading
  en: Class Created!
  he: ___
  ar: ___

- key: class_created_subtitle
  en: Share this code with your students so they can join.
  he: ___
  ar: ___

- key: class_created_copy_button
  en: Copy
  he: ___
  ar: ___

- key: class_created_whatsapp_button
  en: WhatsApp
  he: ___
  ar: ___

- key: class_created_done_button
  en: Done
  he: ___
  ar: ___
```

### DeleteAssignmentModal

```yaml
- key: delete_assignment_heading
  en: Delete Assignment?
  he: ___
  ar: ___

- key: delete_assignment_warning_template
  en: You're about to delete "{title}". This action cannot be undone — all student progress and data for this assignment will be permanently removed.
  he: ___       # keep {title} placeholder
  ar: ___

- key: delete_assignment_confirm_alert
  en: Make sure you want to delete this assignment before continuing.
  he: ___
  ar: ___

- key: delete_assignment_keep
  en: Keep Assignment
  he: ___
  ar: ___

- key: delete_assignment_delete
  en: Delete Assignment
  he: ___
  ar: ___
```

### RejectStudentModal

```yaml
- key: reject_student_heading
  en: Reject Student?
  he: ___
  ar: ___

- key: reject_student_warning_template
  en: You're about to reject "{name}". They will need to sign up again with a new class code to join your class.
  he: ___       # keep {name} placeholder
  ar: ___

- key: reject_student_confirm_alert
  en: This action cannot be undone. The student's profile will be marked as rejected.
  he: ___
  ar: ___

- key: reject_student_keep
  en: Keep Student
  he: ___
  ar: ___

- key: reject_student_reject
  en: Reject Student
  he: ___
  ar: ___
```

---

## Section 4 — Assignment setup wizard (WordInputStep2026)

This is the screen teachers see when creating a new assignment. ~60 strings — bulk of pending work.

```yaml
- key: setup_paste_title
  en: Paste your word list here
  he: ___
  ar: ___

- key: setup_paste_placeholder
  en: apple, banana, orange, grape
  he: ___       # the example words can stay English (they're examples)
  ar: ___

- key: setup_paste_tip
  en: Separate words with commas, spaces, or lines
  he: ___
  ar: ___

- key: setup_analyze_button
  en: Analyze & Add Words
  he: ___
  ar: ___

- key: setup_analyzing
  en: Analyzing…
  he: ___
  ar: ___

- key: setup_or_separator
  en: OR
  he: ___       # e.g. "או" / "أو"
  ar: ___

- key: setup_topic_packs_label
  en: Topic Packs
  he: ___
  ar: ___

- key: setup_saved_groups_label
  en: Saved Groups
  he: ___
  ar: ___

- key: setup_browse_library_label
  en: Browse Library
  he: ___
  ar: ___

- key: setup_ocr_label
  en: Scan & Upload
  he: ___
  ar: ___

- key: setup_ocr_subtitle
  en: Photo to text
  he: ___
  ar: ___

- key: setup_view
  en: View
  he: ___
  ar: ___

- key: setup_upload
  en: Upload
  he: ___
  ar: ___

- key: setup_packs_count_label
  en: packs
  he: ___
  ar: ___

- key: setup_groups_count_label
  en: groups
  he: ___
  ar: ___

- key: setup_words_count_label
  en: words
  he: ___
  ar: ___

- key: setup_words_selected
  en: words selected
  he: ___
  ar: ___

- key: setup_status_ready
  en: READY
  he: ___
  ar: ___

- key: setup_status_ready_desc
  en: All words have translations
  he: ___
  ar: ___

- key: setup_status_needswork
  en: NEEDS WORK
  he: ___
  ar: ___

- key: setup_status_needswork_desc
  en: Missing translations
  he: ___
  ar: ___

- key: setup_fix_translations
  en: Fix Missing Translations
  he: ___
  ar: ___

- key: setup_translate_missing_template
  en: Translate {n} missing word(s)
  he: ___       # keep {n} placeholder
  ar: ___

- key: setup_translating
  en: Translating…
  he: ___
  ar: ___

- key: setup_done
  en: Done
  he: ___
  ar: ___

- key: setup_fix
  en: Fix
  he: ___
  ar: ___

- key: setup_add_translation
  en: Add translation
  he: ___
  ar: ___

- key: setup_continue_step2
  en: Continue to Step 2
  he: ___
  ar: ___

- key: setup_back
  en: Back
  he: ___
  ar: ___

- key: setup_cancel
  en: Cancel
  he: ___
  ar: ___

- key: setup_add_words
  en: Add Words
  he: ___
  ar: ___

- key: setup_camera
  en: Camera
  he: ___
  ar: ___

- key: setup_gallery
  en: Gallery
  he: ___
  ar: ___

- key: setup_uploading
  en: Uploading…
  he: ___
  ar: ___

- key: setup_extracting
  en: Extracting words…
  he: ___
  ar: ___

- key: setup_ocr_no_words
  en: No words detected
  he: ___
  ar: ___

- key: setup_ocr_no_words_desc
  en: Try a clearer photo or different angle
  he: ___
  ar: ___

- key: setup_try_again
  en: Try Again
  he: ___
  ar: ___

- key: setup_words_found
  en: words found
  he: ___
  ar: ___

- key: setup_review_words
  en: Review and edit before adding:
  he: ___
  ar: ___

- key: setup_new_label
  en: new
  he: ___
  ar: ___

- key: setup_no_saved_groups
  en: No saved groups yet
  he: ___
  ar: ___

- key: setup_save_group_hint
  en: Create a group from your selected words
  he: ___
  ar: ___

- key: setup_search_placeholder
  en: Search words…
  he: ___
  ar: ___

- key: setup_showing_first_100
  en: Showing first 100
  he: ___
  ar: ___

- key: setup_refine_search
  en: refine your search
  he: ___
  ar: ___

- key: setup_add_selected_packs
  en: Add selected packs
  he: ___
  ar: ___

- key: setup_add_selected_words
  en: Add selected words
  he: ___
  ar: ___

- key: setup_choose_file
  en: Choose File
  he: ___
  ar: ___

- key: setup_no_file_selected
  en: No file selected
  he: ___
  ar: ___

- key: setup_translation_lang_label
  en: Translation Language
  he: ___
  ar: ___

- key: setup_translation_both
  en: Both
  he: ___
  ar: ___

- key: setup_translation_hebrew_only
  en: Hebrew Only
  he: ___
  ar: ___

- key: setup_translation_arabic_only
  en: Arabic Only
  he: ___
  ar: ___

- key: setup_clear_all
  en: Clear All
  he: ___
  ar: ___

- key: setup_clear_all_confirm
  en: Are you sure you want to remove all words?
  he: ___
  ar: ___

- key: setup_select_words
  en: Select words to add:
  he: ___
  ar: ___

- key: setup_all_words
  en: All words
  he: ___
  ar: ___

- key: setup_already_added
  en: Already added
  he: ___
  ar: ___
```

---

## Section 5 — Class Show + Worksheet picker integration (recently shipped)

```yaml
- key: cs_my_custom_selection
  en: My custom selection
  he: ___
  ar: ___

- key: cs_built_with_paste_ocr
  en: Built with paste / OCR / packs
  he: ___
  ar: ___

- key: cs_build_custom_button
  en: Build a custom list (paste, OCR, topic packs, saved groups)
  he: ___
  ar: ___
```

---

## Section 6 — Teacher dashboard tiles + sections

```yaml
- key: dashboard_quick_actions_label
  en: Quick actions
  he: ___
  ar: ___

- key: dashboard_quick_play_title
  en: Quick Play
  he: ___
  ar: ___

- key: dashboard_quick_play_desc
  en: Instant QR code challenge
  he: ___
  ar: ___

- key: dashboard_quick_play_cta
  en: Create
  he: ___
  ar: ___

- key: dashboard_classroom_title
  en: Classroom
  he: ___
  ar: ___

- key: dashboard_classroom_desc
  en: Pulse · Mastery · Records
  he: ___
  ar: ___

- key: dashboard_classroom_cta
  en: Open
  he: ___
  ar: ___

- key: dashboard_approvals_title
  en: Approvals
  he: ___
  ar: ___

- key: dashboard_approvals_pending_template
  en: {n} student(s) waiting
  he: ___       # keep {n} placeholder
  ar: ___

- key: dashboard_approvals_none
  en: No pending approvals
  he: ___
  ar: ___

- key: dashboard_approvals_review
  en: Review
  he: ___
  ar: ___

- key: dashboard_approvals_check
  en: Check
  he: ___
  ar: ___

- key: dashboard_class_show_title
  en: Class Show
  he: ___
  ar: ___

- key: dashboard_class_show_desc
  en: Project to the classroom
  he: ___
  ar: ___

- key: dashboard_class_show_cta
  en: Start
  he: ___
  ar: ___

- key: dashboard_worksheet_title
  en: Worksheet
  he: ___
  ar: ___

- key: dashboard_worksheet_desc
  en: Print a sheet for class
  he: ___
  ar: ___

- key: dashboard_worksheet_cta
  en: Build
  he: ___
  ar: ___

- key: dashboard_my_classes
  en: My classes
  he: ___
  ar: ___

- key: dashboard_no_classes_yet
  en: You haven't created any classes yet.
  he: ___
  ar: ___

- key: dashboard_classes_count_template
  en: {n} class(es)
  he: ___       # keep {n} placeholder
  ar: ___

- key: dashboard_new_class
  en: New class
  he: ___
  ar: ___

- key: dashboard_no_classes_create
  en: Create your first class to get a shareable join code.
  he: ___
  ar: ___

- key: dashboard_create_first_class
  en: Create first class
  he: ___
  ar: ___

- key: dashboard_saved_templates
  en: Saved templates
  he: ___
  ar: ___

- key: dashboard_saved_templates_subtitle
  en: Re-use a task in one tap. Pinned + most-used appear first.
  he: ___
  ar: ___

- key: dashboard_greeting_morning
  en: Good morning
  he: ___
  ar: ___

- key: dashboard_greeting_afternoon
  en: Good afternoon
  he: ___
  ar: ___

- key: dashboard_greeting_evening
  en: Good evening
  he: ___
  ar: ___

- key: dashboard_classroom_intro_template
  en: {firstName}, here's your classroom.
  he: ___       # keep {firstName} placeholder
  ar: ___

- key: dashboard_classroom_intro_subtitle
  en: Manage your classes, review student progress, and create new assignments in a few taps.
  he: ___
  ar: ___
```

---

## Section 7 — Teacher dashboard theme picker

```yaml
- key: theme_picker_heading
  en: Dashboard theme
  he: ___
  ar: ___

- key: theme_picker_subtitle
  en: Pick a look for your teacher dashboard. Only you see this — students keep their own theme from the shop.
  he: ___
  ar: ___

# Theme NAMES (one per theme)
- key: theme_default
  en: Default
  he: ___
  ar: ___

- key: theme_spring
  en: Spring
  he: ___
  ar: ___

- key: theme_sunset
  en: Sunset
  he: ___
  ar: ___

- key: theme_forest
  en: Forest
  he: ___
  ar: ___

- key: theme_midnight
  en: Midnight
  he: ___
  ar: ___

- key: theme_ocean
  en: Ocean
  he: ___
  ar: ___

- key: theme_berry
  en: Berry
  he: ___
  ar: ___

- key: theme_autumn
  en: Autumn
  he: ___
  ar: ___

- key: theme_mint
  en: Mint
  he: ___
  ar: ___

- key: theme_coral
  en: Coral
  he: ___
  ar: ___

- key: theme_slate
  en: Slate
  he: ___
  ar: ___

- key: theme_lavender
  en: Lavender
  he: ___
  ar: ___

- key: theme_crimson
  en: Crimson
  he: ___
  ar: ___

- key: theme_gold
  en: Gold
  he: ___
  ar: ___

- key: theme_forest_dark
  en: Forest Dark
  he: ___
  ar: ___

- key: theme_ocean_dark
  en: Ocean Dark
  he: ___
  ar: ___

- key: theme_slate_dark
  en: Slate Dark
  he: ___
  ar: ___

- key: theme_berry_dark
  en: Berry Dark
  he: ___
  ar: ___
```

---

## Section 8 — Misc UI (toasts, onboarding, classroom, etc.)

```yaml
- key: toast_assignment_restored
  en: Assignment restored!
  he: ___
  ar: ___

- key: toast_assignment_deleted_template
  en: "{title}" deleted
  he: ___       # keep {title} placeholder
  ar: ___

- key: toast_undo_button
  en: Undo
  he: ___
  ar: ___

- key: classroom_today_tab
  en: Pulse
  he: ___       # name of the at-a-glance dashboard tab; could be translated as "פעימה" / "نبض" or similar
  ar: ___

- key: classroom_mastery_tab
  en: Mastery
  he: ___
  ar: ___

- key: classroom_records_tab
  en: Records
  he: ___
  ar: ___

- key: classroom_assignments_tab
  en: Assignments
  he: ___
  ar: ___

- key: classroom_students_tab
  en: Students
  he: ___
  ar: ___

# Class card chrome
- key: class_card_new_assignment
  en: New assignment
  he: ___
  ar: ___

- key: class_card_share_whatsapp
  en: Share via WhatsApp
  he: ___
  ar: ___

- key: class_card_copy_class_code
  en: Copy class code
  he: ___
  ar: ___

- key: class_card_print_poster
  en: Print classroom poster
  he: ___
  ar: ___

- key: class_card_delete_class
  en: Delete class
  he: ___
  ar: ___

- key: class_card_edit
  en: Edit
  he: ___
  ar: ___

- key: class_card_duplicate
  en: Duplicate
  he: ___
  ar: ___

- key: class_card_project_to_class
  en: Project
  he: ___       # short label for the "Project to Class Show" button
  ar: ___

- key: class_card_print_worksheet
  en: Print
  he: ___       # short label for the "Print as worksheet" button
  ar: ___

# Teacher Quick Actions — extra labels picked up while auditing
- key: quick_actions_no_classes_first
  en: Create a class first!
  he: ___
  ar: ___

# Cookie banner / consent (if any hardcoded — please confirm)
# The audit didn't flag specific strings here; if your CookieConsent component has any, list them when you reply.
```

---

## RTL alignment status (Hebrew + Arabic should render right-to-left)

The infrastructure is already in place — `useLanguage` exposes `dir` and `isRTL`. Where I see `dir={dir}` applied on root elements, the page renders correctly RTL. Components flagged below are missing the `dir` attribute and need patching by me at integration time:

- ❌ `WorksheetView` root — needs `dir={dir}`
- ❌ All five dashboard modals (CreateClass, EditClass, ClassCreated, DeleteAssignment, RejectStudent) — need `dir={dir}` on the modal container
- ❌ `WordInputStep2026` — partial; needs full sweep
- ✅ LandingPage paragraphs — `dir` was added in this PR for translated paragraphs
- ✅ Game flow (already handled in existing locale-using components)

I'll add `dir={dir}` to all flagged components when I integrate the translations.

---

## Hand-back format

When you're done, you can either:

1. **Edit this file directly on GitHub** (open the PR, click the file, click ✏️, paste your translations into the `he:` and `ar:` lines, commit). I'll see the change and integrate from there.
2. **Reply in chat** with the entries pasted back — I'll create a follow-up PR.
3. **Send me a separate file** (e.g. `TRANSLATIONS-FILLED.md`) — same idea.

Whichever is easiest. Take your time with the marketing copy (Section 1 cards, Section 6 dashboard tiles) — those are the strings teachers and students see most often.

Once you hand back, integration takes me ~1-2 hours: I'll patch each locale file, add `dir={dir}` where missing, build, test, and ship via a final PR.
