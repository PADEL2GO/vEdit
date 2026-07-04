# 📄 Handover-Brief — Events (Übersicht + Detail)

> Für Claude Design. Zwei Seiten: **Event-Übersicht** (`/events`) und **Event-Detail** (`/events/:slug`). Stil wie Booking: interaktiv, icon-/visual-reich, aber simpel und easy to use.

## 1. Kontext
Öffentliche **Event-Seiten** von PADEL2GO — Padel-Events, Partys, Turniere, Community-/Corporate-Events. Ziel: Events entdecken → filtern → Detail ansehen → **Tickets (extern) kaufen**. Sportlich-energetisch, „Padel, Beats & gute Leute". Dark/Lime, mobil ab 320px.

## 2. Design-System (beibehalten)
- Dark `#000000` / Text `#FAFAFA`; Markenfarbe Lime `#C7F011`.
- Überschriften *Bricolage Grotesque*, Text *DM Sans*, **Datum/Uhrzeit/Preis in *JetBrains Mono*** (`.font-stat`).
- Karten `rounded-2xl`, `.bg-gradient-card`, Hover-Lime-Border + Glow.
- Einheitlicher Content-Wrapper `max-w-[1200px]` + 20px Seitenpadding (wie Homepage), konsistente Sektionsabstände.
- Framer Motion: fade+rise, Hover-Scale auf Karten/Bildern.

## 3. Design-Ziele
Interaktiv & visuell (Filter-Pills mit aktivem Zustand, Datums-Badges auf Bildern, Hover-Effekte, Icon-reiche Meta-Zeilen), aber aufgeräumt und schnell scanbar. Klare Primär-Aktion je Karte/Screen (Details & Tickets).

---

## 4. `/events` — Übersicht (Sektionen von oben nach unten)

**① Hero** (Vollbild ~80vh)
- Hintergrundbild (Event-Foto, Asset) + dunkles Overlay + Verlauf nach unten.
- Badge-Pill „Events & Community" (`sparkles`).
- H1: „Padel, Beats &" + **Lime-Gradient „gute Leute."**
- Untertitel.
- **Trust-Strip** (3 Icon-Items): Local DJs (`music`), Partner Brands (`gift`), Limited Spots (`ticket`).
- 2 CTAs: „Nächstes Event entdecken" (→ Anchor Featured) + „Alle Termine ansehen" (→ Anchor Filter).

**② Featured-Event** (großes Hero-Panel, nur wenn vorhanden)
- Prominentes Panel für das hervorgehobene Event: großes Bild (Fallback `sparkles`), „Featured Event"-Badge, Titel, Datum/Ort, Kurzinfo, **CTA „Details & Tickets"** → Detailseite. Danach Glow-Divider.

**③ Filter + Grid**
- Section-Header: H2 „Kommende Events" / „Vergangene Events" (togglebar) + Subtitle.
- **Filterleiste** (sehr interaktiv):
  - **Suchfeld** (`search`, mit Clear-`x`) — sucht Titel/Stadt/Venue/Highlights/Artists.
  - **Kategorie-Pills** (single-select, aktiver Lime-Zustand): Party, Day Drinking, Turnier, Community, Corporate, Open Play.
  - **Zeit-Pills:** Heute / Wochenende / Diesen Monat.
  - Toggle „Vergangene anzeigen", „Filter zurücksetzen" (nur bei aktiven Filtern).
- **Event-Grid** (Karten, ganze Karte klickbar → Detail). Jede **Event-Card** (icon-/visual-reich):
  - Cover-Bild (aus DB `image_url`; Fallback: Gradient + `ticket`-Icon).
  - **Datums-Badge** overlay oben links (Tag groß + Monat, mono).
  - Kategorie-Badge (Event-Typ), Titel, Meta-Zeile: Datum (`calendar`), Uhrzeit (`clock`), Ort (`map-pin`), Artists-Anzahl (`music`).
- **Zustände:** Loading (3 Skeleton-Karten `animate-pulse`), **Empty** (upcoming → `sparkles` „Coming Soon" + „Newsletter abonnieren"; past → `calendar-x`).

**④ Benefits „Was dich erwartet"**
- Badge „Mehr als Padel" + H2 + Subtitle.
- **4 Benefit-Karten** mit Icons/Farbverläufen: Musik/DJs (`mic-2`), Food & Drinks (`utensils-crossed`), Partner/Brands (`handshake`), Games/Open Play (`gamepad-2`).
- **Zwei-Spalten-Panel:** links **Newsletter-Anmeldung** (E-Mail-Input + „Anmelden", States: Laden/Erfolg „Du bist dabei!"); rechts **„Event planen?"** (`party-popper`) mit „Jetzt anfragen" (→ `/faq-kontakt?reason=verein`) + „Mehr erfahren" (→ `/fuer-partner`).

## 5. `/events/:slug` — Detail

**① Hero**
- Back-Button „Zurück zu Events" (`arrow-left`).
- Großes Hero-Bild (aus DB `image_url`; Fallback Gradient + `sparkles`) + Verlauf.
- **Info-Overlay** (überlappend): Badges (Event-Typ, optional „Featured"), H1 Titel, Meta-Zeile: Datum (`calendar`), Uhrzeit-Range (`clock`), Kapazität (`users`).

**② Content (Grid `lg:grid-cols-3`)**
- **Hauptspalte (2/3)** — jeweils nur wenn Daten vorhanden:
  - **Über das Event** (Beschreibung, `whitespace-pre-line`).
  - **Highlights** als Badge-Wolke.
  - **Line-up:** Grid von **Artist-Karten** (Avatar / `music`-Fallback, Name, Rolle: DJ/Live-Act/Host/Coach/Pro/Influencer, Instagram- + Website-Links `external-link`).
  - **Partner:** Brand-Logos als Links (Fallback: Name als Text).
  - **Location:** Karte (`map-pin`) mit Venue, Adresse, PLZ/Stadt, Button „Route planen" → extern.
- **Sidebar / Ticket-CTA (1/3, sticky):** `ticket`-Icon, Preis groß (mono), Datum/Zeit, Kapazität, **Haupt-Button „Tickets sichern"** → **externer** `ticket_url` (neuer Tab), Hinweis „Ticketverkauf über externen Anbieter".

**③ Ähnliche Events** (bis zu 3 Event-Cards, gleicher Typ).

**Zustände:** Loading-Skeleton; **Not-Found** („Event nicht gefunden" + „Zurück zu Events").

---

## 6. Backend-Wiring (bleibt erhalten)
- **Events** ← Tabelle `events` (`title, slug, description, city, start_at, end_at, image_url, ticket_url, event_type, price_label, highlights[], featured, venue_name, address_line1, postal_code, capacity, location_url`), nur `is_published=true`.
- **Line-up** ← `event_artists`, **Partner** ← `event_brands`.
- **Bilder aus DB** (`image_url`, Artist/Brand-Logos) — **kein** SiteVisual hier; Hero-Übersicht nutzt ein statisches Asset (`events-hero.jpg`). Fallbacks = lucide-Icons.
- **Ticketkauf ist EXTERN** (Link), kein interner Checkout.
- Newsletter ← Tabelle `newsletter_subscribers`.

## 7. Wichtig (Rahmen)
- **Nur Optik/Styling** — Routen, Filter-Logik, Datenquellen, externer Ticket-Flow bleiben unverändert; nichts löschen.
- Slug-Routing (`event.slug || event.id`) beibehalten.
- Mobil-first ab 320px.
- _Nice-to-have:_ Sub-Komponenten (EventCard/FeaturedEvent/EventFilters/NewsletterCTA) sind aktuell nicht i18n-angebunden (hartcodiertes Deutsch) — beim Umbau möglichst an den `events`-Namespace anbinden (falls einfach machbar), sonst unverändert lassen.
