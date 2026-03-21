-- Migration 008: Update class code length constraint
-- Class codes changed from 6-digit numeric to 8-char alphanumeric for better entropy.
-- Allow existing 6-char codes to still work, accept new 8-char codes.

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_code_check;
ALTER TABLE public.classes ADD CONSTRAINT classes_code_check
  CHECK (char_length(code) >= 6 AND char_length(code) <= 20);
