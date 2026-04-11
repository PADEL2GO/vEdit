import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";

const Datenschutz = () => {
  return (
    <>
      <Helmet>
        <title>Datenschutz | Padel2Go</title>
        <meta name="description" content="Datenschutzerklärung der PADEL2GO UG – Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO." />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">

          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">Datenschutzerklärung</h1>
            <p className="text-muted-foreground">Gemäß DSGVO (EU) 2016/679 · Stand: April 2026</p>
          </div>

          <div className="space-y-10">

            {/* 1. Verantwortlicher */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">1. Verantwortlicher</h2>
              <div className="space-y-1 text-foreground text-sm leading-relaxed">
                <p className="font-medium">PADEL2GO UG (haftungsbeschränkt)</p>
                <p>Am Neudeck 10</p>
                <p>81541 München</p>
                <p>Deutschland</p>
                <p className="mt-3">
                  E-Mail:{" "}
                  <a href="mailto:contact@padel2go.eu" className="text-primary underline hover:no-underline">
                    contact@padel2go.eu
                  </a>
                </p>
                <p>Telefon: +49 176 32350759</p>
              </div>
            </section>

            {/* 2. Überblick */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">2. Überblick der Datenverarbeitung</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Wir erheben und verarbeiten personenbezogene Daten nur soweit dies für die Bereitstellung unserer Dienste erforderlich ist oder Sie uns ausdrücklich Ihre Einwilligung erteilt haben. Nachfolgend informieren wir Sie transparent über Art, Umfang und Zweck der Datenverarbeitung.
                </p>
                <p>
                  <span className="font-medium">Arten verarbeiteter Daten:</span> Bestandsdaten (Name, E-Mail), Nutzungsdaten (gebuchte Courts, Zeiten), Zahlungsdaten (werden ausschließlich durch Stripe verarbeitet), Kommunikationsdaten.
                </p>
                <p>
                  <span className="font-medium">Betroffene Personen:</span> Registrierte Nutzerinnen und Nutzer der Plattform padel2go.de.
                </p>
              </div>
            </section>

            {/* 3. Hosting & Infrastruktur */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">3. Hosting & Infrastruktur (Supabase)</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Unsere Plattform wird auf Basis von <span className="font-medium">Supabase</span> (Supabase Inc., San Francisco, USA) betrieben. Supabase stellt Datenbankdienste, Authentifizierung und serverseitige Funktionen bereit. Die Datenspeicherung erfolgt auf Servern innerhalb der Europäischen Union (Frankfurt, AWS EU-Central-1).
                </p>
                <p>
                  Folgende Daten werden bei Supabase gespeichert:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Nutzerprofil (E-Mail, Anzeigename, Benutzername, Profilbild)</li>
                  <li>Buchungsdaten (Court, Datum, Uhrzeit, Zahlungsstatus)</li>
                  <li>Rewards und Punkte-Aktivitäten</li>
                  <li>Kommunikationspräferenzen und Einstellungen</li>
                </ul>
                <p>
                  <span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb der Plattform).
                </p>
                <p>
                  Datenschutzerklärung Supabase:{" "}
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                    supabase.com/privacy
                  </a>
                </p>
              </div>
            </section>

            {/* 4. Zahlungsabwicklung */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">4. Zahlungsabwicklung (Stripe)</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Alle Zahlungen werden über <span className="font-medium">Stripe</span> (Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Dublin, Irland) abgewickelt. Kartendaten und Zahlungsinformationen werden ausschließlich durch Stripe verarbeitet und gelangen zu keinem Zeitpunkt auf unsere Server.
                </p>
                <p>
                  Stripe speichert zur Vertragsabwicklung Transaktionsdaten, die Ihrer Zahlung zugeordnet sind. Stripe kann im Rahmen seiner eigenen Datenschutzrichtlinie weitere Daten verarbeiten.
                </p>
                <p>
                  <span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. b DSGVO (Zahlungsabwicklung als Teil des Buchungsvertrags).
                </p>
                <p>
                  Datenschutzerklärung Stripe:{" "}
                  <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                    stripe.com/de/privacy
                  </a>
                </p>
              </div>
            </section>

            {/* 5. E-Mail-Kommunikation */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">5. E-Mail-Kommunikation (Resend)</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Für den Versand transaktionaler E-Mails (Buchungsbestätigungen, Erinnerungen, Einladungen) nutzen wir den Dienst <span className="font-medium">Resend</span> (Resend Inc., San Francisco, USA). Resend verarbeitet dabei Ihre E-Mail-Adresse sowie den Inhalt der jeweiligen E-Mail.
                </p>
                <p>
                  <span className="font-medium">Zweck:</span> Übermittlung buchungsrelevanter Informationen, die für die Vertragserfüllung erforderlich sind.
                </p>
                <p>
                  <span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. b DSGVO.
                </p>
                <p>
                  Datenschutzerklärung Resend:{" "}
                  <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                    resend.com/legal/privacy-policy
                  </a>
                </p>
              </div>
            </section>

            {/* 6. Cookies */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">6. Cookies & lokale Speicherung</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Wir verwenden ausschließlich technisch notwendige Cookies und lokale Speichermechanismen (localStorage). Diese sind für den Betrieb der Plattform erforderlich und können nicht deaktiviert werden, ohne die Funktionalität der Website erheblich einzuschränken.
                </p>
                <p>
                  <span className="font-medium">Session-Cookie (Supabase Auth):</span> Speichert Ihre Anmeldung, damit Sie angemeldet bleiben. Wird beim Ausloggen gelöscht.
                </p>
                <p>
                  Wir setzen <span className="font-medium">keine</span> Tracking- oder Analyse-Cookies ein und übermitteln keine Daten an Werbenetzwerke.
                </p>
                <p>
                  <span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb der Plattform).
                </p>
              </div>
            </section>

            {/* 7. Speicherdauer */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">7. Speicherdauer</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Personenbezogene Daten werden gelöscht, sobald sie für den Zweck ihrer Erhebung nicht mehr erforderlich sind. Buchungsdaten werden aus steuerrechtlichen Gründen für die gesetzlich vorgeschriebene Dauer (in Deutschland: 10 Jahre) aufbewahrt.
                </p>
                <p>
                  Nutzerdaten (Profil, Rewards-History) werden nach Kontolöschung innerhalb von 30 Tagen gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
                </p>
              </div>
            </section>

            {/* 8. Ihre Rechte */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">8. Ihre Rechte als betroffene Person</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>Sie haben gegenüber PADEL2GO folgende Rechte bezüglich Ihrer personenbezogenen Daten:</p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li><span className="text-foreground font-medium">Auskunft</span> (Art. 15 DSGVO) – Welche Daten wir über Sie gespeichert haben</li>
                  <li><span className="text-foreground font-medium">Berichtigung</span> (Art. 16 DSGVO) – Korrektur unrichtiger Daten</li>
                  <li><span className="text-foreground font-medium">Löschung</span> (Art. 17 DSGVO) – Löschung Ihrer Daten, soweit keine gesetzlichen Aufbewahrungspflichten bestehen</li>
                  <li><span className="text-foreground font-medium">Einschränkung der Verarbeitung</span> (Art. 18 DSGVO)</li>
                  <li><span className="text-foreground font-medium">Datenübertragbarkeit</span> (Art. 20 DSGVO) – Erhalt Ihrer Daten in einem maschinenlesbaren Format</li>
                  <li><span className="text-foreground font-medium">Widerspruch</span> (Art. 21 DSGVO) – Widerspruch gegen Verarbeitungen auf Basis berechtigter Interessen</li>
                  <li><span className="text-foreground font-medium">Beschwerde</span> – Bei der zuständigen Aufsichtsbehörde (Bayerisches Landesamt für Datenschutzaufsicht, Promenade 18, 91522 Ansbach)</li>
                </ul>
                <p>
                  Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{" "}
                  <a href="mailto:contact@padel2go.eu" className="text-primary underline hover:no-underline">
                    contact@padel2go.eu
                  </a>
                </p>
              </div>
            </section>

            {/* 9. Datensicherheit */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">9. Datensicherheit</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Wir treffen technische und organisatorische Maßnahmen, um Ihre Daten vor unbefugtem Zugriff, Verlust oder Manipulation zu schützen. Dazu gehören:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Verschlüsselte Datenübertragung (TLS/HTTPS)</li>
                  <li>Row-Level Security (RLS) auf Datenbankebene – Nutzer können nur auf ihre eigenen Daten zugreifen</li>
                  <li>Keine Speicherung von Zahlungsdaten auf eigenen Servern</li>
                  <li>Regelmäßige Sicherheitsprüfungen der Infrastruktur</li>
                </ul>
              </div>
            </section>

            {/* 10. Änderungen */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">10. Änderungen dieser Datenschutzerklärung</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte Rechtslagen oder Änderungen unserer Dienste anzupassen. Die jeweils aktuelle Version ist auf dieser Seite abrufbar. Bei wesentlichen Änderungen informieren wir registrierte Nutzer per E-Mail.
                </p>
              </div>
            </section>

          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">Stand: April 2026 · PADEL2GO UG (haftungsbeschränkt), Am Neudeck 10, 81541 München</p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Datenschutz;
