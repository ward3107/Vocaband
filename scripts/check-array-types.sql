-- Check array element types for assignments table
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'assignments'
  AND data_type = 'ARRAY'
ORDER BY ordinal_position;
