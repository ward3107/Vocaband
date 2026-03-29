-- Check actual assignment data and pg_typeof for arrays
SELECT
  id,
  title,
  pg_typeof(word_ids) as word_ids_type,
  pg_typeof(allowed_modes) as allowed_modes_type,
  word_ids,
  allowed_modes
FROM assignments
LIMIT 1;
