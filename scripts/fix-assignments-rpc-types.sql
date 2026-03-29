-- Check the actual column types in assignments table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'assignments'
ORDER BY ordinal_position;
