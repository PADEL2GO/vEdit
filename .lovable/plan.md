
Ziel: Ich erstelle eine zentrale Markdown-Kontextdatei, die die Inhalte aller öffentlich sichtbaren Marketing-Seiten für nicht eingeloggte Nutzer zusammenfasst – als lesbare Inhaltsübersicht pro Seite, nicht als Code-Dump.

1. Lieferobjekt
- Neue Datei: `docs/public-frontend-content-context.md`
- Sprache: Deutsch
- Format: zusammenfassende Content-Map pro Route

2. Scope
Ich erfasse nur die Seiten, die du bestätigt hast:
- `/` Home
- `/fuer-spieler`
- `/app-booking`
- `/rewards`
- `/league`
- `/events`
- `/fuer-vereine`
- `/fuer-partner`
- `/ueber-uns`
- `/faq-kontakt`
- `/impressum`

3. Was in der Datei stehen wird
Für jede Seite:
- Route + Seitentitel
- Kurzbeschreibung: Was die Seite kommuniziert
- Abschnitt für Abschnitt: Was dort gesagt wird
- Primäre CTAs / Buttons / Handlungsaufforderungen
- Wichtige Trust-/Benefit-Aussagen
- Hinweis auf dynamische Inhalte, wenn Texte oder Logos aus dem Admin-/Backend kommen

4. Wichtige Abgrenzung
- Ich dokumentiere nur das, was ausgeloggte Nutzer wirklich sehen.
- Bei PIN-geschützten Seiten:
  - `/fuer-vereine`: nur öffentlich sichtbarer Bereich + Hinweis auf gesperrten Rest
  - `/fuer-partner`: nur öffentlich sichtbarer Bereich + Hinweis auf gesperrten Rest
- Keine Dashboard-/Account-/Login-internen Inhalte

5. Quellen im Code
Ich ziehe die Inhalte aus:
- den Marketing-Seiten unter `src/pages/*`
- geteilten öffentlichen Komponenten wie:
  - `src/components/Navigation.tsx`
  - `src/components/Footer.tsx`
  - `src/components/LocationTeasersSection.tsx`
  - eventbezogenen Public-Komponenten, falls dort sichtbarer Text liegt
- dynamischen öffentlichen Datenquellen nur als Strukturhinweis, wenn Inhalte nicht fest im Code stehen

6. Aufbau der Kontextdatei
Geplanter Aufbau:
- Projektweite öffentliche Navigation
- Gemeinsame Footer-Aussagen / Links
- Seite 1: Home
- Seite 2: Für Spieler
- Seite 3: App & Booking
- Seite 4: P2G Points
- Seite 5: League
- Seite 6: Events
- Seite 7: Für Vereine
- Seite 8: Für Partner
- Seite 9: Über uns
- Seite 10: FAQ & Kontakt
- Seite 11: Impressum
- Abschlussteil: Inhalte, die dynamisch aus dem Adminbereich kommen

7. Besondere Behandlung dynamischer Bereiche
Ich markiere sauber:
- Partner-Sektionen auf Home / Für Vereine / Für Partner: Inhalte kommen teils aus den Partner-Kacheln im Adminbereich
- Events: Event-Liste ist dynamisch, aber die Seitenaussagen und statischen Benefit-Texte werden fest dokumentiert
- Expert Levels / Rewards: Seitenaussagen fest, konkrete Level-Inhalte ggf. als dynamisch gekennzeichnet

8. Technische Details
Betroffene Datei:
- `docs/public-frontend-content-context.md`

Gelesene Hauptquellen:
- `src/pages/Index.tsx`
- `src/pages/FuerSpieler.tsx`
- `src/pages/AppBooking.tsx`
- `src/pages/Rewards.tsx`
- `src/pages/League.tsx`
- `src/pages/Events.tsx`
- `src/pages/FuerVereine.tsx`
- `src/pages/FuerPartner.tsx`
- `src/pages/UeberUns.tsx`
- `src/pages/FaqKontakt.tsx`
- `src/pages/Impressum.tsx`
- `src/components/Navigation.tsx`

9. Ergebnis
Nach Umsetzung hast du eine einzige, saubere Referenzdatei, die genau beschreibt, was die öffentliche Website aktuell sagt – routeweise, verständlich und nutzbar für Copy, Strategie, Briefings oder spätere Überarbeitungen.
