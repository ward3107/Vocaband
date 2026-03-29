-- SQL Query to check for any tables that might contain motivational phrases
-- Run this in your Supabase SQL Editor

-- Check if there's any table with motivational phrases
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM
  information_schema.columns
WHERE
  table_schema = 'public'
  AND (column_name ILIKE '%motiv%'
       OR column_name ILIKE '%phrase%'
       OR column_name ILIKE '%audio%'
       OR table_name ILIKE '%motiv%'
       OR table_name ILIKE '%phrase%')
ORDER BY
  table_name,
  ordinal_position;

-- If you find a motivational phrases table, you can view its contents
-- Uncomment and modify the table name below:

-- SELECT * FROM motivational_phrases ORDER BY id;
-- SELECT * FROM motivational_audio ORDER BY created_at;
