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
2. *(wird bei den nächsten Admin-Seiten ergänzt)*

## Erledigt

- 2026-08-04: `AdminHeader` redesignt (sticky, Route-Pfad, dynamischer Titel, User-Chip) — gilt für alle Admin-Seiten.
- 2026-08-04: `/admin/settings` auf neues Design umgestellt (styling only, PIN-Locks unverändert funktional).
