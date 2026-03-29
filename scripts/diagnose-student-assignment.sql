-- Full diagnostic: Check student, class, and assignment linkage
-- Run this in Supabase SQL Editor

-- 1. Check all students and their class codes
SELECT
  'Students' as type,
  sp.id,
  sp.unique_id,
  sp.display_name,
  sp.class_code,
  sp.status,
  sp.auth_uid
FROM student_profiles sp
ORDER BY sp.created_at DESC
LIMIT 10;

-- 2. Check all classes
SELECT
  'Classes' as type,
  c.id,
  c.code,
  c.name,
  c.teacher_uid
FROM classes c
ORDER BY c.created_at DESC
LIMIT 10;

-- 3. Check all assignments with their class details
SELECT
  'Assignments' as type,
  a.id,
  a.title,
  a.class_id,
  c.code as class_code,
  c.name as class_name
FROM assignments a
LEFT JOIN classes c ON a.class_id = c.id
ORDER BY a.created_at DESC
LIMIT 10;

-- 4. Show the linkage - which students can see which assignments
SELECT
  'Linkage' as type,
  sp.display_name as student,
  sp.class_code as student_class_code,
  c.id as class_id,
  c.code as class_code_match,
  c.name as class_name,
  COUNT(a.id) as assignments_available
FROM student_profiles sp
LEFT JOIN classes c ON sp.class_code = c.code
LEFT JOIN assignments a ON a.class_id = c.id
GROUP BY sp.display_name, sp.class_code, c.id, c.code, c.name
ORDER BY sp.display_name;
