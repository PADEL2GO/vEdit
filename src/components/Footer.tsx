import logo from "@/assets/padel2go-logo.png";
import { MapPin, Mail, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import BrandName from "@/components/BrandName";
import { useAuth } from "@/hooks/useAuth";
import LanguageSwitch from "@/components/LanguageSwitch";
import {
  WhatsAppIcon,
  WHATSAPP_NUMBER_DISPLAY,
  useWhatsAppUrl,
} from "@/components/WhatsAppBusiness";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { user } = useAuth();
  const { t } = useTranslation("common");
  const whatsappUrl = useWhatsAppUrl();
  const isLoggedIn = !!user;

  // Plattform-Links verweisen auf oeffentliche Marketing-Seiten.
  // Nicht eingeloggte Besucher sehen zusaetzlich den Registrieren-Link.
  const platformLinks: Array<{ label: string; href: string }> = isLoggedIn
    ? [
        { label: t("footer.links.bookCourt"), href: "/booking" },
        { label: t("footer.links.events"), href: "/events" },
        { label: t("footer.links.league"), href: "/league" },
      ]
    : [
        { label: t("footer.links.bookCourt"), href: "/booking" },
        { label: t("footer.links.signUp"), href: "/auth" },
        { label: t("footer.links.events"), href: "/events" },
        { label: t("footer.links.league"), href: "/league" },
      ];

  const showPlatformColumn = platformLinks.length > 0;

  const links = {
    unternehmen: [
      { label: t("footer.links.forPlayers"), href: "/fuer-spieler" },
      { label: t("footer.links.forClubs"), href: "/fuer-vereine" },
      { label: t("footer.links.forPartners"), href: "/fuer-partner" },
      { label: t("footer.links.about"), href: "/ueber-uns" },
      { label: t("footer.links.faqContact"), href: "/faq-kontakt" },
    ],
    legal: [
      { label: t("footer.links.imprint"), href: "/impressum" },
      { label: t("footer.links.privacy"), href: "/datenschutz" },
      { label: t("footer.links.terms"), href: "/agb" },
    ],
  };

  return (
    <footer className="bg-card/50 border-t border-border">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div
          className={`grid grid-cols-2 ${
            showPlatformColumn ? "md:grid-cols-4" : "md:grid-cols-3"
          } gap-6 md:gap-8 mb-12`}
        >
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img src={logo} alt="PADEL2GO" className="h-8 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {t("footer.tagline")}
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
              <a
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#1FB855] transition-colors"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Business"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                <span>
                  {WHATSAPP_NUMBER_DISPLAY}
                  <span className="ml-1 text-[#1FB855] font-medium">
                    · {t("footer.whatsappBadge")}
                  </span>
                </span>
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {t("footer.country")}
              </div>
            </div>
          </div>

          {/* Plattform */}
          {showPlatformColumn && (
            <div>
              <h4 className="font-semibold mb-4">{t("footer.sections.platform")}</h4>
              <ul className="space-y-2">
                {platformLinks.map((link) => (
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
          )}

          {/* Unternehmen */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.sections.company")}</h4>
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
            <h4 className="font-semibold mb-4">{t("footer.sections.legal")}</h4>
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
            © {currentYear} <BrandName inline />. {t("footer.copyrightSuffix")}
          </p>
          <div className="flex items-center gap-4">
            <LanguageSwitch variant="footer" />
            <span className="text-sm text-muted-foreground">{t("footer.madeWith")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
