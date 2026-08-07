# PADEL2GO — News Topic Colorcode System

Kopierbarer Handover für Claude Code (App + Website).

---

## Die 5 Topics

Jeder News-Post hat **genau ein** Topic. Jedes Topic hat einen festen Akzent-Hex.
Der Filter „Alle" ist kein Topic, sondern der Default-State und nutzt das Brand-Lime.

| Topic | Hex | Farbe |
|---|---|---|
| `Alle` (nur Filter-Default) | `#C7F011` | Brand-Lime |
| `Inside P2G` | `#C7F011` | Brand-Lime |
| `Events` | `#B06BFF` | Purple |
| `Marketplace` | `#FF8A1F` | Orange |
| `Community` | `#FF4D4D` | Rot |
| `Business` | `#2FE0C0` | Teal |

Als Konstante (eine Quelle der Wahrheit, in App und Web identisch):

```ts
export const TOPIC_COLORS = {
  'Alle':         '#C7F011',
  'Inside P2G':   '#C7F011',
  'Events':       '#B06BFF',
  'Marketplace':  '#FF8A1F',
  'Community':    '#FF4D4D',
  'Business':     '#2FE0C0',
} as const;

export type Topic = Exclude<keyof typeof TOPIC_COLORS, 'Alle'>;
```

---

## Die zwei Regeln

**Regel 1 — Seiten-Akzent folgt der Auswahl.**
Auf der News-Übersicht (Web + App) setzt der aktive Filter-Chip die Akzentfarbe der
gesamten Seite. Auf einer Artikel-Detailseite setzt das Topic **dieses Artikels** die
Akzentfarbe der Seite.

**Regel 2 — Karten tragen immer ihre eigene Topic-Farbe.**
Ein Card-Badge, ein „Weiterlesen"-Link, ein Related-Teaser ist immer in der Farbe
seines **eigenen** Topics — unabhängig davon, welcher Filter gerade aktiv ist.
So bleibt eine gemischte „Alle"-Ansicht farblich lesbar.

---

## Technische Umsetzung

Akzent als **CSS Custom Property** auf dem Seiten-Root, nicht als Prop durch den Baum:

```tsx
// Übersicht: aus dem aktiven Filter
<div className="news-root" style={{ '--acc': TOPIC_COLORS[activeFilter] } as CSSProperties}>

// Detailseite: aus dem Topic des Artikels
<article className="news-root" style={{ '--acc': TOPIC_COLORS[post.topic] } as CSSProperties}>
```

Abgeleitete Werte (nicht separat pflegen — Alpha per 8-stelligem Hex):

```
--acc         →  Volltonfarbe: Buttons, Links, Zahlen, Icons, Headline-Highlight
--acc-bg      →  --acc + '1F'   (12% — Badge-Flächen, Icon-Tiles)
--acc-brd     →  --acc + '66'   (40% — Borders, Zitat-Rahmen, Hover-Border)
--acc-glow    →  --acc + '26'   (15% — Radial-Glows hinter Cards/CTAs)
```

Alles, was vorher hart `#C7F011` war, wird zu `var(--acc)`.

### Was den Akzent bekommt

| Element | Web | App |
|---|---|---|
| Eyebrow / Kicker | ✅ | ✅ (`P2G NETWORK`) |
| Headline-Highlight (der gefärbte Teilsatz) | ✅ | ✅ |
| Aktiver Filter-Chip (Fläche, Text `#0A0A0A`) | ✅ | ✅ |
| Primär-Button / CTA (Fläche, Text `#0A0A0A`) | ✅ | ✅ |
| Textlinks, „Weiterlesen" | ✅ | ✅ |
| Stat-Zahlen (Mono) | ✅ | ✅ |
| Zitat-Border, Icon-Tiles, Checkmarks | ✅ | ✅ |
| Input-Focus-Ring | ✅ | — |
| Lesefortschritt-Balken | ✅ | ✅ |
| Notification-Dot, aktives Tab-Icon | — | ✅ |
| Like/Save im Aktiv-Zustand | — | ✅ |

### Was **immer** Lime bleibt (nie Topic-Farbe)

- Die „2" in der Wortmarke `PADEL2GO`
- Das P2G-Logo / App-Icon
- Login-Button in der Web-Navigation
- Alles außerhalb der News-Section (Booking, Marketplace, Profil …)

---

## Kontrast-Vorgaben

- Akzent als **Fläche** → Text immer `#0A0A0A`, nie weiß.
- Akzent als **Text** → nur auf Schwarz oder auf einem Foto-Scrim ≥ 60% Schwarz.
- Alle fünf Hexwerte erreichen auf `#000` mindestens 4.5:1 — nicht abdunkeln.

---

## Implementierungs-Fallstricke

1. **Nicht** pro Topic eigene Tailwind-Klassen generieren (`text-topic-events` …) — Tailwind
   purged dynamisch zusammengesetzte Klassennamen. `var(--acc)` statt Klassen-Mapping.
2. **Aktiver Chip:** Zustand über ein Attribut (`data-on`) + CSS-Regel lösen, nicht über
   inline neu berechnete Styles — sonst hängt der aktive Pill hinter dem State zurück.
3. **Fallback:** unbekanntes Topic aus dem Backend → `TOPIC_COLORS['Inside P2G']`.
4. Der Topic-Wert ist der **Schlüssel** — Backend liefert `topic` als Enum-String genau in
   dieser Schreibweise (`Inside P2G` mit Leerzeichen). Keine Farb-Hexwerte aus dem Backend
   liefern, die Zuordnung lebt nur im Frontend.
