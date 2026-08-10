# Admin UX — Notizen für den nächsten Step

Gesammelt während des Admin-Redesigns (gestartet 2026-08-04 mit `/admin/settings`).
Ziel: Admin-Bereich intuitiver machen + Bugs/Inkonsistenzen festhalten. Wird pro Seite ergänzt.

## Verbesserungen (intuitiver machen)

1. **Sidebar gruppieren** — 25 flache Einträge ohne Struktur sind schwer zu scannen. Vorschlag für Gruppen:
   - *Betrieb:* Overview · Buchungen · Courts & Standorte · Auslastung · Clubs · Club Owners
   - *Angebot:* Events · Marketplace · P2G Points · Vouchers
   - *Website-Inhalte:* Location Teasers · SkyPadel Galerie · Partner-Kacheln · Touchpoint Slides · QR-Panel · News/Artikel · Farben · Visuals
   - *Kommunikation:* Mitteilungen · Newsletter
   - *System:* Benutzer · Analytics · Integrationen · Features · Einstellungen
   → Beim Umsetzen `AdminSidebar.dc.html` aus dem Design-Projekt als Referenz nehmen.
2. **Doppelte Sidebar-Icons** — ImagePlus 2× (SkyPadel Galerie, Touchpoint Slides), Palette 2× (Partner-Kacheln, Farben), Users 2× (Club Owners, Benutzer). Eindeutige Icons je Eintrag verbessern die Orientierung.
3. **Sidebar-Suche / Quick-Filter** — bei 25 Einträgen wäre ein Filterfeld (oder Cmd-K) oben in der Sidebar hilfreich.
4. **Doppelter Seitentitel** — der neue AdminHeader zeigt jetzt den Seitennamen dynamisch; die In-Page-`h1` der 24 noch nicht umgestalteten Seiten sind damit redundant → beim jeweiligen Seiten-Redesign entfernen.
5. **Glocke im Header ohne Funktion** — der Bell-Button in `AdminHeader` hat keinen onClick. Entweder echte Admin-Benachrichtigungen (Mitteilungen/neue Buchungen) anbinden oder entfernen.

## Bugs / Inkonsistenzen

1. **AdminSettings: Platzhalter ohne Backend** — „Allgemeine Einstellungen" (App Name, Zeitzone), „Wartungsmodus", „Benachrichtigungen" (3 Schalter) und „Sicherheit" (2FA, Session-Timeout) haben **kein** Backend: kein `app_name`-/Maintenance-Flag in Migrationen oder Code gefunden, die Schalter sind unkontrolliert (Zustand geht beim Reload verloren). Seit dem Redesign sichtbar als „UI-Platzhalter · ohne Backend" markiert. **Entscheidung nötig:** verdrahten (in `site_settings`) oder entfernen — sonst entsteht falsches Vertrauen (v. a. bei „Zwei-Faktor-Authentifizierung").
2. **AdminOverview:** „Buchungen heute/Woche" zählen nur `status=confirmed`, die Liste „Letzte Buchungen" zeigt alle Status — Zahlen wirken inkonsistent zueinander. Court-Filter wechselt zudem das Limit (10 gefiltert vs. 5 ungefiltert). Kontingent-Minuten ohne Tausenderpunkt („8160 / 12000 Min").
3. **AdminBookings:** Status-Filter-Default „Bestätigt" versteckt stornierte/ausstehende Buchungen beim ersten Öffnen. Suchfeld ist nur in der Listenansicht sichtbar, filtert aber unsichtbar auch den Kalender mit. Club-Farbe inkonsistent (Kalender violett, Design blau, alte Tabelle lime) → plattformweit vereinheitlichen. Nebenbei behoben: invalides nested-`<p>` im Reset-Dialog (React-Hydration-Warnung).
4. **AdminCourts:** Toter `xs:`-Breakpoint — `xs` ist in tailwind.config.ts nicht definiert, `hidden xs:inline`-Labels wurden nie angezeigt (auf `sm:` korrigiert). Projekt-weiter Grep nach `xs:` lohnt.
5. **AdminUtilization:** Kapazitätsfarben doppelt gepflegt (lib/utilization.ts `capacityHex` vs. Design-Palette) → konsolidieren. KPI „Netzwerk-Auslastung" cappt Anzeige bei 100 %, Rohdaten können >100 % liefern (Datenqualität im View prüfen).

6. **AdminEvents:** ✅ **BEHOBEN 2026-08-04** — Edit-Dialog ist jetzt kontrolliert (`open`/`onOpenChange` an `editingEvent` gebunden) und schließt nach dem Speichern. Nebenbei behoben: toter Ticket-Link bei Events ohne URL (jetzt konditional „über P2G").
7. **AdminClubOwners:** ✅ **Lösch-Bestätigung NACHGERÜSTET 2026-08-04** (AlertDialog im etablierten Muster). Offen: Variable `weeklyMinutes` speichert Monatsminuten (irreführend). Nebenbei behoben: Spaltenversatz in der Tabelle (7 Zellen bei 6 Headern).
8. **AdminClubs:** ✅ **Stale-State BEHOBEN 2026-08-04** — `selectedClub` wird jetzt aus den frischen Query-Daten aufgelöst (State hält nur die Auswahl). Offen: `window.confirm()` → AlertDialog; Mitglieder-Zähler zählt nur aktive, Tabelle zeigt alle.
9. **AdminMarketplace:** Punkte-Rabatt-Hinweis rechnet unleserlich (`formatEuro(Math.floor(credit_cost))` — Ergebnis stimmt zufällig, `Math.floor` wirkungslos). Produktfilter „Status" filtert `is_active`, die Status-Spalte zeigt aber Live/Entwurf — begrifflich verwirrend. SEO-Felder ohne Zeichenlimits/Zähler (Design: 60/155).

10. **AdminVouchers:** ✅ **Zeitzonen-Bug BEHOBEN 2026-08-04** — Befüllen konvertiert UTC→lokal (`date-fns format`), Speichern lokal→UTC (`toISOString()`), beide Richtungen für Create+Update. ✅ Ebenfalls behoben (2026-08-04): `toggleMutation` hat jetzt `onError`-Toast; `handleUpdate` meldet leeren Code. Offen: DB-Fehler landen roh/englisch im Toast.
11. **AdminP2GPoints / LocationTeasers / SkyPadel:** `parseInt(...) || 0`-Muster macht Zahlenfelder beim Tippen nicht leerbar (springt auf 0) — betrifft mehrere Seiten. SkyPadel: `handleSortChange` feuert auch ohne Wertänderung; Datei-Input wird nach Upload nicht zurückgesetzt (gleiche Datei zweimal wählen geht nicht); Bild-Löschen entfernt nur die DB-Zeile, Storage-Datei bleibt verwaist.
12. **`confirm()`-Dialoge vereinheitlichen:** LocationTeasers, SkyPadel, Clubs, ClubOwners (dort sogar ganz ohne Bestätigung) nutzen native/keine Dialoge, Events/Vouchers/Marketplace haben AlertDialogs → einheitlich AlertDialog.
13. **Geteilte `TranslatableField`-Komponente** hat noch den alten Stil (amber Lock-Badge; Design: lime DE / hellblau EN „DeepL") — zentraler Redesign-Pass wirkt auf viele Admin-Seiten.

14. **AdminPartnerTiles:** ✅ try/catch + Fehler-Toast bei `handleSortChange` nachgerüstet (2026-08-04). Offen: feuert weiterhin pro Tastendruck (Debounce/onBlur wäre besser). Seitentext „alle Felder speichern sofort" stimmt für die Beschreibung nicht (speichert per Button).
15. **AdminNews:** DnD-Index basiert auf `visibleList`, Reihenfolge auf `list` — nur korrekt, weil DnD bei aktivem Filter gesperrt ist (fragil). Doppelte Cover-Vorschau im Dialog. Nebenbei behoben: Filter-Chips verschwanden bei 0 Treffern — Filter war nicht mehr zurücksetzbar.
16. **AdminQrPanel:** ✅ **BEHOBEN 2026-08-04** — `accept` auf `application/pdf,image/png,image/jpeg,image/webp` eingegrenzt (deckungsgleich mit `validateFile`).

17. **AdminColors:** ✅ **BEHOBEN 2026-08-04** — Update prüft jetzt die betroffenen Zeilen und legt fehlende `app.theme.*`-Zeilen an (Insert-Fallback statt stillem 0-rows-Update; bestehende Labels bleiben unangetastet).
18. **AdminNotifications:** ✅ Benutzersuche serverseitig verdrahtet (2026-08-05, `ilike` + limit 20, debounced). Kein Detail-View für gesendete Mitteilungen (Text/CTA nur über Edit-Dialog einsehbar). `updated_at` existiert, wird nirgends angezeigt.
19. **AdminNewsletter:** ✅ Behoben (2026-08-04): `resetCampaign()` fragt jetzt mit Doppelversand-Warnung nach; `editCampaign()` meldet Ladefehler per Toast. Offen: Edge-Function-Dedupe beim erneuten Senden prüfen; Send-Bestätigung nennt die Empfängerzahl nicht; Vorschau-Abmeldelink `href="#"` (echte Mails haben den echten Link). Idee: gesendete Kampagnen als Vorlage duplizieren.
20. **AdminUsers:** Nebenbei behoben: nested-`<p>` im Lösch-Dialog + mobile-gebrochenes KPI-Grid. Offen: Detail-Dialog ohne `DialogDescription` (Radix-a11y-Warnung).

21. **AdminVisuals:** ✅ **URL-Löschbug BEHOBEN 2026-08-04** — `handleSaveUrl` nutzt jetzt denselben Fallback wie die Input-Anzeige (bestehende URL statt `""`). ✅ Auch behoben (2026-08-04): `isVideoKey` matcht jetzt nur noch `.video`/`.video-N` als letztes Segment.
22. **AdminAnalytics:** N+1-Muster — ~15 sequenzielle Count-Requests pro Seitenaufruf (7 Tage + Status + Standorte + 4 Wochen) → RPC/Aggregat-Query. ✅ Doppelzählung behoben (2026-08-04): Wochenfenster jetzt [start, ende) via `lt` statt `lte`. Kein Loading-Skeleton.
23. **AdminFeatures:** ✅ Behoben (2026-08-04): Credits-Handler schreiben jetzt `updated_by` und loggen Fehler per `console.error`. CLAUDE.md veraltet: `feature_app_launched`-Master-Switch existiert im Code nicht mehr (3-Stufen-Modell `feature_*_state` ist aktuell).
24. **types.ts veraltet:** `partner_touchpoint_slides`, `qr_sections`, `skypadel_gallery` u. a. fehlen in den generierten Supabase-Typen → überall `(supabase as any)`-Casts + vorbestehende tsc-Fehler. Typgenerierung nachziehen.

25. **AdminIntegrations:** Secret-Hints inkonsistent — Stripe warnt „…sonst wird er entfernt", die anderen Keys nicht, obwohl dieselbe Lösch-Semantik gilt. Plain-Felder lassen sich nicht absichtlich leeren (Leerstring = „nicht ändern", fällt aus dem Payload). PayPal: Secret-Inputs editierbar, Speichern aber disabled — Eingaben gehen ins Leere. „Verbunden" heißt nur „Key hinterlegt" — „Verbindung testen"-Button wäre wertvoll. Resend-Absender-Feld vermutlich wirkungslos (Sender zentral in `_shared/email.ts`).

## Backend-Wiring — Stand 2026-08-05

**✅ Verdrahtet (2026-08-05, alles echte Daten):**
- **Sidebar:** Live-Counts — Buchungen (bestätigt, heute) + Marketplace (bezahlte, unversendete Bestellungen), 2-min-Refresh
- **Overview:** Zeitraum-Umschalter Heute/Woche/Monat; Umsatz-KPI (`price_cents`, nur bezahlte Buchungen, ohne Kontingent-/Gratisbuchungen) + Ø pro Buchung; Trend-Badges Buchungen/Umsatz vs. Vorperiode; Spieler- + Betrag-Spalten; „Alle →"/„Verwalten →"/„Neuer Standort"-Links
- **Bookings:** Court-Filter; Spalten Dauer/Betrag/Zahlung (Modus: Kontingent/Credits/Gutschein/Split/Voll); „LÖSCHEN"-Tipp-Bestätigung im Reset-Dialog
- **Club Owners:** Kontingent-Nutzung pro Zuweisung (Progressbar, `club_quota_ledger`, identische Aggregation wie die Buchungs-API)
- **Marketplace:** Tab-Count offene Bestellungen + Retouren (status=requested)
- **Vouchers:** KPI-Zeile (Aktive/Einlösungen/Abgelaufen) + Code-Suche mit Live-Filter
- **Mitteilungen:** Empfängerkreis-Infobox im Edit-Dialog; Benutzersuche serverseitig (`ilike` + limit 20, debounced) statt Alle-Profile-Download
- **Newsletter:** Send-Bestätigung als AlertDialog mit echter Abonnentenzahl
- **Integrationen:** maskierte Secret-Vorschau (`••••…c21a`) als Input-Placeholder
- **SkyPadel:** „Live-Seite öffnen"-Link

**Noch offen:**
- **Vouchers „Rabattwert €":** braucht Einlösungs-Ledger — Vorschlag: Migration `voucher_redemptions` (voucher_id, booking_id, discount_applied_cents), befüllt beim Checkout
- **Bookings Zahlungs-STATUS** (bezahlt/offen/erstattet): `payments (status)`-Embed in die Buchungs-Query (kein Schema-Change nötig)
- **Bookings:** Teilnehmer-Sektion im Detail-Drawer (Kind-Komponente), Lobby-Herkunft
- **Marketplace KPI-Trends:** keine Trenddaten im Analytics-Response
- **SkyPadel:** Drag&Drop-Sortierung (Design zeigt Grip-Cursor)

**Wichtige Semantik-Hinweise (von den Wiring-Agenten):**
- Overview-Umsatz = berechneter Buchungswert; wenn Punkte-als-Rabatt live geht, wäre Cash-Umsatz über `payments.amount_total_cents` sauberer. Clientseitige Summierung deckelt theoretisch bei >1.000 Zeilen/Zeitraum → langfristig SQL-Aggregat-RPC.
- Bookings „Zahlung" zeigt den Modus, nicht den Zahlungseingang.
- Retouren-Pill zählt nur `requested` (Konvention der Bestellungen-Sektion); `received` mitzählen wäre eine Ein-Zeilen-Änderung.
- Mitteilungen-Suche: Treffer erst ab 2 Zeichen; Sonderzeichen `% _ , ( )` werden aus dem Suchbegriff entfernt.
- Buchungen-Reset erfordert jetzt zwingend das Tippen von „LÖSCHEN"; Standortwechsel resettet den Court-Filter.

## Visuals-Audit (2026-08-07)

Voller Abgleich aller `site_visuals`-Einträge gegen echte Nutzung (Web-Code-Grep + **Live-Tabellen-Abgleich** via Management-API): Web zeigt genau **10 Keys** (fuer-spieler.hero.image/video, home.network.courts/events, home.verein-steps.step-1..6). **Wichtige Erkenntnis:** Die iOS-App besitzt 8 eigene `app.*`-Visuals (app.auth.backdrop, app.booking.header, app.events.header, app.home.*, app.market.header, app.news.header), die NUR live existieren (nie in Migrationen) — bei künftigen Cleanups immer ganz `app.%` ausnehmen! **✅ AUSGEFÜHRT 2026-08-07 (live):** 4 Web-Waisen gelöscht — fuer-spieler.ki.video-1, fuer-spieler.marketplace.banner, home.fuer-wen.background, fuer-spieler.wingfield.action (dessen Lösch-Migration 20260414110000 lief live nie). Endstand: 15 app-Zeilen + 10 Web-Zeilen. Migration `20260807120000_cleanup_unused_site_visuals.sql` liegt fürs Repo/andere Umgebungen bei (idempotent). Storage-Dateien gelöschter Einträge bleiben liegen (nur Speicher, unkritisch).

## Kind-Komponenten Welle 1 — erledigt 2026-08-10

BookingWeekCalendar + BookingDetailDrawer, AdminLocationCard + AdminCourtCard + CourtPriceDialog, LocationAnalyticsTab + 3 Kamera-Komponenten, TranslatableField (geteilt, wirkt auf 5 Seiten). Dabei: **Club-Farbe plattformweit auf #7FD4FF vereinheitlicht** (Kalender, Legende, Zähler, Listen-Badges — Punkt aus Bug-Liste #3 erledigt); halbstündige Buchungen sitzen im Kalender jetzt minutengenau (vorher auf volle Stunde gerendert). Neue Funde: LocationAnalyticsTab rechnet „Auslastung" mit 12h/Tag-Annahme — weicht von AdminUtilization ab (zwei verschiedene Auslastungs-Zahlen im Admin → konsolidieren); CameraApiKeysTab nutzt `confirm()` + Dialog-X resettet Formular-State nicht; `Booking`-Interface in beiden Buchungs-Komponenten dupliziert.

## Kind-Komponenten Welle 2 — erledigt 2026-08-10 · FOLGE-PASS KOMPLETT ✅

EventForm + Artist/Brand/Highlights (inkl. Mobile-Fixes der harten 3-Spalten-Grids), MarketplaceOrdersSection + CatalogManagerDialog, P2GWalletsTab + P2GExpertLevelsTab, WritingStyleManager + VoiceInArticle. Damit ist der GESAMTE Admin (Seiten + Masken) im neuen Design. Neue Funde: Schreibstil-Löschen ohne Bestätigung (Ein-Klick-Delete); Grip-Icons in Artist/Brand-Manager sind Deko ohne DnD; `instagram_url`-Felder speichern teils Handles statt URLs; Katalog-Dialog + Expert-Level-Delete nutzen noch `confirm()` → gehören in den confirm()→AlertDialog-Sweep.

## Folge-Pass: Kind-Komponenten (Design da, Komponente noch alt) — ✅ komplett erledigt (s. o.)

- `BookingWeekCalendar.tsx`, `BookingDetailDrawer.tsx` (aus Admin 02)
- `AdminLocationCard.tsx`, `AdminCourtCard.tsx`, `LocationAnalyticsTab.tsx`, Camera-Komponenten, `CourtPriceDialog` (aus Admin 03)
- `EventForm.tsx` + ArtistManager/BrandManager/HighlightsInput (aus Admin 07)
- `MarketplaceOrdersSection.tsx`, `CatalogManagerDialog.tsx` (aus Admin 08 — sonst Stilbruch im Bestellungen-Tab)
- `P2GWalletsTab.tsx`, `P2GExpertLevelsTab.tsx` (aus Admin 09 — sonst Stilbruch beim Tab-Wechsel)
- `TranslatableField` (geteilt — betrifft LocationTeasers, SkyPadel, Touchpoint Slides, Partner-Kacheln, QR-Panel u. a.)
- `WritingStyleManager.tsx`, `VoiceInArticle.tsx` (aus Admin 16 News)

## Erledigt

- 2026-08-04: `AdminHeader` redesignt (sticky, Route-Pfad, dynamischer Titel, User-Chip) — gilt für alle Admin-Seiten.
- 2026-08-04: `/admin/settings` auf neues Design umgestellt (styling only, PIN-Locks unverändert funktional).
