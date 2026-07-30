# PADEL2GO — Handover: News-Feature für die App (Expo / React Native)

> Für die iOS-App-Session (Expo/RN, gleicher Supabase-Backend wie Web).
> Das Web-Pendant ist live (Repo `padel2go_live`, Commits `9236014` + `ca4a58a`) —
> die App liest **dieselben Daten**, es gibt keine getrennte Pflege.
> Backend ist fertig: nichts migrieren, nichts deployen — nur konsumieren.

---

## 1. Design-Referenzen

Claude-Design-Projekt: `https://claude.ai/design/p/28649d89-e14d-4eef-84ec-2f28d5b78dc0`

- **`News App.dc.html`** — News-Tab: vertikaler Feed aus 4:5-Posts, Topic-Filter-Chips, Engagement-Zeile
- **`News Artikel App.dc.html`** — Artikel-Detail: Hero, Body, Sticky-CTA
- Design-System-Tokens liegen im selben Projekt unter `_ds/padel2go-design-system-…`

Typografie wie im Rest der App: Bricolage Grotesque (Headlines), DM Sans (Body), JetBrains Mono (Datum/Stats/Badges).

---

## 2. Datenmodell — Tabelle `articles` (Supabase, Projekt `wvvdkuextsbsecqbfksb`)

RLS: anon + authenticated lesen **nur** `is_published = true`. Kein Insert/Update aus der App.

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | uuid | PK |
| `slug` | text, unique | Deep-Link-Key (`/news/:slug` im Web) |
| `title` / `title_en` | text | Headline (max. 60 Zeichen gepflegt) |
| `title_highlight` / `_en` | text \| null | Teilsatz, der **in Topic-Farbe + kursiv** an die H1 angehängt wird |
| `excerpt` / `_en` | text \| null | Anreißer (max. 120), im Feed über/unter dem Bild |
| `lead` / `_en` | text \| null | Fetter Einstiegsabsatz im Artikel |
| `body_html` / `_en` | text | Artikel-Body als **HTML** (Tiptap) → in RN mit `react-native-render-html` o. ä. rendern |
| `cover_image_url` | text \| null | Cover, **4:5 Hochformat** |
| `cover_alt` | text \| null | Alt-Text |
| `topic` | text | **Genau einer von:** `Inside P2G`, `Events`, `Marketplace`, `Community`, `Business` (exakte Schreibweise, mit Leerzeichen) |
| `audience` | text | `everyone` \| `logged_in` \| `logged_out` — App filtert auf `['logged_in','everyone']` (Gast-Modus: `['logged_out','everyone']`) |
| `is_featured` / `featured_rank` | bool / int | Highlight-Rail, Sortierung `featured_rank` aufsteigend |
| `reading_minutes` | int | Anzeige „3 Min" |
| `published_at` | timestamptz | angezeigtes Datum |
| `sort_order` | int | **Manuelle Feed-Reihenfolge** (Admin Drag-and-Drop) — absteigend sortieren, dann `published_at` absteigend |
| `location_id` | uuid \| null | → `locations` (id, name, address, postal_code, city) für Standort-Karte + Booking-CTA |
| `cta_title` / `cta_subtitle` / `cta_label` / `cta_url` | text \| null | CTA-Box im Artikel; `cta_label`-Default „Court buchen" |
| `ai_generated` | bool | → Badge „KI-unterstützt erstellt" anzeigen (Pflicht, Audit REQ-E03) |
| `source_url` | text \| null | „Zur Quelle"-Link |
| `like_count` / `view_count` | int | Zähler (denormalisiert, Server pflegt sie) |

`seo_title`/`seo_description` sind Web-only. `news_categories`/`category_id` existieren noch in der DB, sind aber **tot** — nicht verwenden, Topics sind das System.

### Queries (identisch zum Web)

```ts
// Feed (eingeloggt)
supabase.from("articles").select("*")
  .eq("is_published", true)
  .in("audience", ["logged_in", "everyone"])
  .order("sort_order", { ascending: false })
  .order("published_at", { ascending: false });

// Highlights: client-seitig is_featured filtern, nach featured_rank asc, max 6
// Topic-Filter: client-seitig a.topic === activeTopic (Datenmenge ist klein)
// Detail: .eq("slug", slug).eq("is_published", true).maybeSingle()
// Related: .eq("topic", article.topic).neq("id", article.id)
//          .order("published_at", { ascending: false }).limit(4)
```

---

## 3. Likes & Views

### Likes — Edge Function `news-like` (deployed, verify_jwt = false)

`POST https://wvvdkuextsbsecqbfksb.supabase.co/functions/v1/news-like` mit Body `{ "article_id": "<uuid>" }`.

- **Mit** Supabase-Session (App-Normalfall): `supabase.functions.invoke("news-like", { body: { article_id } })` — Auth-Header geht automatisch mit → **1 Like pro User**, geräteübergreifend.
- **Ohne** Session (Gast): gleicher Call → Server dedupliziert **pro IP** (SHA-256-Hash, kein Klartext).
- Response: `{ liked: boolean, like_count: number }` — Toggle-Semantik (nochmal senden = Unlike).
- Client: optimistisch updaten, Response als Wahrheit übernehmen. Gelikte IDs lokal spiegeln (AsyncStorage, Key z. B. `p2g.news.liked`) nur für den Button-Zustand — der Server erzwingt die Eindeutigkeit.

Like-Button sitzt **auf jeder Feed-Card** (oben rechts, Daumen + Zähler) und im Artikel. Aktiv-Zustand = Topic-Farbe (siehe Colorway).

### Views — RPC `increment_article_view`

```ts
supabase.rpc("increment_article_view", { p_slug: slug });
```
Beim Öffnen eines Artikels, **max. 1× pro App-Session und Artikel** (in-memory Set reicht).

---

## 4. Topic-Colorcode-System (Colorway)

Jeder Post hat genau **ein** Topic; jedes Topic einen festen Akzent-Hex.
„Alle" ist kein Topic, sondern der Filter-Default (Brand-Lime).

```ts
export const TOPIC_COLORS = {
  'Alle':         '#C7F011', // nur Filter-Default
  'Inside P2G':   '#C7F011', // Brand-Lime
  'Events':       '#B06BFF', // Purple
  'Marketplace':  '#FF8A1F', // Orange
  'Community':    '#FF4D4D', // Rot
  'Business':     '#2FE0C0', // Teal
} as const;

export type Topic = Exclude<keyof typeof TOPIC_COLORS, 'Alle'>;

export const topicColor = (t: string | null | undefined) =>
  TOPIC_COLORS[t as keyof typeof TOPIC_COLORS] ?? TOPIC_COLORS['Inside P2G'];
```

### Die zwei Regeln

1. **Seiten-Akzent folgt der Auswahl.** Im News-Tab setzt der aktive Filter-Chip die Akzentfarbe des gesamten Screens. Im Artikel-Detail setzt das Topic **dieses Artikels** den Akzent.
2. **Cards tragen immer ihre eigene Topic-Farbe.** Badge, „Weiterlesen", Like-Aktiv-Zustand, Related-Teaser → Farbe des **eigenen** Topics, unabhängig vom aktiven Filter. So bleibt die gemischte „Alle"-Ansicht lesbar.

### RN-Umsetzung (statt CSS-Variablen)

Kein CSS-Var-Mechanismus in RN → Akzent über einen **React-Context** am Screen-Root, abgeleitete Alphas per 8-stelligem Hex (RN unterstützt `#RRGGBBAA`):

```tsx
const AccentContext = createContext(makeAccent(TOPIC_COLORS['Alle']));

export const makeAccent = (hex: string) => ({
  acc:  hex,          // Vollton: Buttons, Links, Zahlen, Icons, Headline-Highlight
  bg:   hex + '1F',   // 12% — Badge-Flächen, Icon-Tiles
  brd:  hex + '66',   // 40% — Borders, Zitat-Rahmen
  glow: hex + '26',   // 15% — Glows hinter Cards/CTAs
});

// News-Tab:      <AccentContext.Provider value={makeAccent(TOPIC_COLORS[activeFilter])}>
// Artikel-Screen: <AccentContext.Provider value={makeAccent(topicColor(post.topic))}>
```

Alles, was bisher hart `#C7F011` wäre, liest aus dem Context. Für Card-eigene Farben (Regel 2) **nicht** den Context nehmen, sondern `topicColor(article.topic)` direkt.

### Was den Akzent bekommt (App)

Eyebrow/Kicker (`P2G NETWORK`), Headline-Highlight, aktiver Filter-Chip (Fläche, Text `#0A0A0A`), Primär-Button/CTA (Fläche, Text `#0A0A0A`), Textlinks/„Weiterlesen", Stat-Zahlen (Mono), Zitat-Border, Icon-Tiles, Checkmarks, Lesefortschritt, Notification-Dot, aktives Tab-Icon, **Like/Save im Aktiv-Zustand**.

### Was **immer** Lime bleibt

Die „2" in `PADEL2GO`, das P2G-Logo/App-Icon, alles außerhalb der News-Section (Booking, Marketplace, Profil …).

### Kontrast

- Akzent als **Fläche** → Text immer `#0A0A0A`, nie weiß.
- Akzent als **Text** → nur auf Schwarz oder Foto-Scrim ≥ 60 % Schwarz.
- Alle fünf Hexwerte erreichen auf `#000` mind. 4.5:1 — nicht abdunkeln.

---

## 5. Karten- & Bild-Regeln

- **Cover strikt 4:5 Hochformat** (`aspectRatio: 4/5`), `resizeMode: cover`.
- Unten liegt ein schwarzer Verlauf (≈ `linear-gradient(190deg, #00000026 30%, #000000D9 92%)`) mit Datum · Lesezeit + Titel darauf; Topic-Badge oben links (Mono, uppercase, Topic-Farbe auf `#00000099` mit Blur), Like-Pill oben rechts.
- Kein Cover (`cover_image_url = null`) → dunkle Platzhalter-Kachel, kein Layout-Bruch.
- Feed scrollt **vertikal**; nur die optionale Highlight-Rail scrollt horizontal.

---

## 6. Sprache (DE/EN)

Übersetzungen liegen in `_en`-Spalten (leer → deutscher Fallback):

```ts
const localized = (row, field, lang) =>
  lang.startsWith('en') && row[`${field}_en`]?.trim() ? row[`${field}_en`] : row[field];
```

Betroffen: `title`, `title_highlight`, `excerpt`, `lead`, `body_html`. **Topic nie übersetzen** — der String ist der Schlüssel und zugleich das Anzeige-Label (DE = EN).

---

## 7. Compliance (Pflicht)

- `ai_generated = true` → Badge **„KI-unterstützt erstellt"** am Artikel (und idealerweise am Feed-Item).
- `source_url` gesetzt → Link **„Zur Quelle"** (öffnet extern).

---

## 8. Fallstricke

1. Keine dynamisch zusammengesetzten Styling-Klassennamen pro Topic (NativeWind purged sie) — Farbwerte aus `TOPIC_COLORS` direkt in Styles geben.
2. Aktiver Chip: Zustand über die Datenlage rendern, nicht über nachträglich mutierte Styles.
3. Unbekanntes Topic aus dem Backend → Fallback `Inside P2G` (Helper `topicColor` erledigt das).
4. Farb-Hexwerte kommen **nie** aus dem Backend — Zuordnung lebt nur im Frontend.
5. `body_html` ist Vertrauensinhalt aus dem eigenen CMS, aber trotzdem über einen HTML-Renderer mit fester Tag-Whitelist anzeigen.
6. Alte Bestandsartikel haben noch 16:9-Cover — `cover` -Crop akzeptieren, Florian lädt 4:5 nach.

---

## 9. Akzeptanzkriterien

1. News-Tab zeigt den Feed (4:5-Cards, vertikal), Reihenfolge = `sort_order` desc (Admin-Drag-and-Drop wirkt ohne App-Update).
2. Topic-Filter funktioniert; „Alle" ist Default; Screen-Akzent wechselt mit dem Chip.
3. Artikel-Detail übernimmt den Akzent seines Topics (inkl. `title_highlight` kursiv in Akzentfarbe).
4. Like auf Card + Detail toggelt, Zähler stimmt nach Response, 1× pro User; Gast-Likes (falls Gast-Modus) laufen über dieselbe Function.
5. View-Zähler erhöht sich beim Öffnen (1× pro Session).
6. EN-Gerät zeigt `_en`-Inhalte mit DE-Fallback.
7. KI-Badge + Quellenlink erscheinen, wo gesetzt.
