import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

type BookingItem = { label: string; text: string };

const AGB = () => {
  const { t } = useTranslation("agb");

  const bookingItems = t("sections.booking.items", { returnObjects: true }) as BookingItem[];
  const goodsItems = t("sections.goods.items", { returnObjects: true }) as BookingItem[];
  const cancellationList = t("sections.cancellation.userList", { returnObjects: true }) as string[];
  const userDutiesList = t("sections.userDuties.list", { returnObjects: true }) as string[];
  const liabilityList = t("sections.liability.list", { returnObjects: true }) as string[];

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">

          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">{t("header.title")}</h1>
            <p className="text-muted-foreground">{t("header.subtitle")}</p>
          </div>

          <div className="space-y-10">

            {/* § 1 Geltungsbereich */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.scope.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  {t("sections.scope.p1Prefix")}<span className="font-medium">{t("sections.scope.p1Domain")}</span>{t("sections.scope.p1Suffix")}
                </p>
                <p>{t("sections.scope.p2")}</p>
                <p>{t("sections.scope.p3")}</p>
              </div>
            </section>

            {/* § 2 Vertragsschluss & Registrierung */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.registration.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>{t("sections.registration.p1")}</p>
                <p>{t("sections.registration.p2")}</p>
                <p>{t("sections.registration.p3")}</p>
              </div>
            </section>

            {/* § 3 Buchung & Zahlung */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.booking.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                {bookingItems.map((item, idx) => (
                  <p key={idx}>
                    <span className="font-medium">{item.label}</span> {item.text}
                  </p>
                ))}
              </div>
            </section>

            {/* § 4 Stornierung & Widerruf */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.cancellation.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  <span className="font-medium">{t("sections.cancellation.noWithdrawalLabel")}</span> {t("sections.cancellation.noWithdrawalText")}
                </p>
                <p>
                  <span className="font-medium">{t("sections.cancellation.userLabel")}</span> {t("sections.cancellation.userText")}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {cancellationList.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p>
                  <span className="font-medium">{t("sections.cancellation.providerLabel")}</span> {t("sections.cancellation.providerText")}
                </p>
              </div>
            </section>

            {/* § 5 Warenkauf im Shop */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.goods.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                {goodsItems.map((item, idx) => (
                  <p key={idx}>
                    <span className="font-medium">{item.label}</span> {item.text}
                  </p>
                ))}
              </div>
            </section>

            {/* § 6 Widerrufsrecht Warenkauf */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.withdrawal.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  {t("sections.withdrawal.p1Prefix")}
                  <a href="/widerruf" className="text-primary underline hover:no-underline">{t("sections.withdrawal.p1LinkText")}</a>
                  {t("sections.withdrawal.p1Suffix")}
                </p>
                <p>{t("sections.withdrawal.p2")}</p>
                <p>{t("sections.withdrawal.p3")}</p>
                <p>{t("sections.withdrawal.p4")}</p>
              </div>
            </section>

            {/* § 7 Pflichten des Nutzers */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.userDuties.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>{t("sections.userDuties.intro")}</p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  {userDutiesList.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p>{t("sections.userDuties.outro")}</p>
              </div>
            </section>

            {/* § 6 P2G Rewards & Credits */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.rewards.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>{t("sections.rewards.p1")}</p>
                <p>{t("sections.rewards.p2")}</p>
                <p>{t("sections.rewards.p3")}</p>
                <p>{t("sections.rewards.p4")}</p>
              </div>
            </section>

            {/* § 7 Haftung */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.liability.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>{t("sections.liability.p1")}</p>
                <p>{t("sections.liability.p2")}</p>
                <p>{t("sections.liability.intro")}</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {liabilityList.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            {/* § 8 Datenschutz */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.privacy.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>
                  {t("sections.privacy.prefix")}<a href="/datenschutz" className="text-primary underline hover:no-underline">{t("sections.privacy.linkText")}</a>{t("sections.privacy.suffix")}
                </p>
              </div>
            </section>

            {/* § 9 Änderungen der AGB */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.changes.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>{t("sections.changes.p1")}</p>
              </div>
            </section>

            {/* § 10 Schlussbestimmungen */}
            <section className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 text-primary">{t("sections.final.heading")}</h2>
              <div className="space-y-3 text-foreground text-sm leading-relaxed">
                <p>{t("sections.final.p1")}</p>
                <p>{t("sections.final.p2")}</p>
                <p>{t("sections.final.p3")}</p>
                <p>{t("sections.final.p4")}</p>
                <p>{t("sections.final.p5")}</p>
              </div>
            </section>

          </div>

          <div className="mt-12 pt-8 border-t border-border space-y-2">
            <p className="text-sm text-muted-foreground">{t("footerNote")}</p>
            {t("enLegalNotice") && (
              <p className="text-xs text-muted-foreground italic">{t("enLegalNotice")}</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default AGB;
