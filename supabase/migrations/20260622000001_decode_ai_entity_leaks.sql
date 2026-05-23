-- Decode AI-generated rows that were stored with HTML-entity-encoded
-- punctuation by the old sanitizeAiOutput() (server.ts).  The function
-- used to convert `'`, `"`, `&`, `<`, `>` into their entity forms; every
-- consumer in this codebase renders those columns as TEXT in React, so
-- the entities leaked through to teachers as literal `Leo&#x27;s`.
--
-- We've since switched the sanitizer to a strip-tags approach, but the
-- rows already in these tables remain entity-encoded.  This one-shot
-- decode brings stored data back to its correct form.
--
-- Order of unescape matters: `&amp;` last so a literal "&lt;" in source
-- doesn't get double-decoded.

UPDATE public.sentence_cache
SET sentence = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
       sentence,
       '&#x27;', ''''),
       '&quot;', '"'),
       '&lt;',  '<'),
       '&gt;',  '>'),
       '&amp;', '&')
WHERE sentence ~ '&(#x27|quot|lt|gt|amp);';

UPDATE public.vocabulary_set_word_sentences
SET text = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
       text,
       '&#x27;', ''''),
       '&quot;', '"'),
       '&lt;',  '<'),
       '&gt;',  '>'),
       '&amp;', '&')
WHERE text ~ '&(#x27|quot|lt|gt|amp);';
