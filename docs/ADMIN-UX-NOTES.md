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

6. **AdminEvents:** Edit-Dialog schließt nach dem Speichern nicht (unkontrollierter Dialog, `onSuccess` setzt nur `editingEvent`, das nie gelesen wird) → kontrolliert machen. Nebenbei behoben: toter Ticket-Link bei Events ohne URL (jetzt konditional „über P2G").
7. **AdminClubOwners:** Löschen einer Zuweisung OHNE Bestätigungsdialog (sofortiges Delete) → AlertDialog nachrüsten. Variable `weeklyMinutes` speichert Monatsminuten (irreführend). Nebenbei behoben: Spaltenversatz in der Tabelle (7 Zellen bei 6 Headern).
8. **AdminClubs:** `selectedClub` ist eine Kopie aus der Query — nach Mutationen (Aktiv-Toggle, Court/Mitglied ändern) zeigt der Detailbereich veraltete Daten bis zur erneuten Club-Auswahl (Stale-State-Bug). `window.confirm()` für Club-Löschen/Mitglied-Entfernen wirkt im neuen Design fremd → AlertDialog. Mitglieder-Zähler zählt nur aktive, Tabelle zeigt alle.
9. **AdminMarketplace:** Punkte-Rabatt-Hinweis rechnet unleserlich (`formatEuro(Math.floor(credit_cost))` — Ergebnis stimmt zufällig, `Math.floor` wirkungslos). Produktfilter „Status" filtert `is_active`, die Status-Spalte zeigt aber Live/Entwurf — begrifflich verwirrend. SEO-Felder ohne Zeichenlimits/Zähler (Design: 60/155).

10. **AdminVouchers:** Zeitzonen-Bug beim Bearbeiten — `valid_from/until` (UTC-ISO) wird per `.slice(0,16)` in `datetime-local` gesteckt und ohne Offset zurückgespeichert → Zeiten verschieben sich um den UTC-Versatz. `toggleMutation` ohne `onError` (Fehlschlag unsichtbar). `handleUpdate` bricht bei leerem Code stumm ab. DB-Fehler landen roh/englisch im Toast.
11. **AdminP2GPoints / LocationTeasers / SkyPadel:** `parseInt(...) || 0`-Muster macht Zahlenfelder beim Tippen nicht leerbar (springt auf 0) — betrifft mehrere Seiten. SkyPadel: `handleSortChange` feuert auch ohne Wertänderung; Datei-Input wird nach Upload nicht zurückgesetzt (gleiche Datei zweimal wählen geht nicht); Bild-Löschen entfernt nur die DB-Zeile, Storage-Datei bleibt verwaist.
12. **`confirm()`-Dialoge vereinheitlichen:** LocationTeasers, SkyPadel, Clubs, ClubOwners (dort sogar ganz ohne Bestätigung) nutzen native/keine Dialoge, Events/Vouchers/Marketplace haben AlertDialogs → einheitlich AlertDialog.
13. **Geteilte `TranslatableField`-Komponente** hat noch den alten Stil (amber Lock-Badge; Design: lime DE / hellblau EN „DeepL") — zentraler Redesign-Pass wirkt auf viele Admin-Seiten.

14. **AdminPartnerTiles:** `handleSortChange` feuert bei jedem Tastendruck eine Mutation (kein Debounce/onBlur) und hat als einziger Handler kein try/catch (Fehler ohne Toast). Seitentext „alle Felder speichern sofort" stimmt für die Beschreibung nicht (speichert per Button).
15. **AdminNews:** DnD-Index basiert auf `visibleList`, Reihenfolge auf `list` — nur korrekt, weil DnD bei aktivem Filter gesperrt ist (fragil). Doppelte Cover-Vorschau im Dialog. Nebenbei behoben: Filter-Chips verschwanden bei 0 Treffern — Filter war nicht mehr zurücksetzbar.
16. **AdminQrPanel:** `accept="application/pdf,image/*"` erlaubt browserseitig GIF/SVG, die Validierung lehnt erst nach Auswahl ab → `accept` enger fassen.

17. **AdminColors:** Speichern nutzt `update` ohne Upsert — fehlt die `site_visuals`-Zeile für einen `app.theme.*`-Key, meldet die UI Erfolg, gespeichert wird nichts (0 rows affected). → Upsert.
18. **AdminNotifications:** Benutzersuche lädt ALLE Profile ungefiltert in den Client — bei wachsender Nutzerbasis serverseitig suchen (`ilike` + Limit). Kein Detail-View für gesendete Mitteilungen (Text/CTA nur über Edit-Dialog einsehbar). `updated_at` existiert, wird nirgends angezeigt.
19. **AdminNewsletter:** `resetCampaign()` ohne Bestätigung/Guard — Zurücksetzen + erneutes Senden könnte Doppelversand auslösen (Edge-Function-Dedupe prüfen). `editCampaign()` ohne catch (Ladefehler still). Send-Bestätigung nennt die Empfängerzahl nicht. Vorschau-Abmeldelink `href="#"` (echte Mails haben den echten Link — nur Vorschau ungenau). Idee: gesendete Kampagnen als Vorlage duplizieren.
20. **AdminUsers:** Nebenbei behoben: nested-`<p>` im Lösch-Dialog + mobile-gebrochenes KPI-Grid. Offen: Detail-Dialog ohne `DialogDescription` (Radix-a11y-Warnung).

21. **AdminVisuals (Bug-Kandidat):** `handleSaveUrl` speichert bei unberührtem Input `""` — Klick auf „OK" ohne Tippen löscht die gespeicherte Video-URL. Außerdem: `isVideoKey` matcht per `includes(".video")` (ein Key wie `x.videowall.y` würde fälschlich als Video behandelt).
22. **AdminAnalytics:** N+1-Muster — ~15 sequenzielle Count-Requests pro Seitenaufruf (7 Tage + Status + Standorte + 4 Wochen) → RPC/Aggregat-Query. Wochenfenster sind beidseitig inklusiv — Registrierung exakt auf der Grenze wird doppelt gezählt. Kein Loading-Skeleton.
23. **AdminFeatures:** Credits-Handler schreiben `updated_at` aber kein `updated_by` (Audit-Trail-Lücke) und loggen Fehler nicht. CLAUDE.md veraltet: `feature_app_launched`-Master-Switch existiert im Code nicht mehr (3-Stufen-Modell `feature_*_state` ist aktuell).
24. **types.ts veraltet:** `partner_touchpoint_slides`, `qr_sections`, `skypadel_gallery` u. a. fehlen in den generierten Supabase-Typen → überall `(supabase as any)`-Casts + vorbestehende tsc-Fehler. Typgenerierung nachziehen.

25. **AdminIntegrations:** Secret-Hints inkonsistent — Stripe warnt „…sonst wird er entfernt", die anderen Keys nicht, obwohl dieselbe Lösch-Semantik gilt. Plain-Felder lassen sich nicht absichtlich leeren (Leerstring = „nicht ändern", fällt aus dem Payload). PayPal: Secret-Inputs editierbar, Speichern aber disabled — Eingaben gehen ins Leere. „Verbunden" heißt nur „Key hinterlegt" — „Verbindung testen"-Button wäre wertvoll. Resend-Absender-Feld vermutlich wirkungslos (Sender zentral in `_shared/email.ts`).

## Backend-Wiring offen (Design zeigt es, Seite hat kein Gegenstück)

- **Sidebar:** Live-Counts an „Buchungen" und „Marketplace" (Design-Dummies weggelassen)
- **Overview:** Zeitraum-Umschalter (Heute/Woche/Monat), Umsatz-KPI, Trend-Badges, Spieler-/Betrag-Spalten in „Letzte Buchungen", „Alle →"-Links, „Neuer Standort"-CTA
- **Bookings:** Court-Filter, Spalten Dauer/Betrag/Zahlung/Lobby-Herkunft, „LÖSCHEN"-Tipp-Bestätigung im Reset-Dialog (sinnvolles Sicherheits-Upgrade), Teilnehmer-Sektion im Detail-Drawer
- **Club Owners:** Kontingent-Nutzungsanzeige (Progressbar „X h genutzt" + Prozent) — braucht Aggregation der genutzten Freiminuten pro Owner/Monat
- **Marketplace:** KPI-Trend-Badges, Tab-Counts „X offen" für Bestellungen/Retouren
- **Vouchers:** KPI-Zeile (Aktive Codes / Einlösungen / Rabattwert € / Abgelaufen), Code-Suche mit Live-Filter
- **SkyPadel:** Drag&Drop-Sortierung (Design zeigt Grip-Cursor), „Live-Seite öffnen"-Link
- **Mitteilungen:** Empfängerkreis-Infobox im Edit-Dialog (Daten via `target_type`/`recipients_count` vorhanden)
- **Newsletter:** Send-Bestätigung als AlertDialog mit echter `counts.confirmed`-Empfängerzahl
- **Integrationen:** maskierte Secret-Vorschau als Input-Placeholder (liegt schon client-seitig in `originalConfigs`)

## Folge-Pass: Kind-Komponenten (Design da, Komponente noch alt)

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
