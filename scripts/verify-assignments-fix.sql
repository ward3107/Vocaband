-- Run this in the Supabase SQL Editor to verify the RPC fix is applied.
-- Expected: sentence_difficulty should be "smallint" (not "integer").

-- 1. Check the RPC return type
SELECT
  proname AS function_name,
  pg_get_function_result(oid) AS returns
FROM pg_proc
WHERE proname = 'get_assignments_for_class';

-- 2. Check the actual table column type
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'assignments'
  AND column_name = 'sentence_difficulty';

-- 3. Test the RPC with a known class_id (replace with a real one)
-- SELECT * FROM get_assignments_for_class('your-class-id-here');
