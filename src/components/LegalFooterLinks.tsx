import { NavLink } from "@/components/NavLink";
import { useTranslation } from "react-i18next";

/** Slim legal-links row for layouts without the full public Footer (Impressumspflicht). */
const LegalFooterLinks = () => {
  const { t } = useTranslation("common");
  return (
    <div className="py-6 text-center text-xs text-muted-foreground/70">
      <span className="space-x-4">
        <NavLink to="/impressum" className="hover:text-foreground transition-colors">{t("footer.links.imprint")}</NavLink>
        <NavLink to="/datenschutz" className="hover:text-foreground transition-colors">{t("footer.links.privacy")}</NavLink>
        <NavLink to="/agb" className="hover:text-foreground transition-colors">{t("footer.links.terms")}</NavLink>
      </span>
    </div>
  );
};

export default LegalFooterLinks;
