import logo from "@/assets/padel2go-logo.png";
import { MapPin, Mail, Phone } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import BrandName from "@/components/BrandName";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  const links = {
    plattform: [
      { label: "Court buchen", href: "/booking" },
      { label: "Rewards", href: "/rewards" },
      { label: "Liga", href: "/league" },
      { label: "Events", href: "/events" },
      { label: "Lobbies", href: "/lobbies" },
    ],
    unternehmen: [
      { label: "Für Spieler", href: "/fuer-spieler" },
      { label: "Für Vereine", href: "/fuer-vereine" },
      { label: "Für Partner", href: "/fuer-partner" },
      { label: "Über uns", href: "/ueber-uns" },
      { label: "FAQ & Kontakt", href: "/faq-kontakt" },
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-12">
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

          {/* Plattform */}
          <div>
            <h4 className="font-semibold mb-4">Plattform</h4>
            <ul className="space-y-2">
              {links.plattform.map((link) => (
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

          {/* Unternehmen */}
          <div>
            <h4 className="font-semibold mb-4">Unternehmen</h4>
            <ul className="space-y-2">
              {links.unternehmen.map((link) => (
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
