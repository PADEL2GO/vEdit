# 📄 Handover-Brief — Booking / Court-Buchung

> Für Claude Design. Ziel: den kompletten Buchungs-Flow neu gestalten — **sehr interaktiv, viele Icons & Visuals, aber betont simpel und „easy to use".** **Gäste müssen ohne Login buchen können.**

## 1. Kontext
Öffentlicher **Court-Buchungs-Flow** von PADEL2GO (deutsche Padel-Plattform, Dark/Lime). Der Nutzer wählt einen **Standort → Court/Datum/Dauer/Uhrzeit → bezahlt (Stripe) → Bestätigung**. Buchung funktioniert **mit und ohne Konto** (Gast-Checkout). Der Flow ist die wichtigste Conversion-Strecke — er muss auf einen Blick verständlich, schnell und „tap-freundlich" sein, auch auf dem Handy (ab 320px).

## 2. Design-System (beibehalten)
- **Theme:** Dark, reines Schwarz `#000000`, Text fast-weiß `#FAFAFA`.
- **Markenfarbe:** Lime `#C7F011` — Buttons, aktive Auswahl, Icons, Glow, Highlights.
- **Fonts:** Überschriften *Bricolage Grotesque* (bold), Fließtext *DM Sans*, **Zahlen/Preise/Uhrzeiten in *JetBrains Mono*** (`.font-stat`).
- **Karten:** `rounded-2xl`, subtiler Dunkelgrau-Gradient (`.bg-gradient-card`), 1px-Border die bei Hover/Auswahl lime wird, Lime-Glow.
- **Einheitlicher Seitenrahmen wie Homepage:** Content-Wrapper `max-w-[1200px]` + 20px Seitenpadding, Sektionsabstand konsistent.
- **Animationen:** Framer Motion — fade+rise, sanfte Auswahl-Transitions, Erfolgs-Spring.

## 3. Design-Ziele (Florians Wünsche — wichtig!)
- **Maximale Interaktivität & Visualität:** deutlich mehr Icons, Status-Pills, Fortschritts-/Schritt-Anzeigen, Micro-Interactions und visuelle Rückmeldung als auf der Homepage. Jede Auswahl (Court, Datum, Dauer, Slot) soll sich „anfühlen" (Hover, aktiver Zustand, Häkchen, Glow).
- **Trotzdem simpel:** klare, lineare Schritt-für-Schritt-Führung, kein Overload. Große Tap-Ziele, klare Primär-Aktion je Screen. Ein sichtbarer **Fortschritts-/Stepper-Indikator** über den ganzen Flow (Standort → Termin → Bezahlen → Fertig) wäre ideal.
- **Gast-first:** Gäste dürfen NIE zum Login gezwungen werden. Der Gast-Weg muss prominent, freundlich und reibungslos sein („Ohne Konto buchen"), mit sanftem Upsell („mit Konto: P2G Points sammeln"), aber niemals als Blocker.

## 4. Der Flow (5 Screens + 2 Overlays)
```
① /booking            Standort-Liste (Grid von Location-Cards)
        ↓ Standort wählen
② /booking/locations/:slug   Standort-Detail: Header + Slot-Picker + Zusammenfassung
        ↓ „Jetzt buchen"  → Gast? → [Gast-Modal] → 
③ /booking/checkout   Bezahlen (Reservierungs-Timer, Gutschein, Preis, Stripe)
        ↓ Stripe (extern)
④ /booking/success    Erfolg (Häkchen, P2G-Punkte, nächste Schritte)
   /booking/cancel     Abbruch (erneut versuchen / zurück)
Overlays: Gast-Checkout-Modal · „Meine Buchungen"-Panel (nur eingeloggt)
```

---

## 5. Screen für Screen

### ① `/booking` — Standort-Liste
- **Kopf:** H1 „Wähle deinen **Standort**" (zweiter Teil Lime-Gradient) + kurzer Intro-Satz. Darüber optional ein Stepper (Schritt 1/4).
- **Grid von Standort-Karten** (1 Spalte mobil → 2 Desktop). Jede Karte (viel Visual/Icon):
  - **Hero-Bild** des Standorts (21:9, aus Backend `main_image_url`; Fallback: Lime-Gradient + `map-pin`-Icon).
  - Name + Adresse (`map-pin`).
  - **Status-Pills/Chips:** Preis „ab X €" (`euro`-Icon), **Auslastung farbcodiert** (grün/gelb/rot, z. B. Ring/Balken), Feature-Chips: P2G Rewards (`trophy`), KI-Analyse (`brain`), Automat (`shopping-cart`).
  - **„Heute: X freie Slots"**-Box, Öffnungszeiten (`clock`, 24/7-Badge falls durchgehend).
  - Primär-Button „**Auswählen**" → Detailseite.
- **Zustände:** Loading (Spinner/Skeleton-Karten), „Bald verfügbar" (Empty, `eye-off`-Icon — Pre-Launch), „keine Standorte".
- Eingeloggt: darüber ein einklappbares **„Meine Buchungen"**-Panel (siehe Overlays).
- _Hinweis: aktuell KEINE Suche/Filter/Kartenansicht — ein dezenter Filter/Such-Header (Ort, „nur freie heute") wäre ein sinnvolles interaktives Upgrade, optional._

### ② `/booking/locations/:slug` — Standort-Detail + Buchung (Herzstück)
- **Back-Link** „Zurück zur Standortauswahl" (`arrow-left`).
- **Standort-Header:** großes Hero-Bild (21:9), Titel, Adresse mit Google-Maps-Link (`external-link`), Beschreibung, **Feature-Badges** (P2G Rewards/KI/Automat je nach Standort), Court-Features + Öffnungszeiten.
- **2-Spalten-Layout** (Desktop: `lg:grid-cols-3`; mobil gestapelt):
  - **Links (2/3): Slot-Picker** — der interaktivste Teil. 4 nummerierte Schritt-Karten (Icons + aktiver Lime-Zustand):
    1. **Court wählen** (`layout-grid`) — Buttons je Court (nur wenn >1 Court).
    2. **Datum** (`calendar`) — Kalender, nur heute bis +14 Tage wählbar, Vergangenheit deaktiviert.
    3. **Dauer** (`clock`/`timer`) — Buttons 60 / 90 / 120 Min.
    4. **Uhrzeit** (`clock`) — Grid von Zeit-Slot-Buttons (30-Min-Raster); verfügbar = anklickbar/Lime, belegt = deaktiviert/ausgegraut. States: Laden (Spinner), „keine Slots verfügbar" (`alert-circle`).
    → **Visualität hier maximieren:** aktive Auswahl mit Häkchen/Glow, sanfte Übergänge, evtl. eine kleine Verfügbarkeits-Heatmap/Timeline pro Tag.
  - **Rechts (1/3): Zusammenfassung** (sticky). Key-Value-Zeilen mit Icons: Standort (`map-pin`), Court, Datum (`calendar`), Dauer, Uhrzeit (`clock`). Darunter:
    - **Lobby-Option** (nur eingeloggt): `Switch` „Als Lobby öffnen" (+ „Coming Soon"-Badge falls Feature aus), Spieleranzahl-`Select` (Singles 2 / Doubles 4), Skill-Range-Anzeige (`zap`), Öffentlich-`Switch`.
    - **Preis** (groß, mono) — oder amber Warnung „noch keine Preise konfiguriert".
    - Slot-verfügbar-Bestätigung (`check-circle`, Lime-Box).
    - **Primär-Button „Jetzt buchen"** (Lime, groß).
    - **Gast-Hinweis (prominent, freundlich):** „Buchung ohne Konto möglich — oder anmelden für P2G Points & Vorteile" (Login-Link, kein Zwang).

### Overlay A — Gast-Checkout-Modal
Öffnet sich, wenn ein **Gast** „Jetzt buchen" klickt (statt Redirect zum Login!). Titel „Als Gast weiterbuchen". Felder mit Icons: **Name*** (`user`), **E-Mail*** (`mail`), Telefon optional (`phone`), **AGB-Checkbox*** (Links zu `/agb` + `/datenschutz`). Submit → weiter zum Checkout. Sekundär: „Schon ein Konto? Anmelden". → Freundlich, schnell, 3 Felder, kein Overload.

### ③ `/booking/checkout` — Bezahlen
- Back-Button. **Reservierungs-Timer** (amber Card, `timer`): „Reservierung läuft ab in mm:ss".
- **Haupt-Card „Buchung bezahlen"** (`credit-card`):
  - **Buchungs-Zusammenfassung** mit Icons: Standort/Court/Adresse (`map-pin`), Datum (`calendar`), Zeit + Dauer (`clock`).
  - **Gast-Banner** (nur Gast): Name (`user`) + E-Mail (`mail`), Label „Gastbuchung".
  - **Gutschein-Sektion** (einklappbar, `ticket`): Code-Input + „Einlösen"; gültig → grüne Bestätigung mit Clear-`x`; sonst Fehlermeldung.
  - **Gast-Upsell** (nur Gast): „Punkte sammeln mit Konto" → `/auth` (dezent).
  - **Rewards-Vorschau** (nur eingeloggt): grüne Box mit Punkte-Breakdown + Gesamt (`coins`/`gift`).
  - **Preis** (mono, groß): mit Gutschein durchgestrichener Originalpreis + Rabattpreis.
  - **Bezahl-Button** (Lime): Zustände „Jetzt bezahlen" / „Kostenlos buchen" (bei 100%-Gutschein) / „Verarbeite…".
  - **Zahlungsmethoden:** „Karte" (`credit-card`) + PayPal-Badge.
  - Stripe-Fallback-Link, AGB/Datenschutz-Footnote (Schloss-Icon `lock` „sicher").

### ④ `/booking/success` — Erfolg
- Animierter grüner **`check-circle`-Kreis** (Spring). H1 „Zahlung erfolgreich!" + Text.
- **P2G-Punkte-Bestätigung** (nur wenn Punkte verdient): grüne Box mit Breakdown + Gesamt (`coins`/`gift`).
- **Lobby-CTA** (nur eingeloggt, wenn Feature an): „Mach es zur Lobby".
- **Aktions-Buttons:** eingeloggt → „Meine Buchungen ansehen" (`/account`) + „Meine P2G Credits" (`/dashboard/p2g-points`); **Gast → „Kostenloses Konto erstellen"** (`user-plus`, `/auth`) + Info-Box „P2G Credits & Vorteile"; immer „Weitere Buchung" (`/booking`).

### `/booking/cancel` — Abbruch
Amber **`x-circle`-Kreis**, H1 „Zahlung abgebrochen", Hinweis (Reservierung wird kurz gehalten). Buttons: „Erneut versuchen" (`refresh-cw` → Checkout) + „Zurück zur Buchung" (`arrow-left`).

### Overlay B — „Meine Buchungen" (nur eingeloggt, auf ①)
Einklappbares Panel mit 3 Gruppen: **Zahlung ausstehend** (Live-Countdown + „Jetzt bezahlen"), **Kommende** (mit Storno-Dialog + Lobby-Button), **Vergangene** (max. 5). Empty: „Du hast noch keine Buchungen."

---

## 6. Backend-Wiring (bleibt erhalten)
- **Standorte** ← Tabelle `locations` (`main_image_url`, Adresse, Features, Öffnungszeiten).
- **Courts / Slots / Preise** ← `courts`, View `booking_availability`, `court_prices`.
- **Bilder kommen aus der DB** (`location.main_image_url`) — **kein** SiteVisual/visualKey hier; Fallback = Lime-Gradient + Icon.
- **Gast-Buchung** ← Edge Function `create-guest-booking`; **Zahlung** ← `create-checkout-session` (Stripe), Gutschein ← `voucher-validate`/`voucher-redeem`.
- Alle übrigen Visuals sind **lucide-Icons** (kein zusätzliches Bildmaterial nötig).

## 7. Wichtig (Rahmen)
- **Nur Optik/Styling** neu — Flow, Schritte, Routen, Datenquellen, Gast-Logik, Preise, Stripe bleiben unverändert; nichts löschen.
- **Gast-Buchung muss durchgängig möglich bleiben** (nie Login-Zwang).
- Mobil-first ab 320px, große Tap-Ziele.
- Sichtbarkeits-Flag: `feature_courts_public_enabled` muss AN sein, damit Gäste die Courts sehen (Admin → Features).
