/**
 * arenaMaps — the themed board backgrounds a teacher can pick for Word Hunt
 * Arena. Ids are the shared contract (QP_ARENA_MAP_IDS in quickPlayProtocol);
 * this registry hangs the art + localized names off them. The chosen id rides
 * ARENA_START → ARENA_STATE, so the host projector and every student phone
 * paint the same scene. Assets live in public/arena-maps/ (WebP, 10:7 to
 * match the arena's logical aspect; a small -thumb companion feeds the picker).
 */
import { QP_ARENA_MAP_IDS, type QpArenaMapId } from "../../core/quickPlayProtocol";

export interface ArenaMap {
  id: QpArenaMapId;
  emoji: string;
  /** Full-resolution board background. */
  bg: string;
  /** Lightweight version for the teacher's picker grid. */
  thumb: string;
  name: Record<"en" | "he" | "ar", string>;
}

const META: Record<QpArenaMapId, { emoji: string; name: ArenaMap["name"] }> = {
  islands:    { emoji: "🏝️", name: { en: "Tropical Islands", he: "איים טרופיים", ar: "جزر استوائية" } },
  forest:     { emoji: "🍄", name: { en: "Enchanted Forest", he: "יער קסום", ar: "غابة مسحورة" } },
  frozen:     { emoji: "❄️", name: { en: "Frozen Peaks", he: "פסגות קרח", ar: "قمم جليدية" } },
  volcano:    { emoji: "🌋", name: { en: "Volcano Isles", he: "איי הר געש", ar: "جزر البراكين" } },
  space:      { emoji: "🪐", name: { en: "Outer Space", he: "חלל חיצון", ar: "الفضاء الخارجي" } },
  candy:      { emoji: "🍬", name: { en: "Candy Land", he: "ארץ הממתקים", ar: "أرض الحلوى" } },
  underwater: { emoji: "🐠", name: { en: "Coral Reef", he: "שונית אלמוגים", ar: "الشعاب المرجانية" } },
  desert:     { emoji: "🏜️", name: { en: "Desert Dunes", he: "דיונות מדבר", ar: "كثبان الصحراء" } },
  jungle:     { emoji: "🦖", name: { en: "Dino Jungle", he: "ג'ונגל דינוזאורים", ar: "أدغال الديناصورات" } },
  kingdom:    { emoji: "🏰", name: { en: "Royal Kingdom", he: "ממלכה מלכותית", ar: "المملكة الملكية" } },
  city:       { emoji: "🏙️", name: { en: "Busy City", he: "עיר תוססת", ar: "مدينة مزدحمة" } },
};

/** Stable order (matches the protocol allowlist) for the picker grid. */
export const ARENA_MAPS: ArenaMap[] = QP_ARENA_MAP_IDS.map((id) => ({
  id,
  emoji: META[id].emoji,
  name: META[id].name,
  bg: `/arena-maps/${id}.webp`,
  thumb: `/arena-maps/${id}-thumb.webp`,
}));

export function arenaMapById(id: string | null | undefined): ArenaMap | null {
  return ARENA_MAPS.find((m) => m.id === id) ?? null;
}

/** A random map id — what the teacher's 🎲 option resolves to at start. */
export function randomArenaMapId(): QpArenaMapId {
  return ARENA_MAPS[Math.floor(Math.random() * ARENA_MAPS.length)].id;
}
