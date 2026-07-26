import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";

const Widerruf = () => {
  const { t } = useTranslation("widerruf");

  const exclusionsList = t("sections.exclusions.list", { returnObjects: true }) as string[];
  const formLines = t("sections.form.lines", { returnObjects: true }) as string[];

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

            <p className="text-sm leading-relaxed text-muted-foreground">{t("intro")}</p>

            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.right.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>{t("sections.right.p1")}</p>
                <p>{t("sections.right.p2")}</p>
                <p>{t("sections.right.p3")}</p>
              </div>
            </section>

            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.consequences.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>{t("sections.consequences.p1")}</p>
                <p>{t("sections.consequences.p2")}</p>
                <p>{t("sections.consequences.p3")}</p>
                <p>{t("sections.consequences.p4")}</p>
              </div>
            </section>

            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.exclusions.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>{t("sections.exclusions.intro")}</p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  {exclusionsList.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.form.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p className="text-muted-foreground italic">{t("sections.form.intro")}</p>
                <div className="rounded-xl border border-border bg-white/[0.03] p-5 space-y-3">
                  {formLines.map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                  <p className="text-muted-foreground">{t("sections.form.outro")}</p>
                </div>
              </div>
            </section>

          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <NavLink to="/marketplace" className="text-primary underline hover:no-underline text-sm">
              {t("backToShop")}
            </NavLink>
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
};

export default Widerruf;
