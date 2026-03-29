SELECT
  student_profiles.display_name as student_name,
  student_profiles.class_code as student_class_code,
  classes.id as class_id,
  classes.code as actual_class_code,
  assignments.title as assignment_title,
  assignments.class_id as assignment_class_id
FROM student_profiles
LEFT JOIN classes ON student_profiles.class_code = classes.code
LEFT JOIN assignments ON assignments.class_id = classes.id
WHERE student_profiles.status = 'approved';
