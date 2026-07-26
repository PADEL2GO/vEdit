import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";

type InfoItem = { label: string; text: string };

const Versand = () => {
  const { t } = useTranslation("versand");

  const shippingItems = t("sections.shipping.items", { returnObjects: true }) as InfoItem[];
  const paymentItems = t("sections.payment.items", { returnObjects: true }) as InfoItem[];

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">

          <div className="mb-12">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">{t("header.title")}</h1>
            <p className="text-muted-foreground">{t("header.subtitle")}</p>
          </div>

          <div className="space-y-10">

            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.shipping.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                {shippingItems.map((item, idx) => (
                  <p key={idx}>
                    <span className="font-medium">{item.label}</span> {item.text}
                  </p>
                ))}
              </div>
            </section>

            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.payment.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                {paymentItems.map((item, idx) => (
                  <p key={idx}>
                    <span className="font-medium">{item.label}</span> {item.text}
                  </p>
                ))}
                <p className="text-muted-foreground">{t("sections.payment.note")}</p>
              </div>
            </section>

            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.returns.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  {t("sections.returns.p1Prefix")}
                  <NavLink to="/widerruf" className="text-primary underline hover:no-underline">{t("sections.returns.p1LinkText")}</NavLink>
                  {t("sections.returns.p1Suffix")}
                </p>
                <p>{t("sections.returns.p2")}</p>
                <p>{t("sections.returns.p3")}</p>
              </div>
            </section>

            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.contact.heading")}</h2>
              <p className="text-foreground text-sm leading-relaxed">{t("sections.contact.text")}</p>
            </section>

          </div>

        </div>
      </main>

      <Footer />
    </>
  );
};

export default Versand;
