# 🎨 PADEL2GO — Design-Redesign-Tracker

> Gemeinsamer Log (Florian + Claude). **Ziel: jede Seite und jede Maske einmal via Claude Design neu aufbauen.**
> Wir pflegen diesen Log zusammen — Status pro Seite/Maske hier aktualisieren.

**Stand:** 2026-07-04 · **Seiten gesamt:** 65 · **Masken gesamt:** 364 · **umgesetzt:** 1 / 65

**Legende:** ⬜ offen · 🟨 Brief erstellt / bei Claude Design · 🟦 Design erhalten, Umsetzung offen · ✅ umgesetzt

### Ablauf pro Seite
1. Claude schreibt Handover-Brief (genaue Beschreibung der Seite) → 🟨
2. Florian generiert Design in Claude Design & bringt es zurück → 🟦
3. Claude setzt **nur Styling** um — keine Funktion, keine Logik, keine Inhalte, nichts löschen → ✅
4. **Florian übernimmt die visuelle Begutachtung** (ab 2026-07-04). Claude implementiert + Build-Check, dann Übergabe zur Sichtung.

---

## ⚙️ Launch-Datum (global, admin-pflegbar) — ✅ 2026-07-05
Neues Feld **Admin → Features → „Launch-Datum"** (`site_settings.launch_date`, Hook `useLaunchDate`). Treibt den **Homepage-Countdown + Badge** und den **Events-Launch-Placeholder**. **⚠️ Migration ausführen:** `supabase/migrations/20260705130000_add_launch_date.sql`.

---

## 🌐 Global / geteilte Komponenten
_Erscheinen auf vielen Seiten — einmal neu designen wirkt überall._

- ⬜ **Navigation (öffentlich)** — Sticky-Header, Logo, Menü, Sprache/Login (`components/Navigation.tsx`)
- ⬜ **Navigation (Dashboard)** — eingeloggte Nav, respektiert Feature-Flags (`components/DashboardNavigation.tsx`)
- ⬜ **Footer** — 4-spaltig: Brand | Plattform | Unternehmen | Rechtliches (`components/Footer.tsx`)
- ✅ **Admin-Layout + Sidebar** (`components/admin/*`) — 2026-08-04 aus `AdminSidebar.dc.html`: 5 Nav-Gruppen (Übersicht/Betrieb/Commerce/Content/System), eindeutige Icons, lokale Nav-Suche, P2G-Brand-Header + Admin-Badge, Footer-Links im neuen Stil. Design-Dummy-Counts (Buchungen/Marketplace) + Versionszeile bewusst weggelassen (keine Fake-Daten) → späteres Backend-Wiring.
- ⬜ **Club-Layout** (`components/club/ClubLayout.tsx`)
- ⬜ **Cookie-Consent-Banner** (`components/CookieConsentBanner.tsx`)
- ⬜ **Geo/Sprach-Banner** (`components/GeoLanguageBanner.tsx`)
- ⬜ **SectionDivider (Glow)** (`components/SectionDivider.tsx`)

---

## 🟢 Öffentlich – Marketing

### ✅ Index — `/`  _(umgesetzt 2026-07-04, Build ✓)_
`src/pages/Index.tsx` · Öffentliche Marketing-Startseite mit Übersicht aller Zielgruppen

Masken:
- [x] Hero-Sektion mit Countdown und CTAs — Glas-Countdown, „Level." lime + „Spiel." kursiv, hero/heroOutline CTAs
- [x] Verein-Schritte-Sektion (6 Karten) — neue Icon-Kachel-Karten (map-pin…settings), Nummern-Pills, ohne Bilder
- [x] **Bento „Ein Network. Alle Vorteile."** — ERSETZT die alte Ökosystem-Sektion (Design 1:1 lt. Florian). 4 Kacheln (Courts / +250 Payback / Marketplace / Events). Expert-Level-Slider + 3 Detailkarten + Wingfield-Badge entfallen auf der Homepage.
- [x] Für-wen-Sektion (3 Zielgruppen-Karten) — Icons user/building/megaphone, Lime-Highlights
- [x] Partner-Grid inkl. Loading-Skeleton — Backend `partner_tiles`
- [x] Lokale-Partner-Sektion — Backend, als Listen-Cards mit Region-Pill
- [x] Standorte (`LocationTeasersSection`) — restyled, Backend `location_teasers`, Status-Pill + „Zum Verein"
- [x] News (`ArticleFeed` public) — restyled zu Bild-oben-Grid, Backend `articles`; Dashboard-Variante unverändert

**⚠️ Aktion für Florian:**
- Migration in Supabase SQL-Editor ausführen: `supabase/migrations/20260704120000_add_home_network_visuals.sql` (legt die zwei neuen Backend-Bild-Keys `home.network.courts` + `home.network.events` an → dann im Admin unter „Homepage" mit echten Bildern belegbar; bis dahin greifen Fallback-Assets skypadel-outdoor / events-hero).

**Geänderte Dateien:** `Index.tsx`, `components/LocationTeasersSection.tsx`, `components/news/ArticleFeed.tsx`, `components/ui/synthetic-hero.tsx`, `locales/de+en/index.json` (neuer `network`-Block), `locales/de+en/common.json` (News-Keys), neue Migration.
**Bewusst NICHT angefasst:** geteilte `Navigation` + `Footer` (eigene Global-Einträge oben), keine Logik/Routen/Inhalte.

### 🟨 FuerSpieler — `/fuer-spieler`
`src/pages/FuerSpieler.tsx` · Marketing-Landingpage für Spieler mit App und Punkten
🟨 **Handover-Brief:** [`docs/handovers/spieler.md`](handovers/spieler.md) (2026-07-04). Warte auf Claude-Design.

Masken:
- [ ] Hero mit Video/Bild-Hintergrund und Trust-Chips
- [ ] Ökosystem 3-Schritte-Sektion
- [ ] App-Hub-Sektion mit Phone-Mockup
- [ ] P2G-Points-Sektion mit Level-Kacheln
- [ ] Marketplace-Sektion inkl. Banner-Platzhalter
- [ ] KI-Analyse-Sektion (Stats, Features, How-it-works)

### ⬜ FuerVereine — `/fuer-vereine`
`src/pages/FuerVereine.tsx` · Marketing-Landingpage für Vereine mit Ablauf und Terminbuchung

Masken:
- [ ] Galaxy-Hero mit Stat-Karten
- [ ] Verein-Schritte-Sektion (6 Karten)
- [ ] Club-Teaser-Grid (bedingt)
- [ ] Full-Service-Partner-Sektion (3 Buckets)
- [ ] SkyPadel-Courts mit Bild-Karussell
- [ ] Timeline-Sektion (4 Schritte + Banner)
- [ ] WhatsApp-Termin-Sektion mit Benefits

### ⬜ FuerPartner — `/fuer-partner`
`src/pages/FuerPartner.tsx` · Marketing-Landingpage für Werbepartner mit KPIs und Touchpoints

Masken:
- [ ] Hero mit Grid-Muster und Trust-Chips
- [ ] Partner-Logo-Cloud inkl. Fallback
- [ ] Touchpoints-Sektion mit Pills und Karussell
- [ ] Use-Cases-Grid (4 Karten)
- [ ] KPI-Grid (6 Karten)
- [ ] WhatsApp-Business-CTA-Sektion mit Benefits

### ⬜ AppBooking — `/app-booking`
`src/pages/AppBooking.tsx` · Marketing-Landingpage der App mit Buchungs- und KI-Features

Masken:
- [ ] Hero mit App-Icon und Store-Badges
- [ ] App-Features-Grid mit Coming-Soon-Karten
- [ ] Booking-Flow in 3 Schritten
- [ ] KI- und Statistik-Sektion mit Wingfield
- [ ] So-funktioniert-es Info-Panel

### ⬜ Rewards — `/rewards`
`src/pages/Rewards.tsx` · Marketing-Seite für P2G-Punkte, Prämien und Levelsystem

Masken:
- [ ] Hero mit Badge und Quick-Stats
- [ ] So-funktioniert-es Schritte-Grid
- [ ] Punkte-Formel-Visualisierung mit Beispielen
- [ ] Einlöse-Optionen Karten-Grid
- [ ] Tier-/Level-Karten (SkewLevelCards)
- [ ] Ladezustand der Tier-Sektion

### ⬜ League — `/league`
`src/pages/League.tsx` · Marketing-Seite der P2G Online-Liga mit Ranking

Masken:
- [ ] Hero mit Logo, Social-Proof und CTAs
- [ ] Punktesystem-Liste
- [ ] Live-Ranking-Tabelle mit Spielern
- [ ] League-Vorteile Karten-Grid

> ✅ **UMGESETZT (Events.dc.html → Code, Build ✓, 2026-07-05).** Übersicht (Hero · Featured · Filter/Grid · Benefits-Bento · Newsletter · „Event planen") + Detail + „nicht gefunden". Backend erhalten (events/event_artists/event_brands, Filter, externer Ticket-Link, Newsletter, slug-Routing).
> **Launch-Placeholder:** wenn noch KEINE Events angelegt sind → Coming-Soon-Karte mit **Launch-Datum** (aus Admin → Features); Filter-leer → „Keine Events gefunden".
> **Fake-Zahlen entfernt (deine Regel):** die erfundenen Benefits-Zahlen aus dem Design (+2.500 / 5.500+ / „8 von 10" / „3 Partnervereine" / „4 Standorte") wurden durch ehrliche, qualitative Aussagen ersetzt. Falls echte Zahlen vorliegen, sag Bescheid → verdrahten.

### ✅ Events — `/events` _(umgesetzt 2026-07-05, Build ✓)_
`src/pages/Events.tsx` · Event-Übersicht mit Filter, Liste und Newsletter

Masken:
- [ ] Hero mit Trust-Strip und CTAs
- [ ] Featured-Event-Sektion
- [ ] Filterleiste mit Suche
- [ ] Event-Grid mit Karten
- [ ] Skeleton-Ladezustand
- [ ] Empty-State für keine Events
- [ ] Benefits-Grid
- [ ] Newsletter- und Event-planen-Panel

### ✅ EventDetail — `/events/:slug` _(umgesetzt 2026-07-05, Build ✓)_
`src/pages/EventDetail.tsx` · Detailansicht eines Events mit Tickets und Line-up

Masken:
- [ ] Skeleton-Ladezustand
- [ ] Not-Found-Fehlerzustand
- [ ] Hero mit Bild und Event-Meta
- [ ] Beschreibung, Highlights, Line-up, Partner
- [ ] Standort-Panel
- [ ] Ticket-CTA-Sidebar
- [ ] Ähnliche-Events-Grid

### ⬜ Marketplace — `/marketplace`
`src/pages/Marketplace.tsx` · Öffentlicher Shop mit Produktrastern und Gast-Checkout

Masken:
- [ ] Hero-Kopfbereich mit Badge
- [ ] Registrierungs-Upsell-Banner
- [ ] Produkt-Grid mit Item-Cards
- [ ] Ladezustand (Spinner)
- [ ] Leerer Zustand (keine Artikel)
- [ ] Gast-Checkout-Dialog mit Versandformular

### ⬜ MarketplaceSuccess — `/marketplace/success`
`src/pages/MarketplaceSuccess.tsx` · Bestätigungsseite nach erfolgreichem Kauf

Masken:
- [ ] Erfolgs-Card mit Icon und Titel
- [ ] Referenz-/Session-ID-Box
- [ ] Aktions-Buttons (Shop / Dashboard)

### ⬜ UeberUns — `/ueber-uns`
`src/pages/UeberUns.tsx` · Marketing-Story-Seite über Unternehmen und Team

Masken:
- [ ] Hero mit Badge und Chips
- [ ] Story-Block mit Timeline
- [ ] Team-Sektion mit Gründer-Cards
- [ ] Werte-Karten-Raster
- [ ] Vision-Sektion mit Karten
- [ ] Zukunftsziele-Raster
- [ ] Abschließende CTA-Sektion

### ⬜ FaqKontakt — `/faq-kontakt`
`src/pages/FaqKontakt.tsx` · Kontaktformular und FAQ-Akkordeon

Masken:
- [ ] Hero-Kopfbereich
- [ ] Kontaktformular mit Grund-Auswahl
- [ ] Direktkontakt-Card
- [ ] Vereine- und Partner-Info-Cards
- [ ] FAQ-Akkordeon nach Kategorien
- [ ] Erfolgs-/Fehler-Toasts beim Senden

### ⬜ Play — `/play`
`src/pages/Play.tsx` · Marketing-Landingpage bewirbt App und Web-Buchung

Masken:
- [ ] Hero-Sektion mit Badge und CTA
- [ ] App-Teaser mit Phone-Mockup und Store-Buttons
- [ ] Web-Buchung CTA-Sektion

### ⬜ Lobbies — `/lobbies`
`src/pages/Lobbies.tsx` · Uebersicht offener und eigener Spiel-Lobbys

Masken:
- [ ] Seiten-Header mit Titel und Buchen-Button
- [ ] Meine Lobbys Sektion mit Rollen-Badges
- [ ] Offene Lobbys mit Filterleiste
- [ ] Lobby-Karten-Grid
- [ ] Empty-State offene Lobbys
- [ ] Loading-Spinner-Zustaende
- [ ] Lobby-Detail-Drawer

### ⬜ PublicProfile — `/u/:username`
`src/pages/PublicProfile.tsx` · Oeffentliches Spielerprofil mit Statistiken und Freundschaftsaktion

Masken:
- [ ] Loading-Skeleton-Zustand
- [ ] Not-Found-Fehlerzustand
- [ ] Profil-Header mit Avatar und Level-Badge
- [ ] Freundschafts-Aktions-Button
- [ ] Statistik-Karte mit Sieg-Niederlage und Fortschritt

### ⬜ QrLanding — `/qr`
`src/pages/QrLanding.tsx` · Minimale QR-Landingpage mit Download-Sektionen

Masken:
- [ ] Topbar mit Logo und Sprachwahl
- [ ] Hero-Sektion mit Eyebrow
- [ ] Sektions-Karte mit Datei-Buttons
- [ ] Empty-State mit WhatsApp-Kontakt
- [ ] Loading-Skeleton-Karten
- [ ] Slim-Footer mit Links

---

## 📄 Öffentlich – Rechtliches

### ⬜ AGB — `/agb`
`src/pages/AGB.tsx` · Statische AGB-Rechtsseite mit nummerierten Paragraphen-Abschnitten

Masken:
- [ ] Header mit Titel und Untertitel
- [ ] Paragraphen-Sektionskarten (§1–§10)
- [ ] Aufzählungslisten in Abschnitten
- [ ] Fußnote mit Rechtshinweis

### ⬜ Datenschutz — `/datenschutz`
`src/pages/Datenschutz.tsx` · Statische Datenschutzerklärung mit thematischen Abschnittskarten

Masken:
- [ ] Header mit Titel und Untertitel
- [ ] Verantwortlicher-Kontaktkarte
- [ ] Themen-Sektionskarten (Hosting, Zahlung, Cookies etc.)
- [ ] Betroffenenrechte-Liste
- [ ] Fußnote mit Rechtshinweis

### ⬜ Impressum — `/impressum`
`src/pages/Impressum.tsx` · Statisches Impressum mit Kontakt- und Rechtsangaben

Masken:
- [ ] Header mit Titel und Untertitel
- [ ] Anbieter- und Geschäftsführer-Karten
- [ ] Kontaktkarte mit WhatsApp-Link
- [ ] Register-/USt-/Streitschlichtungs-Karten
- [ ] Fußnote mit Rechtshinweis

### ⬜ NotFound — `*`
`src/pages/NotFound.tsx` · Einfache 404-Fehlerseite mit Rücklink

Masken:
- [ ] 404-Fehleransicht mit Zurück-Link

---

## 🔐 Auth & Konto

### ⬜ Auth — `/auth`
`src/pages/Auth.tsx` · Authentifizierungsseite mit mehreren umschaltbaren Formularmodi

Masken:
- [ ] Login-Formular
- [ ] Registrierungs-Formular
- [ ] Passwort-vergessen-Formular
- [ ] Passwort-zurücksetzen-Formular
- [ ] E-Mail-Bestätigungs-Ansicht
- [ ] Logo-Karten-Container

### ⬜ Account — `/account`
`src/pages/Account.tsx` · Nutzerkonto mit Profil, Buchungen und Punkten in Tabs

Masken:
- [ ] Lade-Spinner-Zustand
- [ ] Hero-Header mit Level-Badge und Fortschritt
- [ ] Tab: Profil mit Formular und Kontolöschung
- [ ] Tab: Meine Buchungen
- [ ] Tab: P2G-Punkte mit Guthabenkarte
- [ ] Level-Up-Animation-Overlay

---

## 📅 Booking-Flow

> ✅ **UMGESETZT (Claude Design → Code, Build ✓, 2026-07-05).** Alle 4 Pages + Overlays auf `Booking.dc.html` umgestylt, neuer **Fortschritts-Stepper** (Standort → Termin → Bezahlen → Fertig, `components/booking/BookingStepper.tsx`) unter der Navi. Backend voll erhalten (locations/courts/booking_availability/court_prices/Stripe/Gast-Checkout). Court-Anzahl auf der Standort-Karte neu verdrahtet.
> **Echte Court-/Standort-Details verdrahtet (2026-07-05, keine Fake-Infos):** Audit ergab keine erfundenen Daten. Behoben/ergänzt: (a) falsches Label „Turniere" → „P2G Rewards" (hing am `rewards_enabled`-Flag); (b) echte **Beschreibung + Ausstattung** (`features_json`: WC/Dusche/Flutlicht/Indoor/Outdoor/… via COURT_FEATURES) im Standort-Header angezeigt; (c) echter **Preis pro Dauer** (60/90/120) auf den Dauer-Buttons (aus `court_prices`); (d) neue **`courts.label`-Spalte** (Migration `20260705120000_add_court_label.sql`) + Pflege in Admin → Courts („Court hinzufügen"/„bearbeiten": Kurz-Label z. B. „Outdoor · Flutlicht"), wird auf der Court-Auswahl angezeigt. Alles nur bei vorhandenen Daten (sonst nichts → keine Fakes).
> **⚠️ Migration ausführen:** `supabase/migrations/20260705120000_add_court_label.sql` (Supabase SQL-Editor) — legt `courts.label` an.
> **Verbleibende Design-Abweichungen:** Success ohne Buchungscode/Mail (keine Quelle im Code); Datum als horizontale Tages-Chips (= Design). **Offene i18n-Nachziehung:** neue statische Labels aktuell hardcodiert (de).
> **Handover-Brief:** [`docs/handovers/booking.md`](handovers/booking.md). **Navi:** Booking-Tab nach „Home" (live). **Gäste-Sichtbarkeit:** Flag `feature_courts_public_enabled` (Admin → Features).

### 🟨 Booking — `/booking`
`src/pages/Booking.tsx` · Standort-Übersicht mit Verfügbarkeit und eigenen Buchungen

Masken:
- [ ] Landing-Header mit Titel
- [ ] Meine-Buchungen-Bereich
- [ ] Standort-Karten-Grid
- [ ] Admin-Vorschau-Hinweis
- [ ] Coming-Soon Empty-State
- [ ] Lade-Zustand

### ⬜ BookingLocation — `/booking/locations/:slug`
`src/pages/BookingLocation.tsx` · Standortdetail mit Slot-Auswahl und Buchungszusammenfassung

Masken:
- [ ] Standort-Header
- [ ] Slot-Picker (Court/Datum/Dauer)
- [ ] Buchungs-Zusammenfassung mit Lobby-Option
- [ ] Gast-Checkout-Modal
- [ ] Coming-Soon Empty-State
- [ ] Lade-Zustand

### ⬜ BookingCheckout — `/booking/checkout`
`src/pages/BookingCheckout.tsx` · Zahlungsseite mit Buchungsdetails, Gutschein und Rewards

Masken:
- [ ] Reservierungs-Timer-Warnung
- [ ] Buchungs-Zusammenfassung-Karte
- [ ] Gutschein-Eingabe (Collapsible)
- [ ] Rewards-Schätzung-Panel
- [ ] Preis- und Bezahl-Bereich
- [ ] Fehler/Abgelaufen-Zustand
- [ ] Lade-Zustand

### ⬜ BookingSuccess — `/booking/success`
`src/pages/BookingSuccess.tsx` · Bestätigungsseite mit Punkten und Folgeaktionen

Masken:
- [ ] Erfolgs-Bestätigungskarte
- [ ] Verdiente-Punkte-Panel
- [ ] Lobby-CTA-Panel
- [ ] Aktions-Buttons und Gast-Hinweis
- [ ] Verarbeitungs-Lade-Zustand

### ⬜ BookingCancel — `/booking/cancel`
`src/pages/BookingCancel.tsx` · Abbruchseite mit Wiederholen- und Zurück-Aktion

Masken:
- [ ] Abbruch-Bestätigungskarte
- [ ] Wiederholen/Zurück-Aktions-Buttons

---

## 🎮 Dashboard (Spieler)

### ⬜ DashboardHome — `/dashboard`
`src/pages/dashboard/DashboardHome.tsx` · Dashboard-Startseite mit Punkten, Buchung, Schnellaktionen, News und Events

Masken:
- [ ] Begrüßungs- und Punkte-Hero
- [ ] Nächste-Buchung-Karte inkl. Empty-State
- [ ] Schnellaktionen-Grid
- [ ] News-Feed
- [ ] Events-Vorschau-Grid

### ⬜ DashboardBooking — `/dashboard/booking`
`src/pages/dashboard/DashboardBooking.tsx` · Platzbuchung mit Standorten, Buchungsübersicht und Stornierung

Masken:
- [ ] Buchungs-Hero mit nächster Buchung
- [ ] Standorte-Grid mit Verfügbarkeit
- [ ] Launch-Countdown- und Coming-Soon-States
- [ ] Kennzahlen-Karten
- [ ] Kommende Buchungen Liste
- [ ] Vergangene Buchungen (aufklappbar nach Monat)
- [ ] Stornierungs-Dialog

### ⬜ DashboardRewards — `/dashboard/rewards`
`src/pages/dashboard/DashboardRewards.tsx` · Belohnungen, Punkte-Level und Verdienstmöglichkeiten

Masken:
- [ ] Credit-Hero mit animiertem Zähler
- [ ] Instagram-Bonus-Karte und Dialog
- [ ] Einlösbare Belohnungen Liste
- [ ] Level-Fortschritt-Karte
- [ ] Credit-Aufschlüsselung
- [ ] Top-Belohnungen-Vorschau
- [ ] Verdienstmethoden-Grid

### ⬜ DashboardMarketplace — `/dashboard/marketplace`
`src/pages/dashboard/DashboardMarketplace.tsx` · Marktplatz zum Einlösen von Punkten und Kaufen von Produkten

Masken:
- [ ] Credits-Header und Guthaben-Leiste
- [ ] Sortierung und Produkt-Grid
- [ ] Empty-State Marktplatz
- [ ] Einlöse-Historie
- [ ] Kauf-Bestätigungsdialog mit Adresse und Punkte-Rabatt

### ⬜ DashboardP2GPoints — `/dashboard/p2g-points`
`src/pages/dashboard/DashboardP2GPoints.tsx` · P2G-Punkte, Skill-Level und Spielhistorie

Masken:
- [ ] Coming-Soon-Overlay
- [ ] Punkte-Header
- [ ] Skill-Letzte-5-Abschnitt
- [ ] Letztes-Spiel-Karte
- [ ] Freunde-Aktivitätsfeed
- [ ] Meine-Spiele-Abschnitt

### ⬜ DashboardLeague — `/dashboard/league`
`src/pages/dashboard/DashboardLeague.tsx` · Liga-Rangliste mit Expert-Level, Statistiken und Match-Historie

Masken:
- [ ] Coming-Soon Sperrbildschirm mit Skelett
- [ ] Lade-/Spinner-Zustand
- [ ] Expert-Level Header-Card mit Fortschritt und Statistik-Grid
- [ ] Drei Ranglisten-Tabellen (Deutschland/Tier/Altersgruppe)
- [ ] Letzte-Matches Accordion mit Detailansicht
- [ ] Empty-State keine Matches

### ⬜ DashboardEvents — `/dashboard/events`
`src/pages/dashboard/DashboardEvents.tsx` · Event-Übersicht mit kommenden und vergangenen Veranstaltungen

Masken:
- [ ] Coming-Soon Sperrbildschirm mit Skelett
- [ ] Lade-/Spinner-Zustand
- [ ] Kennzahlen-Metrikkarten
- [ ] Featured-Event Hero-Card
- [ ] Kommende-Events Grid mit Empty-State
- [ ] Vergangene-Events Liste

### ⬜ DashboardFriends — `/dashboard/friends`
`src/pages/dashboard/DashboardFriends.tsx` · Freundeverwaltung mit Liste, Anfragen und Suche

Masken:
- [ ] Seiten-Header mit Titel
- [ ] Tab-Leiste mit Anfragen-Badge
- [ ] Tab Freundesliste
- [ ] Tab Freundschaftsanfragen
- [ ] Tab Nutzersuche

### ⬜ DashboardChat — `/dashboard/chat`
`src/pages/dashboard/DashboardChat.tsx` · Direkt- und Gruppen-Chat mit Lobby-Einladungen

Masken:
- [ ] Seiten-Header mit Neue-Gruppe Button
- [ ] Konversations-Sidebar mit Gruppen und Freunden
- [ ] Direkt-Chat Ansicht mit Kopfzeile
- [ ] Gruppen-Chat Ansicht mit Mitgliederleiste
- [ ] Nachrichtenliste mit Eingabefeld
- [ ] Leerer Chat-Zustand
- [ ] Gruppe-verwalten Dialog
- [ ] Lobby-Einladungs-Nachrichtenkarte

---

## 🏢 Club-Portal

### ⬜ ClubDashboard — `/club`
`src/pages/club/ClubDashboard.tsx` · Startseite mit Kontingent-Übersicht und Schnellzugriffen für Club-Personal

Masken:
- [ ] Header mit Club-Name und Rollen-Badge
- [ ] Statistik-Karten (Kontingent, Verbrauch, Status)
- [ ] Zugewiesene Plätze Liste
- [ ] Schnellzugriff-Aktionskarten
- [ ] Willkommens-Info-Banner

### ⬜ ClubBookings — `/club/bookings`
`src/pages/club/ClubBookings.tsx` · Buchungen für Mitglieder anlegen und verwalten

Masken:
- [ ] Kopf mit Kontingent-Banner
- [ ] Tab: Neue Buchung (Kalender, Zeitslots, Formular, Zusammenfassung)
- [ ] Tab: Club-Buchungen Liste
- [ ] Tab: Alle Platzbuchungen Übersicht
- [ ] Stornierungs-Dialog
- [ ] Leerzustand ohne Buchungen

### ⬜ ClubCalendar — `/club/calendar`
`src/pages/club/ClubCalendar.tsx` · Wochenkalender der Platzauslastung anzeigen

Masken:
- [ ] Kopf mit Wochennavigation
- [ ] Legende Club/Nutzer
- [ ] Wochen-Zeitraster mit Buchungsblöcken
- [ ] Lade-Skeleton des Rasters
- [ ] Heutige Buchungen Liste mit Leerzustand

### ⬜ ClubCourtFeatures — `/club/court`
`src/pages/club/ClubCourtFeatures.tsx` · Platz- und Plattform-Funktionen umschalten und speichern

Masken:
- [ ] Kopf mit Speichern-Button
- [ ] Lade-Skeleton
- [ ] Platz-Info-Karte
- [ ] Plattform-Funktionen Toggle-Karten
- [ ] Ausstattungs-Funktionen Raster
- [ ] Hinweis-Karte

### ⬜ ClubUtilization — `/club/utilization`
`src/pages/club/ClubUtilization.tsx` · Auslastungskennzahlen und Trend der Plätze auswerten

Masken:
- [ ] Kopf mit Monatsauswahl
- [ ] KPI-Kennzahlkarten
- [ ] Auslastung pro Platz mit Zuständen (Laden/Fehler/Leer)
- [ ] Trend-Diagramm mit Platzauswahl

---

## 🛠️ Admin

### ✅ AdminOverview — `/admin`
`src/pages/admin/AdminOverview.tsx` · Dashboard mit KPIs und letzten Buchungen

Masken:
- [x] Seitenkopf mit Begrüßung
- [x] Plattform-KPI-Kacheln
- [x] Club-KPI-Kacheln
- [x] Letzte-Buchungen-Panel mit Court-Filter
- [x] Standorte-Übersicht-Panel
- [x] Empty-States (keine Buchungen/Standorte)

> **Umgesetzt 2026-08-04** aus `Admin 01 Overview.dc.html`. Backend-Wiring offen (Design zeigt, Seite hat nicht): Zeitraum-Umschalter Heute/Woche/Monat, Umsatz-KPI, Trend-Badges, Spieler-/Betrag-Spalten, „Alle →"-Links, „Neuer Standort"-CTA.

### ✅ AdminBookings — `/admin/bookings`
`src/pages/admin/AdminBookings.tsx` · Buchungsverwaltung als Kalender und Liste

Masken:
- [x] Kopf mit Ansichts-Umschalter
- [x] Filter-Panel (Woche, Standort, Status, Club)
- [x] Kalender-Wochenansicht (Folge-Pass 2026-08-10: Mono-Stundenachse, minutengenaue Blöcke, Club jetzt einheitlich #7FD4FF)
- [x] Buchungsliste-Tabelle mit Suche
- [x] Buchungsdetail-Drawer (Folge-Pass 2026-08-10: Gradient-Panel, Feldliste, Club-Box blau)
- [x] Stornieren-Bestätigungsdialog
- [x] Buchungen-Reset-Dialog

> **Umgesetzt 2026-08-04** aus `Admin 02 Buchungen.dc.html` (Seiten-Datei). Nebenbei behoben: invalides nested-`<p>` im Reset-Dialog. Backend-Wiring offen: Court-Filter, Spalten Dauer/Betrag/Zahlung/Lobby-Origin, „LÖSCHEN"-Tipp-Bestätigung im Reset, Teilnehmer im Drawer.

### ✅ AdminCourts — `/admin/courts`
`src/pages/admin/AdminCourts.tsx` · Courts und Standorte mit Tabs verwalten

Masken:
- [x] Kopf mit Statistik und Neuer-Standort-Button
- [x] Standort-Formular-Dialog (Rahmen; `LocationForm` unangetastet)
- [x] Standorte-Tab (Karten-Grid) inkl. Karten (Folge-Pass 2026-08-10: Bild-Header, Feature-Chips, Switch-Panel, AlertDialog)
- [x] Courts-Tab (Karten-Grid) inkl. Karten (Folge-Pass 2026-08-10: Bild-Pills, kompakter Body)
- [x] Analytics-Tab (Folge-Pass 2026-08-10: KPI-Kacheln, CSS-Charts statt Recharts, Donut)
- [x] KI-Kameras-Tab komplett (Folge-Pass 2026-08-10: Sessions, API-Keys, Simulator im neuen Look)
- [x] Loading-Skeletons und Empty-States

> **Umgesetzt 2026-08-04** aus `Admin 03 Courts.dc.html` (Seiten-Datei). Nebenbei: toter `xs:`-Breakpoint in Tab-Labels auf `sm:` korrigiert.

### ✅ AdminEvents — `/admin/events`
`src/pages/admin/AdminEvents.tsx` · Events erstellen, filtern und verwalten

Masken:
- [x] Kopf mit Zählern und Neues-Event-Button
- [x] Filterleiste (Suche und Status)
- [x] Events-Tabelle
- [x] Event-Formular-Dialog (Erstellen/Bearbeiten)
- [x] Event-Löschen-Bestätigung
- [x] Empty- und Loading-State

> **Umgesetzt 2026-08-04** aus `Admin 07 Events.dc.html`. Dialog komplett inkl. Formular-Innenleben (Folge-Pass 2026-08-10: EventForm + Artist/Brand/Highlights im neuen Look, Mobile-Grid-Fixes). Nebenbei behoben: toter Ticket-Link bei Events ohne URL (jetzt konditional „über P2G"). Bekannter Bug notiert: Edit-Dialog schließt nach Speichern nicht (unkontrolliert).

### ✅ AdminMarketplace — `/admin/marketplace`
`src/pages/admin/AdminMarketplace.tsx` · Marktplatz-Produkte und Umsätze verwalten

Masken:
- [x] Kopf mit Neues-Produkt-Button
- [x] Analytics-KPI-Kacheln
- [x] Empfehlungen-Referral-Tabelle
- [x] Filter-Panel (Kategorie/Status)
- [x] Produkte-Tabelle
- [x] Produkt-Formular-Dialog mit Bild-Upload
- [x] Produkt-Löschen-Bestätigung

> **Umgesetzt 2026-08-04** aus `Admin 08 Marketplace.dc.html` (inkl. komplettem Produkt-Dialog mit GPSR/SEO). Folge-Pass 2026-08-10 erledigt: Bestellungen/Retouren + Katalog-Dialog im neuen Look (Segmented-Filter, Status-Pills, Storno-AlertDialog). Backend-Wiring offen: KPI-Trends, Tab-Counts Bestellungen/Retouren.

### ✅ AdminP2GPoints — `/admin/p2g-points`
`src/pages/admin/AdminP2GPoints.tsx` · P2G-Punkte, Wallets und Rewards verwalten

Masken:
- [x] Kopf mit Titel
- [x] Tab-Navigation
- [x] Punktewert-Wechselkurs-Karte
- [x] Übersicht-Tab (Dashboard)
- [x] Wallets-Tab (Folge-Pass 2026-08-10: Tabelle + Detail-Panel + Credits-Dialog)
- [x] Freigaben-/Einlösungen-Tabs
- [x] Rewards-/Expert-Levels-Tabs (Folge-Pass 2026-08-10: Tabelle + Level-Dialog mit Live-Preview)

> **Umgesetzt 2026-08-04** aus `Admin 09 P2G Points.dc.html` (Seiten-Datei: Tabs, Punktewert- + Payback-Karten).

### ✅ AdminColors — `/admin/farben`
`src/pages/admin/AdminColors.tsx` · Section-Akzentfarben für App & Web pflegen _(nachträglich ergänzt — fehlte im ursprünglichen Scan)_

Masken:
- [x] Kopf mit Sofort-live-Badge
- [x] 7 Section-Farbkarten (Farbkreis, Swatches, Hex-Input, Standard-Reset)
- [x] News-Topics-Karte (festes Farbsystem, echte TOPIC_COLORS)

> **Umgesetzt 2026-08-04** aus `Admin 17 Farben.dc.html`. Backend-Hinweis: Speichern nutzt `update` ohne Upsert — fehlt die `site_visuals`-Zeile für einen Key, geht das Speichern still verloren.

### ✅ AdminUsers — `/admin/users`
`src/pages/admin/AdminUsers.tsx` · Vollständige Benutzerverwaltung mit Detailansicht und Löschung

Masken:
- [x] Kopfzeile mit Suche und Benutzerliste-Tabelle
- [x] Paginierung und Empty-/Loading-State der Liste
- [x] Benutzer-Detail-Dialog mit Tabs (Übersicht, Matches, Buchungen, Wallet)
- [x] Rollen-Dropdown-Menü
- [x] Lösch-Bestätigungsdialog mit DELETE-Eingabe

> **Umgesetzt 2026-08-04** aus `Admin 18 Benutzer.dc.html` (Liste, Detail-Dialog mit 4 Tabs, DELETE-Bestätigungs-Dialog). Nebenbei behoben: invalides nested-`<p>` im Lösch-Dialog; Übersicht-KPIs waren auf Mobile gebrochen (fix grid-cols-4 → auto-fit).

### ✅ AdminNotifications — `/admin/notifications`
`src/pages/admin/AdminNotifications.tsx` · Broadcast-Mitteilungen erstellen, versenden und verwalten

Masken:
- [x] Formular Neue Mitteilung erstellen
- [x] Empfänger-Auswahl (RadioGroup + Benutzer-Popover-Suche)
- [x] Verlaufstabelle gesendeter Mitteilungen
- [x] Mitteilung-Bearbeiten-Dialog
- [x] Lösch-Bestätigungsdialog

> **Umgesetzt 2026-08-04** aus `Admin 19 Mitteilungen.dc.html`. Backend-Wiring offen: Empfängerkreis-Infobox im Edit-Dialog. Perf-Hinweis: Benutzersuche lädt ALLE Profile in den Client (besser serverseitig `ilike` + Limit).

### ✅ AdminNewsletter — `/admin/newsletter`
`src/pages/admin/AdminNewsletter.tsx` · Newsletter-Editor mit Blöcken, Vorschau und Versand _(nachträglich ergänzt — fehlte im ursprünglichen Scan)_

Masken:
- [x] KPI-Karten (Bestätigt/Ausstehend/Abgemeldet)
- [x] Block-Editor (Überschrift/Text/Bild/Button)
- [x] Aktionen (Entwurf/Test/Senden)
- [x] Live-Vorschau (iframe)
- [x] Kampagnen-Verlauf mit Status-Pills

> **Umgesetzt 2026-08-04** aus `Admin 20 Newsletter.dc.html`. Offen: Send-Bestätigung ist `window.confirm` ohne Empfängerzahl → gestyltes AlertDialog mit `counts.confirmed`. Hinweis: Vorschau-Abmeldelink ist `href="#"` — echte Mails haben den echten Link (nur Vorschau-Ungenauigkeit).

### ✅ AdminAnalytics — `/admin/analytics`
`src/pages/admin/AdminAnalytics.tsx` · Statistik-Dashboard mit vier Diagrammen

Masken:
- [x] Seitenkopf mit Titel
- [x] Balkendiagramm Buchungen letzte 7 Tage
- [x] Kreisdiagramm Buchungen nach Status
- [x] Balkendiagramm Buchungen pro Standort
- [x] Liniendiagramm Neue Benutzer pro Woche

> **Umgesetzt 2026-08-04** aus `Admin 21 Analytics.dc.html` (designgemäß CSS/SVG-Charts statt Recharts — Werte direkt sichtbar, keine Hover-Tooltips; Queries byte-identisch). Perf-Hinweis: ~15 sequenzielle Count-Requests (N+1) → RPC/Aggregat-Query. Bug notiert: Wochenfenster inklusiv-überlappend (Grenzfall doppelt gezählt).

### ✅ AdminUtilization — `/admin/utilization`
`src/pages/admin/AdminUtilization.tsx` · Court-Auslastung im Netzwerk mit Monatsauswahl

Masken:
- [x] Kopfzeile mit Monatswähler
- [x] KPI-Karten-Raster
- [x] Diagramme Auslastung pro Standort und Netzwerk-Verlauf (designgemäß CSS-Balken statt Recharts — keine Hover-Tooltips mehr, Werte stehen direkt am Balken)
- [x] Courts-Tabelle mit Filter und Sortierung
- [x] Loading-/Error-/Empty-Zustände der Tabelle

> **Umgesetzt 2026-08-04** aus `Admin 04 Auslastung.dc.html`. Hinweis: Kapazitätsfarben existieren doppelt (lib/utilization.ts vs. Design-Palette) → nach Abschluss aller Auslastungs-Ansichten konsolidieren.

### ✅ AdminVisuals — `/admin/visuals`
`src/pages/admin/AdminVisuals.tsx` · Website-Bilder und Videos verwalten und hochladen

Masken:
- [x] Seitenkopf mit Beschreibung
- [x] Kategorie-Karten mit Visual-Grid
- [x] Bild-/Video-Vorschaukachel mit Statusbadge
- [x] Bild-Upload-Aktionen
- [x] Video-URL-Eingabe und Upload-Aktionen
- [x] Loading-Spinner und Empty-State

> **Umgesetzt 2026-08-04** aus `Admin 22 Visuals.dc.html` (Kategorie-Karten mit Slot-Zählern, Preview-Kacheln, Video-Tiles). Bug notiert: „OK" ohne Tippen speichert leeren String und löscht die Video-URL (siehe ADMIN-UX-NOTES).

### ✅ AdminFeatures — `/admin/features`
`src/pages/admin/AdminFeatures.tsx` · Feature-Flags und Credits-Zahlung steuern

Masken:
- [x] Seitenkopf mit Titel
- [x] Courts-Sichtbarkeit-Umschaltkarte
- [x] Feature-Karten-Liste mit Zustandsauswahl
- [x] Credits-als-Zahlungsmittel-Karte mit Einstellungen
- [x] Info-Karte zur Zustandserklärung
- [x] Loading-Spinner

> **Umgesetzt 2026-08-04** aus `Admin 24 Features.dc.html` (Launch-Datum, Courts-Sichtbarkeit, 7 Feature-Karten mit 3-Stufen-Status, Credits-Karte, Info-Karte). Hinweis: `feature_app_launched`-Master-Switch existiert nicht mehr im Code — CLAUDE.md veraltet. Audit-Lücke: Credits-Handler schreiben kein `updated_by`.

### ✅ AdminClubOwners — `/admin/club-owners`
`src/pages/admin/AdminClubOwners.tsx` · Verwaltung von Club-Owner-Zuweisungen und Monatskontingenten

Masken:
- [x] Kopfbereich mit Titel und Aktion
- [x] Dialog Neue Zuweisung
- [x] Suchleiste
- [x] Zuweisungen-Tabelle inkl. Lade-/Leerzustand
- [x] Hilfe-Karte Einrichtung

> **Umgesetzt 2026-08-04** aus `Admin 06 Club Owners.dc.html`. Nebenbei behoben: Spaltenversatz (7 Zellen bei 6 Headern). Backend-Wiring offen: Kontingent-Nutzungsanzeige (Progressbar, genutzte Stunden).

### ✅ AdminClubs — `/admin/clubs`
`src/pages/admin/AdminClubs.tsx` · Clubs, Court-Zuweisungen und Mitglieder verwalten

Masken:
- [x] Kopfbereich mit Suchleiste
- [x] Dialog Club erstellen/bearbeiten
- [x] Club-Liste (linke Spalte)
- [x] Detail-Panel mit Empty-State
- [x] Tab Courts inkl. Court-Dialog
- [x] Tab Mitglieder inkl. Benutzer-Dialog
- [x] Hilfe-Karte Einrichtung

> **Umgesetzt 2026-08-04** aus `Admin 05 Clubs.dc.html`. Offen (Logik, nicht Design): `window.confirm()`-Löschdialoge durch AlertDialog ersetzen; Stale-State von `selectedClub` nach Mutationen (siehe ADMIN-UX-NOTES).

### ✅ AdminVouchers — `/admin/vouchers`
`src/pages/admin/AdminVouchers.tsx` · Gutscheincodes erstellen und verwalten

Masken:
- [x] Kopfbereich mit Aktion
- [x] Voucher-Tabelle inkl. Lade-/Leerzustand
- [x] Erstellen-Dialog mit Formular
- [x] Bearbeiten-Dialog mit Formular
- [x] Lösch-Bestätigungsdialog

> **Umgesetzt 2026-08-04** aus `Admin 10 Vouchers.dc.html`. Backend-Wiring offen: KPI-Zeile (4 Kacheln), Code-Suche mit Live-Filter. Bug notiert: Zeitzonen-Versatz bei datetime-local (siehe ADMIN-UX-NOTES).

### ✅ AdminLocationTeasers — `/admin/location-teasers`
`src/pages/admin/AdminLocationTeasers.tsx` · Kommende Standort-Teaser der Homepage verwalten

Masken:
- [x] Kopfbereich mit Aktion
- [x] Teaser-Liste mit Karten
- [x] Empty-/Ladezustand
- [x] Erstellen/Bearbeiten-Dialog mit Formular

> **Umgesetzt 2026-08-04** aus `Admin 11 Location Teasers.dc.html`. EN-Badge/Beschreibung/Sortiernummer in Liste ergänzt (Daten waren schon geladen). Offen: `confirm()` → AlertDialog; geteilte `TranslatableField` = zentraler Folge-Pass.

### ✅ AdminSkyPadelGallery — `/admin/skypadel-gallery`
`src/pages/admin/AdminSkyPadelGallery.tsx` · Galeriebilder der Vereine-Seite verwalten

Masken:
- [x] Kopfbereich mit Upload-Aktion
- [x] Empty-/Ladezustand
- [x] Bild-Karten-Liste
- [x] Alt-Text-Editor pro Bild

> **Umgesetzt 2026-08-04** aus `Admin 12 SkyPadel Galerie.dc.html`. Offen: `confirm()` → AlertDialog; Drag&Drop-Sortierung (Design zeigt Grip); Löschen lässt Storage-Datei verwaist zurück (Backend-Thema).

### ✅ AdminPartnerTiles — `/admin/partner-tiles`
`src/pages/admin/AdminPartnerTiles.tsx` · Partner-Logos und Hintergrundfarben der Homepage verwalten

Masken:
- [x] Kopfbereich
- [x] Karte Neuen Partner hinzufügen
- [x] Skeleton-Ladezustand
- [x] Partner-Karten-Liste
- [x] Beschreibungs-Editor pro Partner

> **Umgesetzt 2026-08-04** aus `Admin 13 Partner-Kacheln.dc.html`. Offen: `confirm()` → AlertDialog; `handleSortChange` ohne Debounce/try-catch (siehe ADMIN-UX-NOTES).

### ✅ AdminTouchpointSlides — `/admin/touchpoint-slides`
`src/pages/admin/AdminTouchpointSlides.tsx` · Karussell-Slides der Partner-Seite verwalten (Bild, Text, Reihenfolge)

Masken:
- [x] Seitenkopf mit Titel
- [x] Neuer-Slide-Formular-Card
- [x] Slide-Listenkarte mit Bild-Upload und Feldern
- [x] Zweisprachiger Text-Editor (Titel/Beschreibung)
- [x] Empty-State ohne Slides
- [x] Ladezustand

> **Umgesetzt 2026-08-04** aus `Admin 14 Touchpoint Slides.dc.html`. Offen: `confirm()` → AlertDialog; TranslatableField = zentraler Folge-Pass.

### ✅ AdminQrPanel — `/admin/qr-panel`
`src/pages/admin/AdminQrPanel.tsx` · QR-Landingpage-Sektionen mit Texten und PDFs verwalten

Masken:
- [x] Seitenkopf mit Live-Link
- [x] Neue-Sektion-Anlegen-Card
- [x] Sektions-Editor-Card mit Sichtbarkeit und Sortierung
- [x] Zweisprachige Textfelder
- [x] DE/EN Datei-Upload-Bereich
- [x] Skeleton-Ladezustand
- [x] Empty-State ohne Sektionen

> **Umgesetzt 2026-08-04** aus `Admin 15 QR-Panel.dc.html`. Offen: `confirm()` → AlertDialog (Sektion + Datei); `accept`-Attribut enger fassen (erlaubt browserseitig GIF/SVG, Validierung lehnt erst danach ab).

### ✅ AdminNews — `/admin/news`
`src/pages/admin/AdminNews.tsx` · News-Artikel für Startseite und Dashboard verwalten

Masken:
- [x] Seitenkopf mit Neuer-Artikel-Button
- [x] Artikel-Listenkarten
- [x] Empty-State ohne Artikel
- [x] Artikel-Editor-Dialog
- [x] KI-Voice-In-Generierungsbereich
- [x] Formularfelder mit Titelbild und Editor

> **Umgesetzt 2026-08-04** aus `Admin 16 News.dc.html` (Seitenkopf, KI-Generator, Autoren, Filter+Liste, kompletter Artikel-Dialog). Nebenbei behoben: Filter-Chips verschwanden bei 0 Treffern (Filter war nicht zurücksetzbar). Folge-Pass 2026-08-10 erledigt: Schreibstil-Dialog + Diktat-Box im neuen Look. Offen: `confirm()` → AlertDialog.

### ✅ AdminSettings — `/admin/settings`
`src/pages/admin/AdminSettings.tsx` · System- und App-Einstellungen umschalten

Masken:
- [x] Seitenkopf
- [x] Inhalts-Sperre-Card (PIN-Locks)
- [x] Allgemeine-Einstellungen-Card
- [x] Benachrichtigungen-Card
- [x] Sicherheit-Card

> **Umgesetzt 2026-08-04** aus `Admin 25 Einstellungen.dc.html` (Design-Projekt 28649d89). Styling only — PIN-Lock-Logik (useSiteSettings) unverändert. Platzhalter-Cards (Allgemein/Benachrichtigungen/Sicherheit) jetzt sichtbar als „UI-Platzhalter · ohne Backend" markiert (Badge + reduzierte Deckkraft). **Zusätzlich shared:** `AdminHeader` auf neues Design (sticky Glas-Header, Route-Pfad mono + dynamischer Seitentitel aus Sidebar-Items + User-Chip) — gilt für alle Admin-Seiten; die In-Page-h1 der übrigen Seiten werden beim jeweiligen Redesign entfernt. UX-Funde gesammelt in `docs/ADMIN-UX-NOTES.md`.

### ✅ AdminIntegrations — `/admin/integrations`
`src/pages/admin/AdminIntegrations.tsx` · Externe Dienste und API-Schlüssel konfigurieren

Masken:
- [x] Seitenkopf
- [x] Integrations-Dienst-Card (Stripe/Resend/etc.)
- [x] Secret-Input mit Sichtbarkeit-Toggle
- [x] Coming-Soon-Card (PayPal, deaktiviert)
- [x] Sicherheitshinweis-Info-Card
- [x] Ladezustand (Spinner)

> **Umgesetzt 2026-08-04** aus `Admin 23 Integrationen.dc.html` (6 Service-Karten mit Akzent-Icons, Status-Badges, Secret-Inputs in Mono, Sicherheitshinweis-Karte). Secret-Handling zeichengleich erhalten. Backend-Wiring offen: maskierte Secret-Vorschau als Placeholder (Daten liegen schon in `originalConfigs`).

---

## 🛠️ Admin — KOMPLETT ✅ (2026-08-04)
Alle 25 Admin-Seiten + Sidebar + Header in einem Tag via Claude Design umgesetzt (Batches 1–6, styling only, Logik unverändert, jede Seite per Diff auf Handler-/Hook-Gleichheit geprüft, Build ✓, live deployed). UX-Funde + Backend-Wiring-Liste + Kind-Komponenten-Folgepass: `docs/ADMIN-UX-NOTES.md`.

## 📌 Aktueller Fokus
- ✅ **Homepage (`/`)** — umgesetzt, Build ✓ & **live auf Vercel deployed** (Commits f991779 + 5b35407, 2026-07-04). Inkl. Fix „einheitliche Seitenabstände" (alle Sektionen `max-w-[1200px] px-5`). Florian sichtet in der Live-Version. Offen: Migration ausführen (siehe Homepage-Eintrag).
- **Workflow ab jetzt:** Seite umsetzen → `vite build` → Push auf `main` → Vercel auto-deployt → Florian sichtet live (keine Screenshots).
- ✅ **Booking** — 4 Pages + Stepper umgesetzt (Booking.dc.html), Build ✓, live. Offen: Flag `feature_courts_public_enabled` = true (Admin → Features) für Gäste-Sichtbarkeit; optional: i18n-Nachzug neuer Labels + weitere Court-Details (Preis/Tag pro Court) verdrahten, falls gewünscht.
- 🟨 **Events** — Handover-Brief erstellt ([`docs/handovers/events.md`](handovers/events.md)). Warte auf Claude-Design.
- 🟨 **Spieler** (`/fuer-spieler`) — Handover-Brief erstellt ([`docs/handovers/spieler.md`](handovers/spieler.md)). Warte auf Claude-Design.
- ➡️ **Nächste Seite:** Florian liefert Claude-Design für Booking / Events / Spieler; dann Umsetzung.
