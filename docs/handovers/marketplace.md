# 📄 Plan & Handover — PADEL2GO Marketplace (Equipment-Shop)

> Umfassender Plan für den Ausbau des Marketplace zu einem echten **Online-Shop für Padel-Equipment** mit eigenen Produktseiten, Katalog, Admin-Produktpflege und Checkout mit **Geld + P2G-Punkten**. Enthält: Vision, Datenmodell, Admin-Backend, Frontend-Seiten, Design-Handover für Claude Design und einen Phasenplan.
>
> **🔒 Scope-Entscheidungen (Florian, 2026-07-05):** (1) **Erstmal KEINE Varianten** — nur einfache Produkte (ein Preis, ein Bestand, ein Bild-Set). Varianten (Größe/Farbe/Gewicht) sind eine spätere Phase. (2) **Warenkorb später** — Phase 1 = Katalog + Produktseiten + Einzelkauf über den bestehenden Checkout. → Der Fokus des ersten Baus liegt auf **Kategorien/Marken + Bildergalerie + eigene Produktseiten + Admin-Katalogpflege**.

---

## 1. Vision — was der Marketplace erfüllen soll
Ein vollwertiger, markenfähiger **Padel-Equipment-Shop** unter der Sektion **„Marketplace"**:
- **Katalog** nach Kategorien (Schläger, Bälle, Textil/Bekleidung, Schuhe, Taschen, Zubehör) und Marken.
- **Eigene, verlinkbare Produktseiten** (`/marketplace/:slug`) mit Bildergalerie, Varianten (Größe/Farbe/Gewicht), technischen Specs, Preis in **€** und Punkte-Rabatt, Verfügbarkeit — wie bei einem echten Online-Shop.
- **Kauf mit Geld (Stripe: Karte + PayPal)** und optional **P2G-Punkte als Rabatt** (bis zum admin-definierten Max-Prozentsatz) — die Punkte, die man über Buchungen als Payback verdient, werden hier eingelöst.
- **Warenkorb** (mehrere Artikel pro Bestellung).
- **Admin pflegt den kompletten Katalog** selbst: Produkte, Varianten, mehrere Bilder, Kategorien, Marken, Bestand, Specs, Sichtbarkeit — plus Bestell-/Versandabwicklung.
- Gäste können kaufen (nur Geld); eingeloggte User zusätzlich mit Punkte-Rabatt.

## 2. Ist-Zustand (Basis, auf der wir aufbauen)
**Stark & behalten (Checkout-/Order-Kern):**
- Edge fn `marketplace-checkout`: Geld via Stripe (Karte + PayPal), Punkte-als-Rabatt (nur eingeloggt, `credits_payment_max_percent`), Gast + Login, 50c-Stripe-Minimum-Schutz.
- Atomare RPCs (`insert_marketplace_order`, `marketplace_decrement_stock`, `settle/release_marketplace_order`, `reserve_points`) + Cron-Backstop; Webhook-Branch `marketplace_purchase` mit Auto-Refund-Absicherung. **Punkte-Integrität ist gewährleistet.**
- Bestellungen liegen in `marketplace_redemptions` (Status/Fulfillment, Shipping-Adresse, `stripe_session_id`-Idempotenz).
- Feature-Flags: `feature_marketplace_state` (visible/demo/hidden), Punkte-Zahlung separat via `feature_credits_payment_enabled`.

**Lücken (das bauen wir):**
- **Keine Produkt-Detailseite**, kein `slug`. Kauf läuft heute nur über ein Modal auf `/marketplace`.
- `marketplace_items` ist flach: **nur ein Bild**, **keine Varianten**, `partner_name` als Freitext-„Marke", Kategorie ist ein fixes 4-Werte-CHECK-Enum (keine Kategorien-Tabelle), kein Rich-Content/Specs, kein UVP/MwSt.
- **Kein Warenkorb** (1 Bestellung = 1 Produkt), keine Filter/Suche/Kategorie-Nav im Shop-UI.
- Admin: einfacher Ein-Bild-Editor, keine Varianten/Kategorien-/Marken-Verwaltung; Versand nur Status-Umschaltung ohne Tracking.
- `types.ts` ist bei `marketplace_items.price_cents` veraltet → nach Schema-Änderungen `supabase gen types` neu ziehen.

## 3. Ziel-Datenmodell (Backend)
> Bestehende `marketplace_items` + `marketplace_redemptions` **bleiben**; wir erweitern und ergänzen normalisierte Tabellen. Alle neuen Tabellen mit RLS (public liest aktive, nur Admin schreibt).

**Neu — `marketplace_categories`** (Kategorien-Baum): `id, name, slug (unique), parent_id (nullable, Unterkategorien), image_url, sort_order, is_active`. Beispiel: Schläger, Bälle, Bekleidung, Schuhe, Taschen, Zubehör.

**Neu — `marketplace_brands`** (Marken): `id, name, slug (unique), logo_url, sort_order, is_active`. Ersetzt das Freitext-`partner_name`.

**Erweiterung — `marketplace_items` (Produkt-Kopf):** neue Spalten
`slug (unique)`, `category_id (FK)`, `brand_id (FK)`, `subtitle/short_desc`, `long_description (Rich/HTML)`, `specs (jsonb: {label,value}[] für Gewicht/Balance/Härte/Material…)`, `compare_at_price_cents (UVP/Streichpreis)`, `is_featured (bool)`, `status ('draft'|'published')`, `meta_title`, `meta_description`. (Bestehende `price_cents`, `credit_cost`, `stock_quantity` bleiben als Default/Fallback für variantenlose Produkte.)

**Neu — `marketplace_item_images`** (Galerie, 1:n): `id, item_id (FK), url, alt, sort_order`. Erstes Bild = Titelbild.

**Neu — `marketplace_item_variants`** (Varianten, 1:n): `id, item_id (FK), sku, option_name (z. B. „Größe"/„Farbe"/„Gewicht"), option_value (z. B. „L"/„Schwarz"/„365g"), price_cents (variantenspezifisch, Fallback Produkt-Preis), stock_quantity, is_active, sort_order`. Für Mehrfach-Optionen (Größe **und** Farbe) entweder Kombi-Varianten (eine Zeile pro Kombination) oder zwei Option-Achsen — **Empfehlung Phase-Start: eine Optionsachse pro Produkt** (deckt Schläger-Gewicht, Textil-Größe, Ball-Menge ab), Mehrachsen später.

**Warenkorb / Mehr-Positionen-Bestellung (Phase Cart):** neue `marketplace_order_items` (1:n an einen Order-Kopf) ODER `redemptions` um `order_group_id` erweitern. Checkout-Edge-Fn auf mehrere Positionen erweitern (Summe der Varianten-Preise, Stock je Variante dekrementieren, ein Stripe-Betrag). **Der bestehende atomare Order-Mechanismus wird dafür pro Position/als Gruppe wiederverwendet.**

**Versand (Phase Fulfillment):** `marketplace_redemptions` um `tracking_number, carrier, shipped_at` erweitern; Versandbestätigungs-Mail an Kunde beim Statuswechsel → „shipped".

## 4. Frontend — Seiten (alle unter `/marketplace`, Dark/Lime-Design)
1. **Katalog / Übersicht `/marketplace`** — Hero, **Kategorie-Navigation** (Chips/Kacheln), **Filter** (Kategorie, Marke, Preis-Range, „nur verfügbar"), **Suche**, **Sortierung**, Produkt-Grid. Produkt-Card: Titelbild, Marke, Name, Preis (€, ggf. Streichpreis), Punkte-Rabatt-Badge, „ab Lager/ausverkauft", Klick → Produktseite.
2. **🆕 Produkt-Detailseite `/marketplace/:slug`** (Herzstück, unique page pro Produkt) — Breadcrumb (Kategorie), **Bildergalerie** (großes Bild + Thumbnails), Marke + Titel, **Preis in € + „oder X Punkte Rabatt"** (+ UVP durchgestrichen), **Varianten-Auswahl** (Größe/Farbe/Gewicht als Chips), **Verfügbarkeit** je Variante, **Mengen-Selektor**, **„In den Warenkorb" / „Sofort kaufen"**, **Specs-Tabelle**, Langbeschreibung, Versand-/Lieferinfo, **verwandte Produkte**. SEO: eigener `meta_title/description`, OG-Bild = Titelbild.
3. **Warenkorb** (Drawer + `/marketplace/cart`) — Positionen (Bild, Name, Variante, Menge ±, Einzel-/Zeilenpreis, entfernen), Zwischensumme, „zur Kasse".
4. **Checkout `/marketplace/checkout`** — Lieferadresse, **Zahlungsart (Karte/PayPal)**, **Punkte-Rabatt-Slider** (eingeloggt, bis Max-%), Bestellübersicht (Positionen, Rabatt, zu zahlen), „Kostenpflichtig bestellen" → Stripe.
5. **Bestellbestätigung `/marketplace/success`** — **echte Bestellzusammenfassung** (Artikel, Menge, Preis, eingelöste Punkte, Lieferadresse, Referenzcode) statt nur der Stripe-Session-ID.
6. **„Meine Bestellungen"** (im Konto/Dashboard) — Bestellhistorie mit Status/Tracking.

## 5. Admin — volles Produkt-Backend (`/admin/marketplace`)
- **Produkt anlegen/bearbeiten:** Name, Slug (auto aus Name), Kategorie (Dropdown aus DB), Marke (Dropdown aus DB), Kurz- & Langbeschreibung, **Bildergalerie (mehrere Uploads, sortierbar)**, **Varianten-Editor** (Zeilen: Option-Wert, SKU, Preis, Bestand), Preis €, UVP, Punkte-Preis/Rabatt-Fähigkeit, **Specs-Editor** (Label/Wert-Paare), Versandgewicht/-info, `is_featured`, **Status Entwurf/Veröffentlicht**, SEO-Felder. Aktionen: duplizieren, löschen.
- **Kategorien-Verwaltung:** CRUD (Name, Slug, Parent, Bild, Sortierung).
- **Marken-Verwaltung:** CRUD (Name, Slug, Logo).
- **Bestell-/Versandverwaltung** (aktuell unter P2G → Einlösungen; ideal auch hier): Kundenname/-Mail anzeigen, Status setzen, **Tracking-Nr. + Carrier erfassen**, Versandbestätigung an Kunde, Retoure/Storno mit Rückerstattung.
- Bild-Upload: bestehender Storage-Bucket `media`, Ordner `marketplace/` (Galerie-fähig machen).

## 6. P2G-Punkte-Integration (bleibt wie etabliert)
- Punkte (aus Buchungs-Payback) sind im Checkout **als Rabatt** einlösbar (eingeloggt), begrenzt durch `credits_payment_max_percent`, Rest per Karte/PayPal. Atomarer Abzug + Rückerstattung bei Storno/Abbruch sind bereits implementiert.
- Punkte-Zahlung global schaltbar via `feature_credits_payment_enabled` (Admin → Features / P2G).

## 7. Design-Handover für Claude Design — LANGFASSUNG (Dark/Lime)

**Design-System (für alle Screens gleich):** Hintergrund reines Schwarz `#000`, Text `#FAFAFA`, Markenfarbe Lime `#C7F011` (Buttons, Preise, aktive Auswahl, Badges, Glow). Überschriften *Bricolage Grotesque* (bold), Text *DM Sans*, **alle Preise/Zahlen/SKU in *JetBrains Mono*** (`.font-stat`). Karten `rounded-2xl`, dunkler Gradient (`.bg-gradient-card`), 1px-Border, Hover → Lime-Border + Glow. Einheitlicher Content-Wrapper `max-w-[1200px]` + 20px Seitenpadding. Sanfte fade+rise-Animationen. Mobile-first ab 320px. Es gilt die geteilte `Navigation` oben und der `Footer` unten (nicht neu bauen).

### Screen ① — Marketplace-Übersicht (`/marketplace`)
Von oben nach unten:
- **Hero (kompakt):** Badge „Marketplace" (lime, `shopping-bag`-Icon), H1 „**P2G Marketplace**" bzw. „Dein Padel-**Shop**" (zweiter Teil Lime-Gradient), kurzer Untertitel („Equipment, das dein Spiel besser macht — mit Geld oder P2G Points"). Rechts optional der Punktestand-Chip (eingeloggt).
- **Kategorie-Navigation:** horizontale Kachel-/Chip-Reihe (Schläger, Bälle, Bekleidung, Schuhe, Taschen, Zubehör) mit Icon/Bild; aktive Kategorie lime hervorgehoben. Auf Mobile scrollbar.
- **Filter- & Sortierzeile:** Suchfeld (`search`, mit Clear-x), Filter-Chips/Dropdowns (Marke, Preis-Range, „nur verfügbar"), Sortierung (Beliebt / Preis ↑ / Preis ↓ / Neu), rechts Ergebniszahl (mono). Auf Desktop optional als linke Filter-Sidebar.
- **Produkt-Grid** (`grid`, 2 Spalten mobil → 3–4 Desktop). **Produkt-Card:**
  - Bild (Titelbild, `aspect-square` oder 4/5, `object-cover`, Hover-Zoom), oben-links optional Marken-Logo/Chip, oben-rechts optional Sale-/„Neu"-Badge.
  - Marke (klein, mono/muted), Produktname (h3, 1–2 Zeilen).
  - Preis: **€-Preis groß (lime, mono)**, ggf. **UVP durchgestrichen** daneben; darunter Punkte-Rabatt-Hinweis-Badge („bis zu X Punkte einlösbar").
  - Verfügbarkeit („Auf Lager" / „Ausverkauft" — ausverkauft ausgegraut).
  - Ganze Card klickbar → Produktseite; dezenter „Ansehen →"-Hinweis.
- **Zustände:** Loading = Shimmer-Skeleton-Cards; Empty (keine Treffer) = Icon + „Keine Produkte gefunden" + „Filter zurücksetzen"; Kategorie-leer analog.
- Optional unten: Marken-Logo-Leiste („Unsere Marken") + Trust-Zeile (sichere Zahlung, Versand).

### Screen ② — Produkt-Detailseite (`/marketplace/:slug`) — Herzstück
- **Breadcrumb:** Marketplace › Kategorie › Produktname.
- **2-Spalten-Layout** (Desktop `~1.1fr / 1fr`, mobil gestapelt):
  - **Links — Bildergalerie:** großes Hauptbild (`rounded-2xl`, Zoom/Lightbox optional), darunter Thumbnail-Leiste (aktives Thumbnail lime umrandet). Bei einem Bild nur das Hauptbild.
  - **Rechts — Kaufbox (sticky):** Marke (mit Logo), H1 Produktname, ggf. Kurz-Untertitel. **Preisblock:** großer €-Preis (lime mono) + optional UVP durchgestrichen + Ersparnis-Badge; darunter **„oder bis zu X Punkte einlösen"** (Punkte-Rabatt-Hinweis, `coins`). **Verfügbarkeit** (auf Lager / wenige übrig / ausverkauft). **Mengen-Selektor** (− / Zahl / +). **Primär-Button „In den Warenkorb"** bzw. (Phase 1) **„Jetzt kaufen"** (hero/xl). Sekundär: Merken/Teilen optional. Kurze Icon-Zeile: sichere Zahlung (`shield-check`), Versand (`truck`), Rückgabe.
  - _(Varianten-Auswahl-Chips [Größe/Farbe/Gewicht] werden erst in einer späteren Phase ergänzt — im Design als optionaler Platzhalter denkbar, aber nicht Pflicht.)_
- **Darunter (volle Breite):**
  - **Beschreibung** (Rich-Text/Langtext).
  - **Spezifikationen-Tabelle** (Label/Wert-Paare, z. B. Gewicht, Balance, Härte, Material, Form) — im Card-Stil.
  - **Versand & Rückgabe** Info-Block.
  - **Verwandte / ähnliche Produkte** (Produkt-Card-Grid, gleiche Kategorie).
- **Zustände:** Loading-Skeleton; „Produkt nicht gefunden" (calendar-x-artig + „Zurück zum Shop").
- **SEO:** eigener Titel/Description, Titelbild als OG-Bild.

### Screen ③ — Checkout (bestehender Flow, nur Optik) & Bestätigung
- **Checkout** (Einzelkauf, Phase 1): Produkt-Zusammenfassung (Bild/Name/Menge/Preis), **Lieferadresse** (bei physischen Produkten), **Zahlungsart** (Karte / PayPal), **Punkte-Rabatt-Slider** (eingeloggt, bis Max-%), Preisblock (Preis − Punkte-Rabatt = zu zahlen), „Kostenpflichtig bestellen" → Stripe. Sicher-Zahlung-Hinweis.
- **Bestellbestätigung (`/marketplace/success`):** grüner Erfolg-Check, „Bestellung bestätigt!", **Bestellzusammenfassung** (Artikel, Menge, gezahlt €, eingelöste Punkte, Lieferadresse, Referenzcode `P2G-…`), Buttons „Weiter shoppen" + „Meine Bestellungen".

### (Später) Screen ④ — Warenkorb
Drawer (von rechts) + eigene Seite: Positionen (Bild, Name, Menge ±, Zeilenpreis, entfernen), Zwischensumme, „zur Kasse". _Nicht Teil von Phase 1._

---

## 7b. Kurz-Referenz für den Design-Auftrag (zum Weitergeben)
> „Gestalte einen Padel-Equipment-Online-Shop im PADEL2GO-Dark/Lime-Design: (1) eine **Marketplace-Übersicht** mit Hero, Kategorie-Navigation, Filter/Suche/Sortierung und Produkt-Grid (Cards mit Bild, Marke, Name, €-Preis + Punkte-Rabatt-Badge, Verfügbarkeit); (2) eine **Produkt-Detailseite** mit Bildergalerie links und stickyy Kaufbox rechts (Marke, Titel, €-Preis + „oder X Punkte", Menge, „Jetzt kaufen"), darunter Spezifikations-Tabelle, Beschreibung, Versandinfo und verwandte Produkte; (3) **Checkout** + **Bestellbestätigung**. Schwarz/Lime `#C7F011`, Bricolage Grotesque + DM Sans, Preise in JetBrains Mono, `rounded-2xl`-Karten mit Hover-Lime, `max-w-[1200px]`, mobil ab 320px. Keine Varianten und kein Warenkorb in dieser Version."

## 8. Phasenplan (empfohlene Reihenfolge)
- **Phase 1 — Katalog + Produktseiten (Kern des Wunsches):** Schema (categories, brands, images, `slug`, specs, status) + `supabase gen types`; Admin-CRUD für Produkte (Galerie, Kategorie/Marke-Dropdowns, Specs, Slug, Entwurf/Live) + Kategorien-/Marken-Verwaltung; Frontend Katalog mit Kategorie-Nav/Filter/Suche + **Produkt-Detailseite `/marketplace/:slug`** (Galerie, Preis €/Punkte, Specs). Kauf zunächst über den **bestehenden Einzelkauf-Checkout** (Geld + Punkte-Rabatt).
- **Phase 2 — Varianten:** `marketplace_item_variants` + Varianten-Editor im Admin + Varianten-Auswahl/Bestand/Preis auf der Produktseite; Checkout auf Varianten-Preis/-Bestand umstellen.
- **Phase 3 — Warenkorb:** `order_items`/Order-Gruppe + Cart-UI + Multi-Position-Checkout (ein Stripe-Betrag, Punkte-Rabatt auf Summe).
- **Phase 4 — Bestellabwicklung:** Tracking-Nr./Carrier, Versandbestätigungs-Mail, „Meine Bestellungen", Retouren/Storno mit Rückerstattung.

## 9. Wichtig / Rahmen
- **Punkte-Integrität hat Priorität:** alle Wallet-/Stock-Mutationen laufen weiter über die bestehenden atomaren service-role-RPCs; neue Kaufpfade daran anschließen (nie Client-Preise vertrauen).
- Bestehendes Checkout-/Webhook-/Refund-System **wiederverwenden**, nicht neu bauen.
- Nach jeder Schema-Migration `supabase gen types` neu ziehen (aktuell veraltet bei `price_cents`).
- Mobile-first ab 320px; Design im etablierten Dark/Lime-System.
