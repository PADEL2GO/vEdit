import logo from "@/assets/padel2go-logo.png";
import { MapPin, Mail, Phone } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import BrandName from "@/components/BrandName";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  const links = {
    spieler: [
      { label: "Court buchen", href: "/fuer-spieler#booking" },
      { label: "P2G Rewards", href: "/fuer-spieler#rewards" },
      { label: "League", href: "/fuer-spieler#league" },
      { label: "Community", href: "/fuer-spieler#community" },
      { label: "Jetzt registrieren", href: "/faq-kontakt?reason=spieler" },
    ],
    vereine: [
      { label: "Unser Modell", href: "/fuer-vereine#modell" },
      { label: "Vorteile", href: "/fuer-vereine#vorteile" },
      { label: "Digitales Ökosystem", href: "/fuer-vereine#digital" },
      { label: "Praxisbeispiel", href: "/fuer-vereine#beispiel" },
      { label: "Kontakt aufnehmen", href: "/faq-kontakt?reason=verein" },
    ],
    partner: [
      { label: "Brand-Touchpoints", href: "/fuer-partner#touchpoints" },
      { label: "Co-Growth Modelle", href: "/fuer-partner#cogrowth" },
      { label: "Partnerschaften", href: "/fuer-partner#usecases" },
      { label: "Partner werden", href: "/faq-kontakt?reason=partner" },
    ],
    legal: [
      { label: "Impressum", href: "/impressum" },
      { label: "Datenschutz", href: "/datenschutz" },
      { label: "AGB", href: "/agb" },
    ],
  };

  return (
    <footer className="bg-card/50 border-t border-border">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img src={logo} alt="PADEL2GO" className="h-8 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Padel dorthin bringen, wo die Menschen schon sind.
            </p>
            <div className="space-y-2">
              <a 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" 
                href="mailto:contact@padel2go.eu"
              >
                <Mail className="w-4 h-4" />
                contact@padel2go.eu
              </a>
              <a 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" 
                href="tel:+4917632350759"
              >
                <Phone className="w-4 h-4" />
                +49 176 32350759  
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                Deutschland
              </div>
            </div>
          </div>

          {/* Für Spieler */}
          <div>
            <h4 className="font-semibold mb-4">Für Spieler</h4>
            <ul className="space-y-2">
              {links.spieler.map((link) => (
                <li key={link.label}>
                  <NavLink 
                    to={link.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center"
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Für Vereine */}
          <div>
            <h4 className="font-semibold mb-4">Für Vereine</h4>
            <ul className="space-y-2">
              {links.vereine.map((link) => (
                <li key={link.label}>
                  <NavLink 
                    to={link.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Für Partner */}
          <div>
            <h4 className="font-semibold mb-4">Für Partner</h4>
            <ul className="space-y-2">
              {links.partner.map((link) => (
                <li key={link.label}>
                  <NavLink 
                    to={link.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Rechtliches */}
          <div>
            <h4 className="font-semibold mb-4">Rechtliches</h4>
            <ul className="space-y-2">
              {links.legal.map((link) => (
                <li key={link.label}>
                  <NavLink 
                    to={link.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} <BrandName inline />. Alle Rechte vorbehalten.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Made with ❤️ in Germany</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
