# Shinian design system

## 1. Visual theme and atmosphere

Shinian is a quiet, warm-light personal workspace. It should feel closer to writing on good paper than operating an admin dashboard: calm, immediate, and private. The first viewport prioritizes capture, then reveals the memo stream without decorative widgets.

## 2. Color palette and roles

- `--canvas: oklch(0.967 0.012 83)`: warm page background.
- `--sidebar: oklch(0.938 0.014 81)`: desktop navigation surface.
- `--surface: oklch(0.992 0.006 84)`: composer and elevated memo surface.
- `--ink: oklch(0.235 0.018 195)`: primary text.
- `--ink-muted: oklch(0.49 0.018 190)`: metadata and secondary text.
- `--accent: oklch(0.55 0.095 183)`: primary action and focus.
- `--accent-soft: oklch(0.91 0.035 181)`: selected and success backgrounds.
- `--danger: oklch(0.53 0.16 27)`: destructive actions only.
- `--divider: oklch(0.87 0.012 82)`: structural separators.

## 3. Typography rules

- UI stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Noto Sans SC", sans-serif`.
- Editorial accent: `"Songti SC", "STSong", "Noto Serif SC", serif`.
- Body: 16px, weight 400, line-height 1.75 for Chinese.
- Metadata: 13px, weight 450, tabular numbers.
- Section label: 14px, weight 600.
- Brand: 24px on desktop, 21px on mobile, serif accent.
- No negative letter spacing on Chinese text.

## 4. Component styling

- Buttons use a fixed 10px radius, 40px minimum hit area, and `scale(0.96)` press feedback.
- Composer uses a 16px outer radius and a soft two-layer shadow, with no visible border at rest.
- Memo entries are separated primarily by whitespace and a hairline divider, not identical floating cards.
- Inputs show an accent focus ring and retain visible keyboard focus.
- Destructive actions require a second explicit confirmation or an undo path.

## 5. Layout principles

- Mobile first, one readable column.
- Desktop uses a 228px quiet sidebar and a 720px reading column.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48.
- The composer appears before statistics or navigation detail.
- Body text is capped near 65 characters per line.

## 6. Depth and elevation

- Canvas to sidebar uses a background lightness step.
- Composer uses `0 12px 34px rgb(36 52 49 / 0.08), 0 2px 8px rgb(36 52 49 / 0.06)`.
- Memo content is normally flush; edit mode becomes an elevated surface.
- No glass effects or ornamental gradients.

## 7. Do and do not

- Do make recording possible immediately after login.
- Do preserve generous Chinese line-height.
- Do keep timestamps quiet but legible.
- Do provide empty, loading, error, and pending states.
- Do not add dashboards, streaks, or productivity scoring to the first viewport.
- Do not show disabled future navigation items.
- Do not use generic card grids.
- Do not hide recoverability for delete actions.

## 8. Responsive behavior

- At 820px and below, sidebar becomes a compact top bar.
- At 560px and below, content uses 16px horizontal padding.
- Safe-area padding is applied on iOS.
- All interactive targets remain at least 40px.
- Validate at 320px, 375px, and 1280px.

## 9. Agent prompt guide

- Composer: warm surface `oklch(0.992 0.006 84)`, 16px radius, 16px body text, 1.75 line-height, accent focus `oklch(0.55 0.095 183)`.
- Primary button: accent fill `oklch(0.55 0.095 183)`, warm-white text, 10px radius, 40px height, press scale 0.96.
- Memo row: transparent background, 24px vertical spacing, hairline divider `oklch(0.87 0.012 82)`, 13px muted timestamp.
- Sidebar: 228px width, `oklch(0.938 0.014 81)`, active item indicated by text weight and a small accent dot.

