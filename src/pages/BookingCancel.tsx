import { useSearchParams, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import { sectionThemeVars, useSectionTheme } from "@/hooks/useSectionThemes";
import { SectionShaderBackdrop } from "@/components/SectionShaderBackdrop";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, RotateCcw, ShieldCheck } from "lucide-react";
import { BookingStepper } from "@/components/booking/BookingStepper";

const BookingCancel = () => {
  const sectionColor = useSectionTheme("booking");
  const { t } = useTranslation("booking");
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  return (
    <>
      <Helmet>
        <title>{t("meta.cancel.title")}</title>
        <meta name="description" content={t("meta.cancel.description")} />
      </Helmet>

      <Navigation />

      <main
        className="relative min-h-screen bg-background pt-16 md:pt-20"
        style={sectionThemeVars(sectionColor)}
      >
        <SectionShaderBackdrop color={sectionColor} />
        <div className="relative z-[1]">
        <BookingStepper currentStep={2} />

        <section className="pt-12 md:pt-16 pb-24 px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-[480px] flex flex-col items-center gap-[22px] text-center"
          >
            {/* X-Kreis */}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 14 }}
              className="w-[88px] h-[88px] rounded-full flex items-center justify-center border border-[hsl(0_72%_55%/0.4)] bg-[hsl(0_72%_55%/0.09)] text-[hsl(0_72%_58%)]"
            >
              <X className="w-10 h-10" strokeWidth={2.5} />
            </motion.span>

            {/* Titel + Hinweis */}
            <div className="flex flex-col gap-2.5">
              <h1 className="font-bold tracking-tight text-foreground leading-tight text-[clamp(28px,4.6vw,38px)]">
                {t("cancel.title")}
              </h1>
              <p className="text-[15.5px] leading-relaxed text-muted-foreground">
                {t("cancel.description")}
              </p>
            </div>

            {/* Action-Buttons */}
            <div className="flex gap-3 w-full flex-wrap">
              {bookingId && (
                <div className="flex-1 min-w-[180px]">
                  <Button variant="hero" size="lg" className="w-full" asChild>
                    <NavLink to={`/booking/checkout?booking_id=${bookingId}`}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {t("cancel.retry")}
                    </NavLink>
                  </Button>
                </div>
              )}

              <div className="flex-1 min-w-[180px]">
                <Button variant="outline" size="lg" className="w-full" asChild>
                  <NavLink to="/booking">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t("cancel.back")}
                  </NavLink>
                </Button>
              </div>
            </div>

            {/* Fußnote */}
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[hsl(0_0%_50%)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Es wurde nichts abgebucht.
            </span>
          </motion.div>
        </section>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default BookingCancel;
