import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";

const AGB = () => {
  return (
    <>
      <Helmet>
        <title>AGB | Padel2Go</title>
        <meta name="description" content="Allgemeine Geschäftsbedingungen der PADEL2GO UG – Nutzungsbedingungen für die Buchung von Padel-Courts über padel2go.de." />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">

          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">Allgemeine Geschäftsbedingungen</h1>
            <p className="text-muted-foreground">Stand: April 2026</p>
          </div>

          <div className="space-y-10">

            {/* § 1 Geltungsbereich */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">§ 1 Geltungsbereich</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB") gelten für alle Verträge, die zwischen der PADEL2GO UG (haftungsbeschränkt), Am Neudeck 10, 81541 München (nachfolgend „PADEL2GO" oder „wir") und Nutzerinnen und Nutzern (nachfolgend „Nutzer") über die Plattform <span className="font-medium">padel2go.de</span> geschlossen werden.
                </p>
                <p>
                  Gegenstand dieser AGB ist insbesondere die Vermittlung und Buchung von Padel-Courts sowie die Nutzung der damit verbundenen Dienste (Rewards, Lobbies, Community-Funktionen).
                </p>
                <p>
                  Abweichende Bedingungen des Nutzers werden nicht anerkannt, es sei denn, PADEL2GO stimmt ihrer Geltung ausdrücklich schriftlich zu.
                </p>
              </div>
            </section>

            {/* § 2 Vertragsschluss & Registrierung */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">§ 2 Registrierung & Nutzerkonto</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Die Nutzung buchungspflichtiger Leistungen setzt eine kostenlose Registrierung voraus. Der Nutzer ist verpflichtet, bei der Registrierung wahrheitsgemäße und vollständige Angaben zu machen und diese aktuell zu halten.
                </p>
                <p>
                  Das Nutzerkonto ist nicht übertragbar. Der Nutzer ist für alle Aktivitäten verantwortlich, die unter seinem Konto vorgenommen werden, und hat seine Zugangsdaten vertraulich zu behandeln.
                </p>
                <p>
                  PADEL2GO behält sich vor, Nutzerkonten bei Verstößen gegen diese AGB oder bei missbräuchlicher Nutzung vorübergehend zu sperren oder dauerhaft zu löschen.
                </p>
              </div>
            </section>

            {/* § 3 Buchung & Zahlung */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">§ 3 Buchung & Zahlung</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  <span className="font-medium">Buchungsvorgang:</span> Durch Klick auf „Jetzt bezahlen" gibt der Nutzer ein verbindliches Angebot auf Abschluss eines Nutzungsvertrags für den gewählten Court und Zeitraum ab. Der Vertrag kommt mit Eingang der Zahlungsbestätigung zustande.
                </p>
                <p>
                  <span className="font-medium">Preise:</span> Alle angegebenen Preise sind Endpreise in Euro inkl. gesetzlicher Mehrwertsteuer, sofern nicht anders angegeben.
                </p>
                <p>
                  <span className="font-medium">Zahlung:</span> Die Zahlung erfolgt über den Zahlungsdienstleister Stripe. Akzeptierte Zahlungsmethoden sind Kredit- und Debitkarten sowie weitere durch Stripe angebotene Methoden. Die Buchung wird erst nach erfolgreicher Zahlung verbindlich bestätigt.
                </p>
                <p>
                  <span className="font-medium">Geteilte Zahlung (Split Payment):</span> Nutzer können eine Buchung auf mehrere Mitspieler aufteilen. Der buchende Nutzer ist für den vollständigen Zahlungseingang verantwortlich. Nicht bezahlte Anteile werden dem Buchenden in Rechnung gestellt, sofern in den jeweiligen Buchungsdetails nichts anderes vereinbart ist.
                </p>
                <p>
                  <span className="font-medium">Gutschein-Codes:</span> Gutschein-Codes können im Checkout eingelöst werden. Pro Buchung ist maximal ein Gutschein-Code verwendbar. Gutscheine sind nicht übertragbar, nicht mit anderen Aktionen kombinierbar und nicht gegen Bargeld einlösbar.
                </p>
              </div>
            </section>

            {/* § 4 Stornierung & Widerruf */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">§ 4 Stornierung & Widerrufsrecht</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  <span className="font-medium">Kein gesetzliches Widerrufsrecht:</span> Gemäß § 312g Abs. 2 Nr. 9 BGB besteht für Verträge über Freizeitdienstleistungen, bei denen der Unternehmer sich verpflichtet, die Dienstleistung zu einem bestimmten Zeitpunkt zu erbringen, kein gesetzliches Widerrufsrecht. Court-Buchungen fallen unter diese Ausnahmeregelung.
                </p>
                <p>
                  <span className="font-medium">Stornierung durch den Nutzer:</span> Stornierungen sind ausschließlich über das Nutzerkonto möglich. Je nach Stornierungszeitpunkt gelten folgende Bedingungen:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Mehr als 24 Stunden vor Buchungsbeginn: volle Rückerstattung</li>
                  <li>Weniger als 24 Stunden vor Buchungsbeginn: keine Rückerstattung</li>
                </ul>
                <p>
                  <span className="font-medium">Stornierung durch PADEL2GO:</span> Im Falle von höherer Gewalt, technischen Problemen oder anderen unvorhersehbaren Ereignissen, die eine Durchführung der Buchung unmöglich machen, wird der vollständige Betrag erstattet.
                </p>
              </div>
            </section>

            {/* § 5 Pflichten des Nutzers */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">§ 5 Pflichten des Nutzers</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>Der Nutzer verpflichtet sich:</p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>den gebuchten Court pünktlich zum reservierten Zeitraum zu nutzen und diesen in ordnungsgemäßem Zustand zu verlassen</li>
                  <li>die Nutzungsregeln des jeweiligen Standorts einzuhalten</li>
                  <li>keine Buchungen für Dritte ohne deren ausdrückliche Zustimmung vorzunehmen</li>
                  <li>die Plattform nicht missbräuchlich zu nutzen (z.B. Manipulation von Rewards, Verwendung gestohlener Zahlungsdaten)</li>
                  <li>keine automatisierten Anfragen (Bots, Scraping) an die Plattform zu senden</li>
                </ul>
                <p>
                  Bei Verstößen gegen diese Pflichten behält sich PADEL2GO vor, Ansprüche auf Schadenersatz geltend zu machen und das Nutzerkonto zu sperren.
                </p>
              </div>
            </section>

            {/* § 6 P2G Rewards & Credits */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">§ 6 P2G Rewards & Credits</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  PADEL2GO betreibt ein freiwilliges Belohnungssystem (P2G Rewards). Credits und Punkte haben keinen Geldwert und können nicht ausgezahlt werden. Sie dienen ausschließlich der Einlösung gegen verfügbare Prämien im PADEL2GO Marketplace.
                </p>
                <p>
                  PADEL2GO behält sich vor, das Rewards-System, Punkteregeln und verfügbare Prämien jederzeit zu ändern, zu erweitern oder einzustellen. Ein Anspruch auf dauerhaften Erhalt eines bestimmten Credits-Stands besteht nicht.
                </p>
                <p>
                  Bei Stornierung einer Buchung werden die für diese Buchung gutgeschriebenen Credits entsprechend zurückgebucht.
                </p>
              </div>
            </section>

            {/* § 7 Haftung */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">§ 7 Haftung & Gewährleistung</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  PADEL2GO haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit.
                </p>
                <p>
                  Bei leichter Fahrlässigkeit haftet PADEL2GO nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) und nur in Höhe des vorhersehbaren, vertragstypischen Schadens. Im Übrigen ist die Haftung ausgeschlossen.
                </p>
                <p>
                  PADEL2GO übernimmt keine Haftung für:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Schäden, die durch den Nutzer selbst oder durch den jeweiligen Court-Betreiber verursacht werden</li>
                  <li>Technische Ausfälle von Drittanbieter-Diensten (insb. Stripe, Supabase)</li>
                  <li>Verlust oder Beschädigung von Gegenständen des Nutzers am Standort</li>
                </ul>
              </div>
            </section>

            {/* § 8 Datenschutz */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">§ 8 Datenschutz</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Die Erhebung und Verarbeitung personenbezogener Daten erfolgt gemäß unserer <a href="/datenschutz" className="text-primary underline hover:no-underline">Datenschutzerklärung</a>, die Bestandteil dieser AGB ist.
                </p>
              </div>
            </section>

            {/* § 9 Änderungen der AGB */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">§ 9 Änderungen der AGB</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  PADEL2GO behält sich vor, diese AGB mit angemessener Vorankündigung (mindestens 4 Wochen) zu ändern. Nutzer werden per E-Mail über wesentliche Änderungen informiert. Die fortgesetzte Nutzung der Plattform nach Ablauf der Ankündigungsfrist gilt als Zustimmung zu den geänderten AGB.
                </p>
              </div>
            </section>

            {/* § 10 Schlussbestimmungen */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">§ 10 Schlussbestimmungen</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG).
                </p>
                <p>
                  Für Verbraucher gilt diese Rechtswahl nur insoweit, als dadurch zwingende Verbraucherschutzvorschriften des Staates, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat, nicht entzogen werden.
                </p>
                <p>
                  Gerichtsstand für Kaufleute und juristische Personen des öffentlichen Rechts ist München.
                </p>
                <p>
                  Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
                </p>
                <p>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{" "}
                  <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                    https://ec.europa.eu/consumers/odr
                  </a>. Wir sind zur Teilnahme an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle weder verpflichtet noch bereit.
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

export default AGB;
