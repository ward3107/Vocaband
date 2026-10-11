# Unified teacher and student design — 11 October 2026

## Direction

One Vocaband interface across the teaching and learning journeys: cool paper
background, off-white cards, dark ink, indigo primary actions and restrained
violet accents. Activity colors identify individual games; success, warnings
and destructive actions retain their meanings. Purchased student cosmetics and
teacher-selected palettes remain available.

## Shared system

- `src/index.css`: canonical surfaces, type colors and geometry; readable muted
  labels replace translucent black. Body type uses the existing self-hosted
  Plus Jakarta Sans and Heebo fonts, with system Arabic fallbacks.
- `src/styles/ios.css`: aliases flow from `--vb-*` to `--ios-*`. It no longer
  installs a competing palette with higher-specificity root selectors. Light,
  dark and teacher palette changes reach both component families.
- `src/styles/design-system.css`: page/content frames, cards, actions, headings,
  fields, hero and header treatments. New navigation/action controls use at
  least 44px targets. Layout uses logical spacing and text-start.
- BrandWordmark, WorkspaceHeader, TopAppBar, PageHero and CreationPageShell
  provide recurring orientation. The teacher's top bar remains available when
  scrolling, instead of disappearing until returning to the very top.
- IOSCard, IOSButton, IOSNavBar and ModalShell use the shared styling. Modal
  titles wrap, close targets are larger and modal body/footer colors follow
  the active palette. Existing dismissal/focus behavior remains in place.

## Screen coverage

| Journey | Updated presentation |
| --- | --- |
| Teacher home | Welcome/action hero with real class/assignment counts; coordinated activity and management cards; neutral class-card bodies with per-class tinted headers; help remains available below the main tools. |
| Teacher sign-in and signup | Shared paper canvas, brand identity and indigo hero treatment; authentication behavior unchanged. |
| Class management, approvals and worksheet results | Shared page hero/frame, calmer card borders/shadows, consistent type and surfaces. |
| Assignment, Quick Play, Class Show, Hot Seat, Wheel, Vocabagrut creation | Shared CreationPageShell/PageHero and activity navigation with consistent widths, gaps and touch targets. |
| Vocabulary library, gradebook, analytics and worksheets | Shared navigation, page surfaces and typography; existing data/table structure retained. |
| Student sign-in and Quick Play join | Cohesive canvas, header, form cards and shared iOS controls. Student sign-in can scroll on short displays. |
| Student home | Responsive, labeled destination cards replace the orbital navigation. Companion evolution and accessory/claim actions remain present. |
| Assignments and game selection | Shared task cards and a responsive game-card grid. Allowed modes, completion, mastery, recommended-next state and Quick Play locks remain enforced and exposed to assistive technology. |
| Game instructions, active play and results | Shared card geometry, header/actions, progress indicators, type hierarchy and default canvas; per-game interaction and equipped themes remain intact. |
| Practice, daily, shop, ranks and privacy | WorkspaceHeader, theme-aware cards, larger targets and logical layout. Ranking names can wrap and medal numbers use dark text. |
| Hebrew teacher hub and mode selection | Same neutral surfaces and activity-card hierarchy as English. |
| Live presentation/Arena | Shared font/tokens apply to surrounding UI; projector geometry, canvas controls, round timing and scoring are retained. |
| Public/manager/developer views | Inherit shared global type and design tokens; specialized marketing, admin and game canvases keep their purpose-specific composition. |

## Verification

- Production build and entry-closure budget: 75.1kB gzip (80kB budget).
- TypeScript validation passes.
- Existing mode-picker tests updated to assert cards, completion labels and
  the companion in its new position.
- New authenticated browser coverage exercises both roles, creation flows,
  assignments/game selection, student destinations, Hebrew/Arabic and
  light/dark palette parity. Screenshots are retained as
  `unified-design-visuals` by the existing browser workflow.
- Browser screenshots and full CI are reviewed on the pull request before
  release. Browser tests use mocked accounts, not classroom production data.

No server, database, socket protocol, entitlement or authentication logic is
changed. This visual pass does not certify a physical iPhone/projector or a
live classroom session; those remain the existing operator acceptance items.
