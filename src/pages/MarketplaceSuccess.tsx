import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ShoppingBag, LayoutDashboard } from "lucide-react";

const MarketplaceSuccess = () => {
  const { t } = useTranslation("marketplace");
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <>
      <Helmet>
        <title>{t("success.metaTitle")}</title>
        <meta name="description" content={t("success.metaDescription")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto"
          >
            <Card>
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mb-6"
                  >
                    <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                  </motion.div>

                  <h1 className="text-2xl font-bold mb-2">{t("success.title")}</h1>
                  <p className="text-muted-foreground mb-2">{t("success.subtitle")}</p>
                  <p className="text-muted-foreground mb-6">{t("success.note")}</p>

                  {sessionId && (
                    <div className="mb-6 rounded-lg border border-border/50 bg-muted/40 p-3 text-sm">
                      <span className="text-muted-foreground">{t("success.referenceLabel")}: </span>
                      <span className="font-mono break-all">{sessionId}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button variant="lime" size="lg" className="w-full" asChild>
                      <NavLink to="/marketplace">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        {t("success.backToStore")}
                      </NavLink>
                    </Button>

                    <Button variant="outline" className="w-full" asChild>
                      <NavLink to="/dashboard">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {t("success.toDashboard")}
                      </NavLink>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default MarketplaceSuccess;
