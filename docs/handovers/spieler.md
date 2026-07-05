# 📄 Handover-Brief — „Für Spieler" (`/fuer-spieler`)

> Für Claude Design. Öffentliche **Marketing-Landingpage für Spieler:innen** (nicht eingeloggte Besucher). Stil wie Booking/Events: sehr interaktiv, viele Icons/Visuals, aber simpel & easy to use. Ziel: Spieler begeistern → **Court buchen / App laden / registrieren**.

## 1. Kontext
Die „Spieler"-Seite (Nav-Tab „Spieler") verkauft das Spieler-Erlebnis von PADEL2GO: **Court buchen → KI-Analyse → P2G Points → Marketplace/Rewards**. Zielgruppe: noch nicht eingeloggte Besucher. Sportlich, energetisch, premium. Dark/Lime, mobil ab 320px. Diese Seite ist bereits die **visuell reichste** der Marketing-Seiten (Video-Hero, App-Phone-Mockup, Level-Kacheln, KI-Sektion) — dieser Reichtum soll erhalten/ausgebaut werden, ohne unübersichtlich zu werden.

## 2. Design-System (beibehalten)
- Dark `#000000` / Text weiß; Markenfarbe **Lime `#C7F011`**.
- Überschriften *Bricolage Grotesque* (black/800), Text *DM Sans*, **Zahlen/Stats in *JetBrains Mono*** (`.font-stat`).
- Karten `rounded-2xl`/`rounded-3xl`, dunkle Flächen mit 1px-Border, Hover: scale/lift + farbiger Glow.
- Radiale Lime-Glows hinter Sektionen, dezente Grün-Tönung mancher Sektions-Hintergründe.
- Framer Motion: fade+rise/slide, Hover-Scale.
- **Hinweis Farbpalette:** Diese Seite nutzt aktuell **pro Sektion zusätzliche Akzentfarben** (Lime = Haupt, dazu Sky-Blau für KI, Amber für Marketplace, Violett/Orange in einzelnen Karten). Das weicht bewusst vom „nur Lime"-Prinzip der Homepage ab. → Bitte entscheiden: entweder diese farbcodierte Vielfalt beibehalten (mehr Visualität) oder auf Lime vereinheitlichen. Empfehlung: beibehalten, da es die Sektionen unterscheidbar macht.

## 3. Design-Ziele
Maximale Interaktivität/Visualität (animierte Karten, Phone-Mockup, Level-Kacheln, Icon-reiche Feature-Listen, Hover-Glows), aber klar geführt und schnell scanbar. Jede Sektion hat **eine** klare Aktion. Kein Login-Zwang — alle CTAs führen zu Buchung/App/Rewards.

---

## 4. Seitenaufbau — Sektion für Sektion (6 Sektionen)

### ① HERO (Vollbild ~85–100vh)
- **Hintergrund: admin-verwaltbares Video ODER Bild** (Backend `SiteVisual`): YouTube/Vimeo/mp4 als Autoplay-Loop, sonst Bild, sonst statisches Fallback-Foto. Darüber dunkler Verlauf + **radialer Lime-Glow oben-mitte**.
- Badge-Pill „Für Spieler" (`sparkles`).
- **Headline** (sehr groß, black): „Dein Spiel. **Deine Daten.** Deine Rewards." (Mittelteil Lime).
- Beschreibung: „Court buchen in Sekunden, KI analysiert dein Match, P2G Points landen automatisch in deinem Wallet — einlösbar für Equipment, Spielzeit und mehr."
- **2 CTAs:** primär (Lime, Glow) „Court buchen" (`map-pin` → `/booking`) · sekundär (Glas) „App herunterladen" (`smartphone` → `/app-booking`).
- **Trust-Chips** (4, Glas-Pills mit Lime-Icon): „Kostenlose Registrierung" (`check-circle`), „Buchung in < 30 Sek." (`zap`), „EU-weite P2G Liga" (`star`), „Marketplace & Rewards" (`gift`).

### ② ÖKOSYSTEM — 3 Schritte
- Badge „Das Ökosystem" (`zap`). H2 „Vom Match zur **Belohnung**". Subtitle „Jede Buchung, jedes Match, jeder Punkt zählt – automatisch."
- **3 farbcodierte Karten** (Lime / Sky / Amber), je mit **großer, blasser Hintergrund-Nummer** (01/02/03), Icon-Kachel, Tag (uppercase), Titel, Text; **Pfeil-Connector (`chevron-right`)** zwischen den Karten (Desktop):
  1. **Buchen** (`calendar`, lime) — „Court in Sekunden buchen" · Standort wählen, Slot sichern, bezahlen.
  2. **Analysieren** (`camera`, sky) — „KI erfasst dein Spiel" · Wingfield-Kameras tracken Heatmap, Schläge, Match-Score.
  3. **Verdienen** (`coins`, amber) — „P2G Points sammeln" · Je besser du spielst, desto mehr Points.

### ③ APP HUB (2-Spalten, das Highlight)
Hintergrund leicht grün getönt + radiale Glows. Links Text, rechts Phone.
- **Links:** Badge „Alles in einer App" (`smartphone`). H2 „Dein **All-in-one** Padel-Hub". Subtitle. **3 Feature-Zeilen** (Icon-Kachel + Titel + Text): Buchen <30 Sek (`calendar`/lime), Stats/Heatmaps/Match-Analyse (`bar-chart-3`/sky), P2G Points & Rewards (`coins`/amber). 2 CTAs: „Jetzt buchen" (→ `/booking`) + „App herunterladen" (→ `/app-booking`).
- **Rechts: detailliertes iPhone-Mockup** (rein via CSS gebaut, KEIN Bild — bitte als echtes UI nachbauen). Inhalt des App-Screens:
  - Notch + Status-Bar (9:41).
  - App-Header „PADEL**2**GO" + Punkte-Pill „247 pts" (mono).
  - **Lime Suchleiste** „Standort suchen…" (`map-pin` + Pfeil).
  - **Court-Verfügbarkeits-Card:** „P2GO München · 3 Courts frei" (Live-Dot), 4 Zeit-Slots (11:30 aktiv/lime, Rest inaktiv).
  - **Wochen-Stats-Card:** „Deine Woche" (`bar-chart-3`) + 7-Balken-Diagramm (Sa hervorgehoben) + Wochentage.
  - Lime CTA-Button „Court buchen" (`calendar`).
  - **2 schwebende Karten:** oben-rechts Notification „+50 P2G Points! · Match abgeschlossen" (`trophy`); unten-links „Skill: Expert · ↑ 3 Plätze diese Woche" (`activity`).
  → Micro-Interactions willkommen (Glow, sanftes Floaten der Karten).

### ④ P2G POINTS
- Badge „P2G Points" (`coins`). H2 „Sammle **P2G-Credits** mit jedem Match". Subtitle.
- **3 Earn-Karten** (zentriert, Icon-Kachel + Titel + Text): „Punkte bei jeder Buchung" (`calendar`/lime), „Buchungsstreaks" (`flame`/orange), „Freunde & Matches" (`users`/violett).
- **Expert-Level-Panel:** Titel „Dein Expert-Level bestimmt deinen **Multiplikator**", Subtitle. **Grid von 8 Level-Kacheln** (jede mit Farbverlauf-Hintergrund, Emoji, Name, Punkte-Range in mono):
  🌱 Beginner · 🎾 Rookie · ⚡ Player · 🔥 Expert · 💎 Pro · 👑 Master · 🏆 Champion · 🌟 Legend.
  Darunter Link „Mehr über P2G Points erfahren" (→ `/rewards`).

### ⑤ MARKETPLACE (Amber-Akzent)
- Badge „Marketplace" (`shopping-bag`, amber). H2 „Points einlösen — **echter Wert**". Subtitle „Von Court-Zeit bis zu exklusivem Equipment."
- **4 Item-Karten** (Icon-Kachel + Titel + Sub): Court-Buchungen (`calendar`/lime), Equipment (`dumbbell`/sky), Partner-Rewards (`gift`/amber), Events (`award`/violett).
- **Admin-Banner** (großes Querformat-Bild, Backend `SiteVisual` `fuer-spieler.marketplace.banner`; Fallback: Platzhalter-Box mit `shopping-bag`).
- CTA „Zum Marketplace" (amber, → `/dashboard/marketplace`).

### ⑥ KI-ANALYSE (Sky-Blau-Akzent, „Coming Soon")
- **Hintergrund: admin-verwaltbares Video** (Backend `SiteVisual` `fuer-spieler.ki.video-1`) + dunkler Verlauf.
- 2 Badges nebeneinander: „KI-Analyse" (`brain`, sky) + **„Coming Soon"** (amber, Puls-Dot).
- H2 „Deine Performance. **Live analysiert.**". Ausführliche Beschreibung (Wingfield-KI, Match IQ, Speed & Placement, Head-2-Head, Skill-Benchmark).
- **„Powered by [Wingfield]"** — Wingfield-Logo/Farbe kommt aus dem Backend (Partner-Tile).
- **3 Stat-Kacheln** (mono, sky): „6+ Schlagtypen analysiert", „0–100 Drill Score pro Übung", „Auto Scoring & Clipping".
- **6 Feature-Karten** (Icon + Titel + Text): Match IQ Report (`activity`), Speed & Placement (`target`), Head-2-Head Stats (`line-chart`), Skill Assessment/WSA (`brain`), Auto Clip Generation (`video`), Drills & Leaderboards (`trophy`).
- **„So funktioniert's"-Panel** (`camera` + Erklärtext).
- CTA „Benachrichtigt werden" (sky, → `/faq-kontakt`) + Hinweis „Wir informieren dich, sobald KI-Analyse an deinem Standort live geht."

---

## 5. Backend-Wiring (bleibt erhalten)
- **Admin-verwaltbare Visuals** über `SiteVisual`/`site_visuals` (im Admin unter „Für Spieler" belegbar) — vorhandene Keys:
  - `fuer-spieler.hero.video` + `fuer-spieler.hero.image` (Hero-Hintergrund) · Fallback-Asset `fuer-spieler-hero.png`.
  - `fuer-spieler.ki.video-1` (KI-Sektion-Hintergrundvideo).
  - `fuer-spieler.marketplace.banner` (Marketplace-Banner).
  - _(zusätzlich angelegt, aktuell ungenutzt: `fuer-spieler.booking.visual`, `fuer-spieler.ki.video-2`, `fuer-spieler.ki.screenshot`, `fuer-spieler.wingfield.action` — können fürs neue Design genutzt werden.)_
- **Wingfield-Badge** ← Partner-Tile aus `partner_tiles` (`usePartnerTiles`, slug „wingfield": Logo + bg_color).
- **8 Expert-Level** (Name, Punkte-Range, Farbverlauf) ← `EXPERT_LEVELS` (`src/lib/expertLevels.ts`).
- **i18n-Namespace `spieler`** (de + en) — Texte über `t()`. Alle oben zitierten Texte stammen aus `src/locales/de/spieler.json`.
- Phone-Mockup + alle übrigen Icons/Visuals sind **CSS/lucide** (kein zusätzliches Bildmaterial nötig).

## 6. Wichtig (Rahmen)
- **Nur Optik/Styling** — Sektionen, Reihenfolge, Texte, CTAs/Routen (`/booking`, `/app-booking`, `/rewards`, `/dashboard/marketplace`, `/faq-kontakt`) und Backend-Bindungen (SiteVisual-Keys, Wingfield-Tile, Expert-Levels, i18n) bleiben erhalten; nichts löschen.
- **Keine Login-Sperre** — reine öffentliche Marketing-Seite.
- Mobil-first ab 320px; das Phone-Mockup muss auf kleinen Screens sauber skalieren/umbrechen.
- „Coming Soon"-Kennzeichnung der KI-Sektion beibehalten.
