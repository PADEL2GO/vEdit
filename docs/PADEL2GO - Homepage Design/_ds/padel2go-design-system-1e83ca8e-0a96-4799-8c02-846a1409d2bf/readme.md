# PADEL2GO Design System

A design system for **PADEL2GO** — a German padel-court booking and community platform (pre-launch, 2026). PADEL2GO offers clubs a plug-and-play package (courts, booking, payments, events, community) and players a single app to book courts, join leagues, earn rewards, and connect. Owner: Florian Steinfelder. Primary market and language: **Germany / German**.

The brand is confident, energetic and sporty: **electric lime green (#C7F011) on near-black**, expressive grotesque headlines, mono numerals for stats.

## Sources

Built by reading the live product codebase:

- **GitHub:** https://github.com/PADEL2GO/padel2go_live — React 18 + TypeScript + Vite, Tailwind + shadcn/ui, Supabase, Stripe, Framer Motion. Explore this repo to build higher-fidelity designs; the marketing pages (`src/pages/Index.tsx`, `FuerVereine.tsx`, `FuerSpieler.tsx`) and the booking flow (`src/pages/Booking*.tsx`) are the richest references. Design tokens live in `src/index.css`; component styling in `tailwind.config.ts` and `src/components/ui/`.

Anyone extending this system should browse that repository for additional screens (Events, League, Rewards, Marketplace, Admin) not yet recreated here.

## Fonts

All three brand typefaces are **Google Fonts**, loaded from the CDN in `tokens/fonts.css` — no local font binaries needed, so no substitution was made.

- **Bricolage Grotesque** — display / headings (400–800; italic used for emphasis)
- **DM Sans** — body, UI labels (300–700)
- **JetBrains Mono** — stats, metrics, prices, tabular numbers

---

## Content Fundamentals

- **Language:** German throughout (`Court finden`, `Für Vereine`, `Jetzt bezahlen`). English exists as a secondary locale on the live site, but German is primary.
- **Address form:** informal **du**, never *Sie* — "Dein Padel. Dein Level. Dein Spiel." The brand talks to players as peers.
- **Voice:** short, punchy, benefit-first. Triads and fragments ("buchen, spielen, connecten"). Verbs up front ("Finde den perfekten Court", "Sammle Punkte").
- **Casing:** headlines in sentence case; the **brand name is always all-caps** `PADEL2GO` with the "2" in lime. Eyebrow labels are UPPERCASE with wide tracking (`FEATURES`, `FÜR VEREINE`).
- **Anglicisms are welcome** and on-brand: Smart Booking, Rewards, Leagues & Circuit, Community Events, Coming Soon, Plug-and-Play. German + English mix freely.
- **Numbers** carry weight — "15+ Standorte", "5.000+ Buchungen" (German decimal/thousand format: `5.000`, `€24,00`). Rendered in mono.
- **Emoji:** sparingly, as warm punctuation — 🎾 and 💚 ("Made with 💚 in Deutschland"). Never in dense UI.
- **Tone:** aspirational but grounded; sporty, inviting, a little premium. Not corporate, not jokey.

---

## Visual Foundations

- **Mood:** dark-first, high-contrast, neon-sport. Pure black (`#000`) canvas, near-white text, one electric lime accent. Feels like a premium sports app at night.
- **Color:** a **single brand color** — lime `#C7F011` (`71 91% 51%`). It's used deliberately: CTAs, the "2" in the wordmark, icons, stat highlights, focus rings, glows. Everything else is neutral (black → `0 0% 8%` cards → `15%` borders → `65%` muted text → `98%` foreground). No secondary accent colors; semantic red only for destructive.
- **Type:** Bricolage Grotesque headlines with tight tracking (−0.02em), heavy weights (700–800), sentence case, italic for expressive emphasis. DM Sans body at 1.5–1.6 line-height. Mono for every number.
- **Backgrounds:** black base with **subtle depth** — cards are a near-black diagonal gradient (`145deg, 8% → 3%`); heroes get a **lime radial glow** at top-center (`--gradient-hero`) plus large blurred lime orbs (`blur-3xl`, ~5% opacity). Photographic imagery (courts, players) appears in hero panels, always darkened with a black gradient scrim so text stays legible.
- **Gradients:** the CTA "hero" gradient runs lime→lime-glow (`90deg`); text can use a lime→brighter-lime clip (`text-gradient-lime`). No purple/blue gradients — ever.
- **Glow & shadow:** depth comes from **lime glow**, not heavy drop shadows. `--shadow-lime` (`0 0 40px lime/.3`) on primary buttons and active elements; `--shadow-card` (`0 10px 40px black/.5`) for lift. Buttons gain glow + slight lift on hover.
- **Borders:** hairline `1px` at `0 0% 15%`, often at 50% opacity. Cards' borders **turn lime (`primary/.3`) on hover** and reveal a faint lime wash — the signature interaction.
- **Corner radii:** generous. Base `--radius` 12px; cards use 16–24px (`xl`/`2xl`); **badges, nav chips, pills and status dots are fully rounded** (`radius-full`). Inputs/buttons 10–12px.
- **Cards:** dark diagonal gradient surface + hairline border + hover lime border/glow + inner content at `z-index:1` over a hover gradient overlay. No colored left-border accents.
- **Motion:** Framer Motion. Entrances are **fade + rise** (`opacity 0→1`, `y 30→0`, ~0.5–0.6s, staggered by index). Easing `ease-out` / `cubic-bezier(0.16,1,0.3,1)`. Ambient loops: gentle `float` (translateY ±20px, 6s) and `pulse-glow`. Respects `prefers-reduced-motion`.
- **Hover states:** links/nav → lime text + faint lime background pill. Buttons → brightness/glow + `translateY(-1px)` (hero variant `scale(1.05)`). Cards → lime border + glow.
- **Press states:** hero button `active:scale(1.0)` (settles back from hover scale).
- **Transparency & blur:** the nav and popovers are **glass** — `background: black/80 + backdrop-blur(24px)` with a translucent hairline border. Badges use `primary/.1`–`/.2` tints.
- **Layout:** centered container, max ~1200–1400px, `px-4`/24px gutters. Fixed glass top nav (`h-16`/`h-20`). Section rhythm ~96–128px vertical. Mobile-first: must work at 320–375px.
- **Imagery vibe:** real photography of courts/players, cool-to-neutral, always darkened with black scrims and paired with the lime accent so photos read as "night match under lights."

---

## Iconography

- **Library:** [**lucide-react**](https://lucide.dev) — the icon set used throughout the codebase. Consistent `1.5px`-ish stroke, outline style, currentColor. In these design-system HTML files it's loaded from the lucide UMD CDN and rendered with `data-lucide="name"` + `lucide.createIcons()`.
- **Common glyphs:** `map-pin`, `calendar`, `trophy`, `target`, `gift`, `video`, `brain`, `sparkles`, `arrow-right`, `check`, `user`, `settings`, `menu`, `x`, `chevron-down`, `mail`, `phone`, `lock`, `shield-check`, `star`, `eye-off`, `loader-2`.
- **Sizing:** 14–16px inline in text/buttons, 20–28px in feature tiles/stat cards. Icons are usually **lime** on feature cards, muted-foreground in nav/footer.
- **Icon tiles:** feature icons sit in a 54px rounded square with a lime→lime/60 gradient border and a black inner face (see `FeaturesSection`).
- **Brand marks (in `assets/`):** `p2g-icon-clean.png` / `p2g-app-icon.png` (the "P2G" monogram in lime + chrome), `padel2go-wordmark-light.png` (white wordmark for dark bg), `padel2go-logo.png` (mark + wordmark). Use the PNG wordmark in headers; use the `BrandName` component for inline/text lockups. **No third-party brand logos were invented.**
- **Emoji** appear only as occasional warm accents (🎾 💚), never as functional icons.
- **WhatsApp** uses its official green `#25D366` (`--whatsapp`) — the one place another color appears, for the WhatsApp Business affordance only.

---

## Components

Reusable primitives live in `components/core/` (namespace resolved by the compiler — see `check_design_system`). Each has a `.jsx`, `.d.ts`, and `.prompt.md`.

- **Button** — lime-on-black actions. Variants: `default`/`lime`, `hero` (gradient CTA), `heroOutline`, `outline`, `secondary`, `ghost`, `dark`, `destructive`, `link`. Sizes `sm`→`xl`+`icon`; `pill` for rounded nav CTAs.
- **Badge** — pill labels. `lime` (tinted, + `dot` = pulsing live indicator), `soft` ("Coming Soon" tag), `solid`, `outline`, `muted`.
- **Card** — dark gradient panel with hairline border that lights up lime on hover; the default container.
- **StatCard** — metric tile: lucide icon + mono value + muted label *(intentional addition — codifies the repeated hero/dashboard stat pattern)*.
- **Input** — dark text field with lime focus ring; fixed 16px to avoid iOS zoom.
- **BrandName** — typographic `PADEL` + lime `2` + `GO` lockup.

**Intentional additions:** `StatCard` (metric pattern used across hero/dashboard) and the reliance on CDN **lucide** for iconography. Everything else mirrors the codebase's shadcn/ui-derived components.

---

## UI Kits

- **`ui_kits/website/`** — marketing homepage recreation (nav, hero, features, clubs split, footer).
- **`ui_kits/booking/`** — interactive court-booking flow (locations → checkout → confirmation).
- **`ui_kits/dashboard/`** — logged-in "Mein P2G" dashboard (hotkeys, backend news feed, Buchung, Marketplace with P2G-Points redemption, Events).

---

## Index / Manifest

```
styles.css                 — entry point (only @imports the tokens/fonts below)
tokens/
  fonts.css                — Google Fonts import (DM Sans, Bricolage Grotesque, JetBrains Mono)
  colors.css               — brand lime, neutrals, semantic + aliases
  typography.css           — families, scale, weights, leading, tracking
  spacing.css              — 4px grid, radii, layout
  effects.css              — gradients, shadows/glow, motion, glass blur
components/core/           — Button, Badge, Card, StatCard, Input, BrandName (+ .d.ts, .prompt.md, core.card.html)
guidelines/                — foundation specimen cards (Colors, Type, Spacing, Brand)
ui_kits/website/           — marketing homepage
ui_kits/booking/           — court booking flow
ui_kits/dashboard/         — logged-in "Mein P2G" dashboard (4 launch tabs)
assets/                    — logos, marks, app-store badges, hero imagery, iPhone mockup
SKILL.md                   — Agent-Skill wrapper
```

Design System tab cards are grouped: **Colors, Type, Spacing, Brand, Components, Website, Booking, Dashboard**.
