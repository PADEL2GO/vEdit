import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChevronDown, 
  Mail, 
  Phone, 
  MessageCircle, 
  Send,
  Users,
  Building2,
  Handshake,
  Newspaper,
  FileText,
  Calendar,
  CheckCircle2,
  Loader2
} from "lucide-react";

/**
 * FAQ & KONTAKT - Seite
 * 
 * Zusammenfassung:
 * Diese Seite beantwortet häufig gestellte Fragen und bietet verschiedene Kontaktmöglichkeiten.
 * Sie ist für alle Zielgruppen relevant – Spieler, Vereine und Partner.
 * 
 * Sektionen (neu strukturiert):
 * - Hero-Section
 * - Kontaktformular (nach oben verschoben)
 * - FAQ-Kategorien (Spieler, Vereine, Partner) - nach unten verschoben
 */

const faqCategories = [
  {
    category: "Für Spieler",
    icon: Users,
    questions: [
      {
        q: "Brauche ich eine Mitgliedschaft?",
        a: "Nein, du brauchst keine Mitgliedschaft! Padel2Go ist offen für alle. Du lädst einfach die App herunter, erstellst ein kostenloses Konto und kannst sofort bei allen Padel2Go-Standorten buchen – egal ob du Vereinsmitglied bist oder nicht.",
      },
      {
        q: "Wie buche ich einen Court?",
        a: "Öffne die Padel2Go App, wähle deinen Wunschstandort und sieh alle verfügbaren Zeiten. Mit wenigen Klicks ist dein Court gebucht. Du erhältst einen Zugangscode, mit dem du pünktlich aufs Spielfeld kommst.",
      },
      {
        q: "Was kostet eine Stunde Padel?",
        a: "Die Preise variieren je nach Standort und Tageszeit, liegen aber typischerweise zwischen €30-50 pro Stunde für den gesamten Court (4 Spieler). Das sind nur €7,50-12,50 pro Person – günstiger als viele andere Sportarten!",
      },
      {
        q: "Brauche ich eigene Ausrüstung?",
        a: "Nein! An allen Standorten findest du Vending Machines mit Schlägern und Bällen zum Ausleihen oder Kaufen. Du brauchst nur Sportschuhe (idealerweise Tennisschuhe oder Laufschuhe mit Profil).",
      },
      {
        q: "Was ist Instant Match?",
        a: "Mit Instant Match findest du automatisch Mitspieler auf deinem Level, wenn dir noch Spieler fehlen. Perfekt, wenn du alleine oder zu zweit kommst. Die App matcht dich basierend auf Skill-Level und Spielzeit.",
      },
      {
        q: "Wie funktioniert das Rewards-System?",
        a: "Mit jeder Buchung, jedem Match und jeder Aktivität sammelst du Punkte. Diese kannst du gegen Rabatte, freie Stunden, Partner-Produkte und exklusive Experiences eintauschen. Je mehr du spielst, desto mehr profitierst du!",
      },
    ],
  },
  {
    category: "Für Vereine",
    icon: Building2,
    questions: [
      {
        q: "Was kostet ein Court für den Verein?",
        a: "Gar nichts! Padel2Go übernimmt alle Kosten für Courts, Installation, Wartung, Versicherung und Marketing. Euer Verein stellt die Fläche zur Verfügung und profitiert von einer attraktiven Umsatzbeteiligung – komplett risikofrei.",
      },
      {
        q: "Welche Flächen eignen sich?",
        a: "Ideal sind Tennis-Sandplätze (wir stellen mobile Courts auf, die im Winter abbaubar sind), aber auch Parkplätze, Freiflächen, Rasenplätze oder andere ebene Flächen ab ca. 200m² (20x10m). Wir prüfen kostenlos eure Fläche auf Eignung.",
      },
      {
        q: "Wie lange dauert die Installation?",
        a: "Von der Zusage bis zum spielbereiten Court vergehen typischerweise 4-8 Wochen. Die eigentliche Installation dauert nur 2-3 Tage. Wir kümmern uns um alle Genehmigungen und die komplette Logistik.",
      },
      {
        q: "Wie funktioniert die Umsatzbeteiligung?",
        a: "Ihr erhaltet einen prozentualen Anteil aller Buchungseinnahmen an eurem Standort – ohne Risiko und ohne Vorabinvestition. Die genauen Konditionen besprechen wir individuell, abhängig von Faktoren wie Lage, Fläche und erwarteter Auslastung.",
      },
      {
        q: "Was passiert im Winter?",
        a: "Unsere mobilen Courts sind so konzipiert, dass sie bei Bedarf abgebaut und im Frühjahr wieder aufgestellt werden können. Alternativ können Traglufthallen oder andere Überdachungen zum Ganzjahresbetrieb eingesetzt werden.",
      },
      {
        q: "Wer kümmert sich um die Wartung?",
        a: "Padel2Go übernimmt die komplette Wartung: regelmäßige Checks, Reparaturen, Reinigung der Courts und Nachfüllen der Vending Machines. Ihr habt null Aufwand – wir machen das.",
      },
    ],
  },
  {
    category: "Für Partner",
    icon: Handshake,
    questions: [
      {
        q: "Wie werde ich Partner?",
        a: "Kontaktiere uns über das Formular unten mit dem Betreff 'Partnerschaftsanfrage'. Wir senden dir unser Partner-Deck mit allen Infos zu Kategorien, Reichweiten und Cases. Dann vereinbaren wir ein Gespräch, um die passende Partnerschaft zu finden.",
      },
      {
        q: "Welche Partnerkategorien gibt es?",
        a: "Wir unterscheiden zwischen Produktpartnern (z.B. Sportartikelhersteller, Getränke), Servicepartnern (z.B. Physiotherapie, Coaching), Medienpartnern und Hauptsponsoren. Für jede Kategorie gibt es maßgeschneiderte Aktivierungsmöglichkeiten.",
      },
      {
        q: "Welche Reichweite hat Padel2Go?",
        a: "Wir erreichen eine wachsende Community aktiver Padel-Spieler in der DACH-Region. Unsere Nutzer sind überdurchschnittlich sportaffin, digital-affin und gehören zu den Padel-Early-Adoptern – eine hochwertige Zielgruppe für Marken.",
      },
      {
        q: "Wie sieht eine Partnerschaft konkret aus?",
        a: "Das hängt von euren Zielen ab: Sampling bei Events, Branding an Courts, Integration in die App, Co-Branded Rewards, Turnierpatronage oder exklusive Experiences. Wir entwickeln gemeinsam das passende Paket.",
      },
    ],
  },
];

const contactReasons = [
  { value: "spieler", label: "Frage als Spieler", icon: Users },
  { value: "verein", label: "Anfrage als Verein", icon: Building2 },
  { value: "partner", label: "Partnerschaftsanfrage", icon: Handshake },
  { value: "presse", label: "Presseanfrage", icon: Newspaper },
  { value: "ki-kamera", label: "KI-Kamera Anfrage", icon: FileText },
];

const FaqKontakt = () => {
  const [searchParams] = useSearchParams();
  
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    reason: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set reason from URL params
  useEffect(() => {
    const reasonParam = searchParams.get("reason");
    if (reasonParam && ["spieler", "verein", "partner", "presse", "ki-kamera"].includes(reasonParam)) {
      setFormData(prev => ({ ...prev, reason: reasonParam }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: formData
      });

      if (error) {
        console.error("Error sending email:", error);
        toast.error("Fehler beim Senden", {
          description: "Bitte versuche es später erneut oder schreibe uns direkt an contact@padel2go.eu",
        });
        return;
      }

      toast.success("Nachricht gesendet!", {
        description: "Wir melden uns schnellstmöglich bei dir.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        organization: "",
        reason: searchParams.get("reason") || "",
        message: "",
      });
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Fehler beim Senden", {
        description: "Bitte versuche es später erneut.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>FAQ & Kontakt | Padel2Go – Hilfe und Support</title>
        <meta name="description" content="Finde Antworten auf häufige Fragen zu Padel2Go oder kontaktiere uns direkt. Wir helfen Spielern, Vereinen und Partnern." />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-20">
        {/* Hero Section */}
        <section className="relative py-14 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Hilfe & Support</span>
              </span>
              
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Fragen? Wir haben{" "}
                <span className="text-gradient-lime">Antworten.</span>
              </h1>
              
              <p className="text-xl text-muted-foreground">
                Ob Spieler, Verein oder Partner – hier findest du alle wichtigen Infos. 
                Und wenn nicht: Schreib uns einfach!
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Section - JETZT OBEN */}
        <section className="py-14 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-10 md:mb-16"
            >
              <h2 className="text-2xl md:text-4xl font-bold mb-4">
                Kontakt <span className="text-gradient-lime">aufnehmen</span>
              </h2>
              <p className="text-muted-foreground">
                Du hast eine Frage oder möchtest mehr erfahren? Schreib uns – wir antworten schnell!
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-stretch">
              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="order-2 lg:order-1 flex"
              >
                <div className="bg-card border border-border rounded-2xl p-8 flex flex-col w-full">
                  <h3 className="text-xl font-bold mb-6">Schreib uns eine Nachricht</h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col">
                    {/* Reason Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-3">Ich bin...</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {contactReasons.map((reason) => {
                          const ReasonIcon = reason.icon;
                          const isSelected = formData.reason === reason.value;
                          return (
                            <button
                              key={reason.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, reason: reason.value })}
                              className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                                isSelected 
                                  ? "border-primary bg-primary/10 text-foreground" 
                                  : "border-border hover:border-primary/50 text-muted-foreground"
                              }`}
                            >
                              <ReasonIcon className={`w-4 h-4 ${isSelected ? "text-primary" : ""}`} />
                              <span className="text-sm font-medium">{reason.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                          placeholder="Dein Name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">E-Mail</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                          placeholder="deine@email.de"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Verein / Marke / Redaktion</label>
                      <input
                        type="text"
                        value={formData.organization}
                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                        placeholder="z.B. TC Bamberg, Red Bull, Süddeutsche Zeitung"
                      />
                    </div>

                    <div className="flex-1 flex flex-col">
                      <label className="block text-sm font-medium mb-2">Nachricht</label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors resize-none flex-1 min-h-[120px]"
                        placeholder="Wie können wir dir helfen?"
                        required
                      />
                    </div>

                    <Button type="submit" variant="lime" size="lg" className="w-full group" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Wird gesendet...
                        </>
                      ) : (
                        <>
                          Nachricht senden
                          <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </motion.div>

              {/* Contact Info & Special Sections */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="order-1 lg:order-2 space-y-6"
              >
                {/* Direct Contact */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4">Direkt erreichen</h3>
                  <div className="space-y-4">
                    <a 
                      href="mailto:contact@padel2go.eu" 
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">contact@padel2go.eu</p>
                        <p className="text-sm">Antwort innerhalb von 24h</p>
                      </div>
                    </a>
                    <a 
                      href="tel:+4917632350759" 
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">+49 176 32350759</p>
                        <p className="text-sm">Mo-Fr 9:00-18:00 Uhr</p>
                      </div>
                    </a>
                  </div>
                </div>

                {/* For Clubs */}
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold">Für Vereine</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Interesse an Padel-Courts für euren Verein? Wir bieten eine kostenlose 
                    Erstberatung inklusive Standortcheck und Potenzialanalyse.
                  </p>
                  <ul className="space-y-2 mb-4">
                    {["Kostenloser Vor-Ort-Termin", "Flächen-Eignungsprüfung", "Individuelle Konzepterstellung"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant="outline" 
                    className="w-full border-primary/30 hover:bg-primary/10"
                    onClick={() => setFormData(prev => ({ ...prev, reason: "verein" }))}
                  >
                    Erstberatung anfragen
                  </Button>
                </div>

                {/* For Partners */}
                <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="text-lg font-bold">Für Partner</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Du möchtest Partner werden? Fordere unser Partner-Deck an mit allen Infos 
                    zu Kategorien, Reichweiten und erfolgreichen Cases.
                  </p>
                  <ul className="space-y-2 mb-4">
                    {["Detailliertes Partner-Deck", "Erfolgreiche Case Studies", "Individuelle Beratung"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant="outline" 
                    className="w-full border-accent/30 hover:bg-accent/10"
                    onClick={() => setFormData(prev => ({ ...prev, reason: "partner" }))}
                  >
                    Partner-Deck anfordern
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQ Section - JETZT UNTEN */}
        <section className="py-14 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-16"
            >
              <h2 className="text-2xl md:text-4xl font-bold mb-4">
                Häufig gestellte <span className="text-gradient-lime">Fragen</span>
              </h2>
              <p className="text-muted-foreground">
                Geordnet nach Zielgruppen: Spieler, Vereine und Partner.
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto space-y-16">
              {faqCategories.map((category, catIndex) => {
                const CategoryIcon = category.icon;
                return (
                  <motion.div
                    key={category.category}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: catIndex * 0.1 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <CategoryIcon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold">{category.category}</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {category.questions.map((faq, index) => {
                        const questionId = `${catIndex}-${index}`;
                        const isOpen = openQuestion === questionId;
                        
                        return (
                          <div
                            key={questionId}
                            className="border border-border rounded-xl overflow-hidden bg-card/50"
                          >
                            <button
                              onClick={() => setOpenQuestion(isOpen ? null : questionId)}
                              className="w-full flex items-center justify-between p-5 text-left hover:bg-secondary/50 transition-colors"
                            >
                              <span className="font-medium pr-4">{faq.q}</span>
                              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                            <motion.div
                              initial={false}
                              animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 text-muted-foreground border-t border-border/50 pt-4">
                                {faq.a}
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default FaqKontakt;
