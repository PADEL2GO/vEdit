import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
const Impressum = () => {
  return <>
      <Helmet>
        <title>Impressum | Padel2Go</title>
        <meta name="description" content="Impressum der PADEL2GO UG - Rechtliche Informationen, Kontaktdaten und Angaben gemäß § 5 TMG." />
      </Helmet>
      
      <Navigation />
      
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">Impressum</h1>
            <p className="text-muted-foreground">Angaben gemäß § 5 TMG</p>
          </div>

          {/* Content */}
          <div className="space-y-10">
            
            {/* Anbieter */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">Anbieter</h2>
              <div className="space-y-1 text-foreground">
                <p className="font-semibold">PADEL2GO UG (haftungsbeschränkt)</p>
                <p>Am Neudeck 10</p>
                <p>81541 München</p>
                <p>Deutschland</p>
              </div>
            </section>

            {/* Vertretungsberechtigte */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">Vertretungsberechtigte Geschäftsführer</h2>
              <div className="space-y-1 text-foreground">
                <p>Florian Steinfelder</p>
                <p>David Klemm</p>
              </div>
            </section>

            {/* Kontakt */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">Kontakt</h2>
              <div className="space-y-2 text-foreground">
                <p>
                  <span className="text-muted-foreground">E-Mail:</span>{" "}
                  <a className="hover:text-lime transition-colors" href="mailto:contact@padel2go.eu">
                    contact@padel2go.eu
                  </a>
                </p>
                <p>
                  <span className="text-muted-foreground">Telefon:</span>{" "}
                  <a className="hover:text-lime transition-colors" href="tel:+4917632350759">
                    +49 176 32350 759  
                  </a>
                </p>
              </div>
            </section>

            {/* Registereintrag */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">Registereintrag</h2>
              <div className="space-y-2 text-foreground">
                <p>
                  <span className="text-muted-foreground">Registergericht:</span> Amtsgericht München
                </p>
                <p>
                  <span className="text-muted-foreground">Registernummer:</span> HRB 306377
                </p>
              </div>
            </section>

            {/* Umsatzsteuer-ID */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">Umsatzsteuer-ID</h2>
              <p className="text-foreground">
                <span className="text-muted-foreground">Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:</span><br />
                DE [Nummer wird ergänzt]
              </p>
            </section>

            {/* Verantwortlich für den Inhalt */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
              <div className="space-y-1 text-foreground">
                <p className="font-semibold">Florian Steinfelder & David Klemm</p>
                <p>Am Neudeck 10</p>
                <p>81541 München</p>
              </div>
            </section>

            {/* Streitschlichtung */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">EU-Streitschlichtung</h2>
              <p className="text-muted-foreground mb-4">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
              </p>
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
                https://ec.europa.eu/consumers/odr/
              </a>
              <p className="text-muted-foreground mt-4">
                Unsere E-Mail-Adresse finden Sie oben im Impressum.
              </p>
            </section>

            {/* Verbraucherstreitbeilegung */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
              <p className="text-muted-foreground">
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>

            {/* Haftung für Inhalte */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">Haftung für Inhalte</h2>
              <p className="text-muted-foreground">
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den 
                allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht 
                verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen 
                zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
              <p className="text-muted-foreground mt-4">
                Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen 
                Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt 
                der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden 
                Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
              </p>
            </section>

            {/* Haftung für Links */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">Haftung für Links</h2>
              <p className="text-muted-foreground">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. 
                Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der 
                verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die 
                verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. 
                Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
              </p>
              <p className="text-muted-foreground mt-4">
                Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte 
                einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige 
                Links umgehend entfernen.
              </p>
            </section>

            {/* Urheberrecht */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-4 text-lime">Urheberrecht</h2>
              <p className="text-muted-foreground">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem 
                deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung 
                außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen 
                Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht 
                kommerziellen Gebrauch gestattet.
              </p>
              <p className="text-muted-foreground mt-4">
                Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte 
                Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie 
                trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden 
                Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
              </p>
            </section>

          </div>

          {/* Last Updated */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">Stand: Dezember 2025</p>
          </div>

        </div>
      </main>

      <Footer />
    </>;
};
export default Impressum;