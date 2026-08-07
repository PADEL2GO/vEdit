# Prompt für Claude Code — Backend & Admin für die News-Section

> Kopiere alles ab „## Aufgabe" in Claude Code. Die Design-Referenzen liegen in diesem Projekt:
> `News Web.dc.html`, `News App.dc.html`, `News Artikel Web.dc.html`, `News Artikel App.dc.html`.

---

## Aufgabe

Baue im PADEL2GO-Repo (`padel2go_live`, React 18 + TS + Vite + Supabase) die **News-Section** inkl. Admin-Pflege. Frontend-Design ist fertig abgenommen — du baust Datenmodell, Admin-UI und die Anbindung. Ändere kein bestehendes Design-Token-Setup.

### Kontext / Routen

| Route | Zweck |
|---|---|
| `/news` | News-Übersicht: Filter-Chips, Highlight-Rail, Grid aus **4:5-Hochformat-Cards** |
| `/news/:slug` | Artikel-Detailseite (Web) |
| App-Tab „News" | gleiche Daten, mobiler Feed aus 4:5-Posts + Artikel-Detail |
| `/admin/news` | Admin: Liste, Anlegen, Bearbeiten, Reihenfolge, Publizieren |

Web und App lesen **dieselben** Datensätze — keine getrennte Pflege.

---

## 1. Datenmodell (Supabase)

### `news_categories`
| Feld | Typ | Hinweis |
|---|---|---|
| `id` | uuid, PK | |
| `name` | text | z. B. „Standorte", „Liga", „Community", „Marketplace" |
| `slug` | text, unique | |
| `sort_order` | int | Reihenfolge der Filter-Chips |
| `is_active` | bool | |

Im Frontend wird links automatisch der Chip **„Alle"** ergänzt — nicht als Kategorie anlegen.

### `news_posts`
**Meta / Publishing**
| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| `id` | uuid, PK | ✅ | |
| `slug` | text, unique | ✅ | auto aus Titel, manuell überschreibbar |
| `status` | enum `draft` \| `scheduled` \| `published` \| `archived` | ✅ | |
| `published_at` | timestamptz | ✅ bei published | steuert Sortierung + angezeigtes Datum |
| `category_id` | uuid → `news_categories` | ✅ | genau **eine** Kategorie (Badge auf der Card) |
| `is_featured` | bool | | erscheint in der Highlight-Rail oben |
| `featured_rank` | int | | Sortierung innerhalb der Rail |
| `is_pinned` | bool | | bleibt im Grid an Position 1 |
| `reading_minutes` | int | ✅ | Anzeige „3 Min" — Vorschlag automatisch aus Wortzahl, editierbar |
| `author_id` | uuid → `profiles` | ✅ | |

**Karten- & Header-Inhalte** (das ist das, was du im Backend eintippst)
| Feld | Typ | Limit | Wo sichtbar |
|---|---|---|---|
| `title` | text | **max. 60 Zeichen** | Card-Headline + H1 im Artikel |
| `title_highlight` | text | max. 30 Zeichen | optionaler Teil der H1, der **lime + kursiv** gerendert wird (z. B. „zwei Courts, ein Statement.") |
| `excerpt` | text | **max. 120 Zeichen** | Text unter der Card im Web-Grid, im App-Feed über dem Bild-Verlauf |
| `lead` | text | max. 280 Zeichen | Fett gesetzter Einstiegsabsatz im Artikel |
| `cover_image_id` | uuid → `media` | ✅ | **4:5-Hochformat**, siehe Bild-Regeln |
| `cover_focal_x/y` | float 0–1 | | Bildausschnitt, weil das Cover je nach Viewport beschnitten wird |
| `cover_alt` | text | ✅ | Barrierefreiheit |

**Detailseiten-Extras**
| Feld | Typ | Hinweis |
|---|---|---|
| `body` | jsonb | Block-Liste, siehe Abschnitt 2 |
| `location_id` | uuid → `locations`, nullable | zeigt die Standort-Karte in der Sidebar + Sticky-CTA in der App |
| `cta_title` | text | z. B. „Slot in München sichern." |
| `cta_subtitle` | text | z. B. „Buchung ab 9 € p. P. — Points inklusive." |
| `cta_label` | text | Buttontext, Default „Court buchen" |
| `cta_url` | text | |
| `seo_title` | text | Fallback = `title` |
| `seo_description` | text | Fallback = `excerpt` |
| `og_image_id` | uuid → `media` | Fallback = Cover; **1200×630 quer** |

### `news_post_engagement`
`post_id`, `like_count`, `comment_count`, `view_count` — im App-Feed und im Artikel sichtbar. Likes/Saves pro User in `news_post_reactions` (`post_id`, `user_id`, `type` = `like` \| `save`, unique).

### `news_related`
`post_id`, `related_post_id`, `sort_order`. Wenn leer → automatisch die 4 neuesten Posts derselben Kategorie.

---

## 2. `body` — Block-Editor

`body` ist eine Liste typisierter Blöcke. Baue im Admin einen Block-Editor mit „Block hinzufügen"-Menü, Drag-Reorder und Löschen. Genau diese Typen, mehr nicht:

| Block | Felder | Rendering |
|---|---|---|
| `paragraph` | `text` (Rich: fett, kursiv, Link) | Fließtext |
| `heading` | `text` | H2 im Artikel |
| `stats` | 2–4 Einträge à `value` (max. 4 Zeichen, z. B. „11", „22h", „€0") + `label` (max. 18 Zeichen) | Kachel-Grid, Wert in Lime + Mono |
| `quote` | `text` (max. 180 Zeichen), `author`, `role` | Zitat-Card mit Lime-Border |
| `image` | `media_id`, `caption`, `alt` | Vollbreites Bild, **quer 16:9 oder 3:2** |
| `checklist` | Einträge à `label` (fett, z. B. „Ab 01.08.") + `text` | Liste mit Lime-Checkmarks |
| `embed` | `url` (YouTube / Instagram) | responsiv eingebettet |

Validierung: Artikel kann nur publiziert werden, wenn mindestens 1 `paragraph` existiert.

---

## 3. Bild-Regeln (wichtig fürs Layout)

- **Cover: strikt 4:5 Hochformat**, min. 1080×1350 px, JPG/WebP, max. 2 MB.
  Im Upload-Dialog: Seitenverhältnis erzwingen (Crop-Tool mit fixem 4:5-Rahmen), Focal-Point setzen lassen.
- Auf Cards und im App-Feed liegt unten ein schwarzer Verlauf mit Titel drauf → **motivwichtige Elemente in die obere Bildhälfte**, Warnhinweis im Admin anzeigen.
- Inline-Bilder im Body: quer, min. 1600 px Breite.
- OG-Bild: 1200×630.
- Beim Upload automatisch WebP + `srcset` in 480/768/1080/1440 erzeugen.

---

## 4. Admin-UI (`/admin/news`)

**Listenansicht:** Tabelle mit Cover-Thumbnail (4:5), Titel, Kategorie, Status-Badge, Datum, Likes/Views, Featured-Stern, Aktionen (Bearbeiten, Duplizieren, Vorschau, Archivieren). Filter nach Status + Kategorie, Volltextsuche, Sortierung nach `published_at`.

**Editor — zwei Spalten:**
- *Links (Inhalt):* Titel, Titel-Highlight, Slug, Excerpt, Lead, Cover-Upload mit 4:5-Crop, Block-Editor für `body`.
- *Rechts (Sidebar):* Status + Publikationsdatum, Kategorie, Autor, Lesezeit, Featured/Pinned-Toggles, Standort-Verknüpfung, CTA-Felder, Related-Posts-Picker, SEO-Accordion.

**Live-Vorschau:** Toggle „Web / App" — rendert die echte Card **und** die Detailansicht in 4:5, damit sofort sichtbar ist, ob Titel und Excerpt im Verlauf passen. Zeichenzähler an Titel und Excerpt, der ab Limit rot wird.

**Publishing:** Draft speichern, „Vorschau-Link" (signierter Token, funktioniert ohne Login), Scheduled Publishing via Cron, Änderungen an publizierten Posts erst nach „Aktualisieren" live.

---

## 5. API / Queries

- `GET /news?category=&cursor=&limit=12` → Grid, Cursor-Pagination über `published_at`, nur `status = published`
- `GET /news/featured?limit=4` → Highlight-Rail (`is_featured`, nach `featured_rank`)
- `GET /news/:slug` → Detail inkl. Autor, Standort, Related, Engagement
- `POST /news/:id/reactions` → Like/Save togglen (auth required)
- Admin-Endpunkte CRUD unter `/admin/news`, geschützt per RLS

**RLS:** öffentlich lesbar nur `status = published` und `published_at <= now()`; Schreibrechte nur für Rolle `admin` / `editor`. Reactions: User darf nur eigene Zeilen schreiben.

---

## 6. Akzeptanzkriterien

1. Neuer Post im Admin anlegbar, inkl. 4:5-Cover mit Crop und Focal-Point.
2. Post erscheint nach Publizieren auf `/news`, im App-Tab und unter `/news/:slug` — ohne Deploy.
3. Kategorie-Filter funktioniert auf Web und App, „Alle" ist Default.
4. Featured-Posts erscheinen in der Highlight-Rail in der gesetzten Reihenfolge.
5. Zeichenlimits werden im Admin durchgesetzt; zu lange Titel brechen das Card-Layout nicht.
6. Like/Save persistiert pro User und aktualisiert die Counter optimistisch.
7. Scheduled Post geht zum gesetzten Zeitpunkt automatisch live.
8. Lighthouse Performance ≥ 90 auf `/news` (Bilder lazy + `srcset`).
