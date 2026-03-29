-- Diagnostic query to check all assignments in the system
-- Run this in Supabase SQL Editor to see what assignments exist

SELECT
  a.id,
  a.title,
  a.class_id,
  c.code as class_code,
  c.name as class_name,
  a.word_ids,
  a.created_at
FROM assignments a
LEFT JOIN classes c ON a.class_id = c.id
ORDER BY a.created_at DESC
LIMIT 20;
