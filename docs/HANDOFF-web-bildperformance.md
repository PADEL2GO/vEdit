# Web-Handoff: Bild-Performance (Uploads verkleinern + Derivate ausliefern)

Von der App-Seite, 2026-08-12. Alle Zahlen unten sind gegen die Live-DB `wvvdkuextsbsecqbfksb`
und den echten `media`-Bucket gemessen, nicht geschätzt.

## Worum es geht

Die Bilder im gemeinsamen `media`-Bucket sind zu großen Teilen unkomprimierte PNGs. Gemessen an
den 14 veröffentlichten News-Covern:

| | |
|---|---|
| 9 von 14 Covern | **11–28 MB** (PNG) |
| die übrigen 5 | ~180 KB (JPEG) |
| **ganzer Feed** | **191,4 MB** |
| größtes Einzelbild | 27,96 MB |

Dazu liefert der rohe Storage-Endpunkt `cache-control: no-cache` — jedes Bild wird bei jedem
Seitenaufruf neu geladen.

Die Website rendert diese Originale direkt (`grep -rn "render/image" src/` findet nichts), sie ist
also genauso betroffen wie die App: Bilder erscheinen spät oder laufen in einen Timeout und fehlen
dann ganz.

**Ursache:** `uploadArticleImage()` in `src/hooks/useAdminArticles.ts:69-77` lädt die Datei
unverändert hoch — kein Verkleinern, kein `cacheControl`. Dasselbe gilt für fünf weitere
Upload-Stellen. Die KI-generierten Cover kommen als große PNGs herein und landen so im Bucket.

Die App wurde bereits angepasst (siehe „Was die App schon macht" unten) und kommt damit von
191,4 MB auf 81,1 MB. Die verbleibenden 79,6 MB sind **drei Dateien über dem Limit der
Bild-Transformation** — die lassen sich nur an der Quelle lösen, also hier.

---

## Teil 1 — Uploads verkleinern und cachebar machen

### 1a. `src/lib/resizeImage.ts` verallgemeinern

Die Datei hat schon `resizeAvatarToSquare(file, outputSize, quality)` plus die privaten Helfer
`readFileAsDataURL()` und `loadImage()`. Ergänze eine zweite Exportfunktion, die **das
Seitenverhältnis erhält** und nur die lange Kante deckelt — Cover, Produktbilder und Teaser sind
nicht quadratisch:

```ts
/**
 * Downscale an image File to a max edge length and re-encode as JPEG.
 *
 * Why: the media bucket filled up with 11–28 MB PNGs from AI-generated covers. A 2000px JPEG
 * at quality 0.82 is under 400 KB and indistinguishable at every size we actually render.
 * Images at or below `maxEdge` are still re-encoded — a small PNG is usually still a large
 * JPEG-equivalent, and PNG is the wrong format for photographic content.
 */
export async function resizeImageForUpload(
  file: File,
  maxEdge = 2000,
  quality = 0.82,
): Promise<Blob>
```

Umsetzung analog zu `resizeAvatarToSquare`, nur:
- Skalierungsfaktor `Math.min(1, maxEdge / Math.max(img.width, img.height))`,
- Canvas auf `Math.round(img.width * f)` × `Math.round(img.height * f)`,
- `ctx.drawImage(img, 0, 0, canvas.width, canvas.height)` (kein Center-Crop),
- Ausgabe `"image/jpeg"`.

**Wichtig:** SVGs und GIFs nicht durch den Canvas schicken — ein animiertes GIF verliert dabei die
Animation, ein SVG seine Skalierbarkeit. Diese beiden unverändert durchreichen (Marken-Logos im
Marketplace sind teilweise SVG).

### 1b. Die sechs Upload-Stellen umstellen

Jede lädt heute die rohe `File` hoch. Überall gilt dasselbe Muster: erst `resizeImageForUpload()`,
dann hochladen mit `contentType: "image/jpeg"` und `cacheControl: "2592000"` (30 Tage), und die
Dateiendung im Pfad auf `.jpg` setzen — sonst heißt eine JPEG-Datei weiter `.png`.

| Datei | Zeile | was |
|---|---|---|
| `src/hooks/useAdminArticles.ts` | 73 | News-Cover — **das ist der Hauptverursacher** |
| `src/pages/admin/AdminMarketplace.tsx` | 478 | Produktbilder |
| `src/components/admin/marketplace/CatalogManagerDialog.tsx` | 97 | Katalog-Bilder |
| `src/pages/admin/AdminLocationTeasers.tsx` | 185 | Standort-Teaser |
| `src/pages/admin/AdminNewsletter.tsx` | 214 | Newsletter-Bilder |
| `src/components/admin/courts/LocationForm.tsx` | 139 | Standort-Bilder inkl. `tennis_image_url` |

Am Beispiel `useAdminArticles.ts`:

```ts
export async function uploadArticleImage(file: File): Promise<string> {
  // Ohne Verkleinern landen die KI-Cover als 11–28 MB PNG im Bucket und blockieren
  // Website wie App. Ohne cacheControl liefert Storage `no-cache` aus.
  const processed = await resizeImageForUpload(file);
  const path = `news/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("media").upload(path, processed, {
    contentType: "image/jpeg",
    cacheControl: "2592000",
  });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
```

`src/pages/Account.tsx:139` (Avatare) macht das bereits richtig — nur `cacheControl: "3600"`
dort ruhig auf `"2592000"` anheben, der Dateiname ist stabil und wird ohnehin per `?v=` gebustet.

---

## Teil 2 — Anzeige über den Render-Endpunkt

Die Bild-Transformation ist auf diesem Supabase-Projekt **aktiv**. Sie löst zwei Probleme auf
einmal: das Bild kommt skaliert *und* der Endpunkt schickt `cache-control: max-age=…` statt
`no-cache`.

Verifiziert am 11-MB-Cover `9ed4adef-…png`:

| Aufruf | Ergebnis |
|---|---|
| Original | 11,07 MB, `no-cache` |
| `?width=1200&quality=75` | 7,3 MB (PNG — ohne `format` greift Content-Negotiation, curl bekommt PNG) |
| `?width=1200&quality=75&format=webp` | **1,03 MB**, `max-age` |
| `?width=800&quality=70&format=webp` | **666 KB** |

`format` akzeptiert **nur** `origin` und `webp` — `jpeg` oder sonstige Werte geben HTTP 400.

### 2a. Neuer Helper `src/lib/imageUrl.ts`

Bewusst identisch zur App (`lib/imageUrl.ts` im App-Repo), damit beide Seiten dieselben URLs
erzeugen und sich denselben CDN-Cache teilen:

```ts
const OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

/**
 * Rewrites a public Supabase storage URL to its scaled WebP derivative.
 * Everything else (foreign hosts, data: URIs, already-transformed URLs, null) passes through
 * unchanged — this helper must never be the reason an image fails to load.
 */
export function storageImage(
  url: string | null | undefined,
  opts: { width: number; quality?: number },
): string | null {
  if (!url) return null;
  if (!url.includes(OBJECT_PATH)) return url;
  const width = Math.max(1, Math.round(opts.width));
  const quality = opts.quality ?? 70;
  return `${url.replace(OBJECT_PATH, RENDER_PATH)}?width=${width}&quality=${quality}&format=webp`;
}
```

### 2b. Einsetzen, wo Bilder gerendert werden

Nicht blind über alle ~27 `<img>` im Admin drüberbügeln — dort ist Bildtreue teils gewollt.
Priorität sind die öffentlichen Flächen; Zielbreite jeweils ≈ Anzeigebreite × 2 (Retina):

- `src/components/news/NewsCard.tsx:59` — Cover, ~800
- `src/pages/NewsArticle.tsx` — Artikel-Hero, ~1200
- `src/components/booking/LocationCard.tsx` — Standortkarte, ~800
- `src/components/booking/BookingLocationHeader.tsx` — Hero inkl. `tennis_image_url`, ~1200
- `src/components/SiteVisual.tsx` — zentral, deckt alle `site_visuals`-Slots auf einen Schlag ab
- `src/components/events/EventCard.tsx`, `FeaturedEvent.tsx`, `LocationTeasersSection.tsx`

Zwei Dinge dabei beachten:

1. **Fallback bei Fehler.** Der Transformer lehnt Quellen über ~25 MB ab
   (`"source image file is too large to process"`, HTTP 400). Ohne Fallback bleibt genau dort ein
   Loch. Die App löst das mit einem `onError`, das einmal auf das unveränderte Original
   zurückfällt — dasselbe hier, am besten in einer kleinen gemeinsamen `<StorageImage>`-Komponente
   statt an jeder `<img>`-Stelle einzeln.

2. **`og:image` in `src/pages/NewsArticle.tsx:137`** zeigt aktuell auf das Original. Facebook & Co.
   brechen bei mehreren MB ab, die Vorschau fehlt dann still. Hier `width=1200&quality=75`
   setzen. `format=webp` ist bei den großen Plattformen inzwischen unproblematisch — wenn du auf
   Nummer sicher gehen willst, lass `format` bei `og:image` weg: sobald Teil 1 läuft, sind neue
   Cover JPEG und `origin` liefert dann automatisch etwas Kleines.

---

## Teil 3 — Drei Altlasten (nicht per Code lösbar)

Diese drei liegen über dem Transformer-Limit und fallen auf beiden Seiten auf das Original zurück.
Sie machen allein 79,6 der verbleibenden 81,1 MB aus:

```
media/news/a170336b-20f1-48a0-b0ac-6bb2512373ff.png   27,96 MB
media/news/3d602e46-390f-4b70-9796-2450eaa36058.png   27,45 MB
media/news/1786052523438.png                          24,19 MB
```

Nach Teil 1 reicht es, die drei Artikel im Admin einmal zu öffnen und das Cover neu hochzuladen —
dann laufen sie durch den neuen Resize-Pfad. Alternativ ein einmaliges Skript mit dem
Service-Role-Key, das sie herunterskaliert und mit `upsert` ersetzt.

---

## Was die App schon macht

Damit beide Seiten konsistent bleiben (App-Repo, Commit `3322d97`):

- `lib/imageUrl.ts` mit `storageImage()` / `originalImage()` — die Vorlage für Teil 2a.
- Die `Photo`-Komponente lädt das Derivat und fällt per `onError` einmal aufs Original zurück.
  Vorher gab es dort gar kein `onError` — eine fehlgeschlagene Karte blieb bis zum Remount still
  leer. Das war vermutlich der Grund für „manchmal fehlen Bilder ganz".
- `renderWidth`-Prop, damit ein 46px-Thumbnail kein 800px-Bild zieht.
- `uploadMediaImage()` setzt `cacheControl: "2592000"`.

Ein Hinweis, falls du in der App nachschaust: `expo-image-picker` wendet seine `quality`-Option
**nur auf JPEG** an, bei PNG wird sie ignoriert. Genau deshalb sind alle JPEGs im Bucket ~180 KB
und alle PNGs zweistellig MB. Die Canvas-Lösung in `resizeImage.ts` hat dieses Problem nicht,
weil sie ohnehin nach JPEG re-encodiert.

---

## Verifikation

```bash
# Ein neu hochgeladenes Cover sollte < 400 KB sein und einen langen Cache haben:
curl -sI "<neue public URL>" | grep -iE "content-length|cache-control"

# Das Derivat, das die Website künftig anfragt:
curl -s "<url mit /render/image/public/ + ?width=800&quality=70&format=webp>" \
  -o /dev/null -w "%{http_code} %{size_download}\n"
```

Erwartung nach Teil 1 + 2: der News-Feed liegt statt bei 191 MB bei **deutlich unter 5 MB**, und
ab dem zweiten Aufruf kommt fast alles aus dem Cache.
