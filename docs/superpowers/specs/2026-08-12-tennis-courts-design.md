# Tennis-Courts als zweite Sportart

## Kontext

Vereine sollen neben Padel- auch **Tennis-Courts** über PADEL2GO an Externe vermieten können. Heute kennt die Plattform nur eine Sportart: `courts` hat kein Sportart-Feld, im gesamten Code existiert kein Sport-Konzept. Padel bleibt das Kernprodukt — Tennis ist eine Nebenkategorie, auf die im Frontend nur dezent hingewiesen wird.

Das Ziel ist dreiteilig: Vereine sehen und pflegen ihre Tennis-Courts im Club-Portal, du verwaltest und wertest sie im globalen Admin getrennt oder konsolidiert aus, und Externe können sie buchen wie Padel-Plätze.

**Getroffene Entscheidungen:** Tennis gibt **keine** P2G-Punkte · Tennis nur **60-Minuten**-Buchungen · Tennis-Bild **pro Standort** · Umschalter **pro Admin-Seite** (Konsolidiert/Padel/Tennis) · **kein** Feature-Flag, sichtbar sobald ein Tennis-Court existiert · Club-Kontingente bleiben unverändert (an `court_id` gebunden, dadurch automatisch sportgetrennt).

---

## 1. Datenmodell — eine Migration als Fundament

Nach dem bewährten additiven Muster (wie `20260705120000_add_court_label.sql` und die Preisbänder): Bestandsdaten werden automatisch Padel, ohne Migration von Daten.

- `courts.sport text NOT NULL DEFAULT 'padel'` mit `CHECK (sport IN ('padel','tennis'))`
- `locations.tennis_image_url text` — Tennis-Ansicht je Standort
- **`court_pricing_bands.sport text NULL`** — kritisch: Ein globales Band (`court_id IS NULL`) würde sonst ungefiltert auch auf Tennis greifen. Das ist ein *Preisfehler*, kein Anzeigeproblem. `NULL` = alle Sportarten, sonst auf eine begrenzt. Aktuell existieren 0 Bänder, es gibt also keinen Bestandszwang.

Anzupassende DB-Funktionen (aus `20260810120000_court_pricing_bands.sql`):
- `resolve_booking_rate()` — Bänder zusätzlich gegen die Sportart des Courts filtern
- `resolve_booking_rates_batch()`, `court_min_price_cents()` — ziehen nach
- **Tennis-Payback:** `resolve_booking_rate` gibt die **Sportart** mit zurück; die drei Punkte-Stellen überspringen die Gutschrift für Tennis genau so, wie sie es heute schon bei Gutscheinen tun (`stripe-webhook`, `rewards-estimate`, Free-Path in `create-checkout-session`). Bewusst *nicht* über `points_multiplier = 0` gelöst: Die Vorschau würde das sonst als „Zeitfenster-Bonus ×0" ausweisen, obwohl es an der Sportart liegt und nicht am Zeitfenster. Der Storno-Clawback stimmt automatisch, da er mit dem gespeicherten `play_credits_awarded = 0` rechnet.
- Auslastungs-RPCs (`get_court_utilization`, `..._trend`, `get_network_utilization_trend`): **neuer Parameter `p_sport text DEFAULT NULL`**. Reines Frontend-Filtern genügt hier nicht, weil die Seite Summen über die Zeilen rechnet (`totals`, `byLocation`) und die Berechnung serverseitig passiert. Der Default hält bestehende Aufrufe kompatibel.

Serverseitige Durchsetzung der 60-Minuten-Regel (damit es keine reine UI-Konvention ist): `create-guest-booking` und `club-booking-api` validieren Dauern bereits serverseitig — dort Tennis auf 60 Min begrenzen.

## 2. Globaler Admin — sieben Seiten

Gemeinsame Grundlage: eine kleine geteilte Komponente **`SportScopeTabs`** (Konsolidiert / Padel / Tennis), stilistisch 1:1 nach dem vorhandenen Segmented Control in `AdminOverview.tsx:457-472`. Jede Seite hält ihren eigenen State, Standard **Konsolidiert** — so ist immer sichtbar, welcher Blick aktiv ist.

| Seite | Was passiert |
|---|---|
| **Overview** | Umschalter neben den Zeitraum-Reitern. Alle Buchungs-/Umsatz-KPIs, der Court-Zähler (`:217-226`), das Court-Dropdown (`:299-309`) und das Standorte-Panel (`:764`) bekommen ein Sport-Prädikat. |
| **Analytics** | Hat heute **gar keine Filter-UI** — Umschalter neu aufbauen. Die vier Auswertungen filtern über `court_id`; Umsatz existiert hier bisher nicht und bleibt außen vor. |
| **Auslastung** | Umschalter neben dem Standort-Select (`:338-348`); der Sport geht als RPC-Parameter mit, damit Summen und Netzwerk-Trend stimmen. |
| **Buchungen** | Fünfter Select im vorhandenen Filter-Grid (`:401-477`); Court-Query (`:130-141`) und Hauptquery-Filterkette (`:190-208`) erweitern, Query-Keys mitziehen, Sport-Wechsel setzt den Court-Filter zurück. Kalender/Liste zeigen die Sportart am Court-Label. |
| **Preise & Punkte** | Sport-Auswahl im Band-Dialog und im Vorschau-Scope (`:798-810`). `bandTier`/`compareBands`/`findConflicts` müssen die neue Dimension kennen, sonst meldet die Konflikt-Erkennung falsch. |
| **Courts & Standorte** | Sport beim **Anlegen** (`AddCourtDialog`, `CourtCountSelector`) und **Bearbeiten** (`AdminCourtEditDialog`) — sonst entstehen sportlose Courts. Sport-Badge auf der Court-Karte, Zähler und Tab-Badges nach Sportart getrennt, Tennis-Bild-Upload im `LocationForm`. Der Analytics-Tab bekommt den Umschalter neben seinen Zeitraum-Buttons (`LocationAnalyticsTab:273-290`); seine Auslastungsformel rechnet hart mit `courts.length` und würde Tennis-Courts sonst in die Padel-Auslastung zählen. |
| **Clubs** | Court-Dropdown der Zuweisung (`:203-221`, Label `:762`) um die Sportart ergänzen — sonst sind „Court 1" (Padel) und „Court 1" (Tennis) nicht unterscheidbar. Kontingent-Logik bleibt unangetastet. |

## 3. Club-Portal — ein struktureller Blocker zuerst

`useClubAuth.ts:190` setzt `primaryAssignment = assignments[0]`, und **jede** Seite außer der Auslastung hängt daran. Ein Verein mit Padel *und* Tennis sähe in Buchungen, Kalender und Court-Features nur den erstbesten Court — das muss vor allem anderen weg.

- `useClubAuth.ts` — `sport` mitselektieren (`:126-137`, `:158-170`), `primaryAssignment` durch eine bewusste Court-/Sport-Auswahl ersetzen (Context um `ClubLayout`)
- Court-/Sport-Auswahl in `ClubBookings`, `ClubCalendar`, `ClubCourtFeatures`; in `ClubUtilization` neben den bestehenden Court-Select
- `ClubBookings`: Dauer-Auswahl für Tennis auf 60 Min beschränken (`SLOT_DURATIONS`)
- Ausstattung: `COURT_FEATURES` enthält bereits `schlaegerverleih`/`ballverleih` — je Sportart sinnvoll darstellen; die Whitelist in `club-court-update` muss synchron bleiben

## 4. Buchungsstrecke — Padel vorn, Tennis daneben

- `useBookingLocation.ts:82-86` lädt heute alle Courts eines Standorts. Künftig mit Sportart; Auto-Select bleibt auf einem **Padel**-Court.
- `BookingSlotPicker.tsx:124-164`: Eine dezente Sport-Umschaltung **oberhalb** der Court-Auswahl, die nur erscheint, wenn der Standort Tennis-Courts hat. Standard Padel. Bei Tennis entfällt die Dauer-Auswahl (nur 60 Min).
- **Der Hinweis** („…nach dem Padeln auch mal Tennis probieren? Verleihschläger gibt's vor Ort.") als Pill/Box nach dem Vorbild von `BookingSummary.tsx:242-253` bzw. `Booking.tsx:173-176` — im selben Design-Vokabular, kein neues Layout. Texte nach `locales/de|en/booking.json`.
- **Automaten-Hinweis:** Standorte haben bereits einen `vending_enabled`-Schalter und einen „Automat"-Chip. Der Tennis-Hinweis nennt die Verleihschläger dort, wo dieser Chip aktiv ist — ohne neue Infrastruktur.
- `LocationCard`: Chip „Auch Tennis" in der bestehenden Chip-Reihe; `courtCount` nach Sportart aufschlüsseln.
- **Achtung Preis-Anzeige:** `court_min_price_cents` und `fetchLocationMinPriceCents` bilden das Minimum über *alle* Courts — ein günstiger Tennispreis würde sonst als Padel-„ab X €" ausgewiesen. Muss sportbewusst werden.

## 5. Bilder

- `locations.tennis_image_url` — Upload im `LocationForm` neben dem bestehenden Standortbild (gleicher Storage-Bucket `media`, gleiches Muster `:125-155`)
- Ein globales Teaser-Bild über einen neuen `site_visuals`-Key `booking.tennis.teaser` (Kategorie „Buchung"), pflegbar unter Admin → Visuals — Muster: `20260704120000_add_home_network_visuals.sql`

---

## Reihenfolge

1. **Migration + DB-Funktionen** (Fundament, live verifizieren wie bei den Preisbändern)
2. **Admin: Courts & Standorte** — ohne die Möglichkeit, Tennis-Courts *anzulegen*, ist nichts testbar
3. **Edge Functions** (Payback-Abschaltung, 60-Min-Regel) + Deploy
4. **Buchungsstrecke** inkl. Hinweis und Bildern
5. **Restliche Admin-Seiten** mit `SportScopeTabs` (parallelisierbar)
6. **Club-Portal** (`primaryAssignment`-Umbau zuerst)

## Verifikation

- **DB:** Nach der Migration gegen die Live-DB prüfen — Bestands-Courts sind alle `padel`; ein globales Band greift nachweislich *nicht* auf einen Tennis-Court; `resolve_booking_rate` liefert für Tennis `points_multiplier = 0`. Gleiche Methode wie bei den Preisbändern (Testdatensatz anlegen, vier Fälle prüfen, wieder entfernen).
- **Ende-zu-Ende:** Einen Tennis-Court an einem bestehenden Standort anlegen, Preis setzen, als Gast und als eingeloggter Nutzer buchen. Erwartung: Buchung klappt, Zahlung stimmt, **`bookings.play_credits_awarded` bleibt 0**, Wallet unverändert.
- **Gegenprobe Padel:** Eine Padel-Buchung am selben Standort muss weiterhin Punkte geben — die Regression wäre sonst still.
- **Admin:** Auf Overview, Auslastung und Analytics je Umschalterstellung prüfen, dass Konsolidiert = Padel + Tennis aufgeht.
- **Club-Portal:** Mit einem Verein testen, dem sowohl ein Padel- als auch ein Tennis-Court zugewiesen ist — beide müssen erreichbar sein.
- `npm run build` grün nach jedem Abschnitt; Edge Functions deployen, **bevor** Tennis-Courts live gehen.

## Bewusst nicht enthalten

Kein Feature-Flag (so entschieden) · keine Änderung an der Kontingent-Logik · keine Tennis-spezifischen Turniere/Events/Ligen · kein Umbau des Marketings (die Seite „Für Vereine" spricht bereits „Tennis- & Sportvereine" an) · `points_ledger`/Wallets bleiben unberührt, da Tennis keine Punkte erzeugt.
