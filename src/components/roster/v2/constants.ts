/**
 * Pastel tints used by the v2 Roster screen (avatar circles + class
 * header tile).  `default` is a warm peach so unstyled students still
 * feel alive; the other three are pulled from the dashboard's class-
 * card palette so the screen reads as the same family.
 */
export type StudentAccent = "default" | "lavender" | "rose" | "mint";

export const STUDENT_ACCENTS: Record<StudentAccent, string> = {
  default:  "linear-gradient(135deg, #FFE7C7, #FFD3A8)",
  lavender: "linear-gradient(135deg, #E6E3FF, #D5CFFF)",
  rose:     "linear-gradient(135deg, #FFDDF0, #FFC2E5)",
  mint:     "linear-gradient(135deg, #D8F0E5, #B2DCC8)",
};

export const ACCENT_ORDER: StudentAccent[] = ["default", "lavender", "rose", "mint"];

export const TIP_BG = "linear-gradient(135deg, #FFF6E0 0%, #FFEDC2 100%)";

/**
 * Deterministic accent picker keyed by student id (or display name)
 * so each student always renders with the same pastel tint across
 * loads and devices, without a DB column to back it.
 */
export function accentForStudent(seed: string): StudentAccent {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return ACCENT_ORDER[Math.abs(hash) % ACCENT_ORDER.length];
}
