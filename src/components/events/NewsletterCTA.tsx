import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation, Trans } from "react-i18next";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BrandName from "@/components/BrandName";

export const NewsletterCTA = () => {
  const { t } = useTranslation("events");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
        body: { email, source: "events_page" },
      });
      if (error) throw error;
      const already = !!(data as { already?: boolean } | null)?.already;
      setAlreadySubscribed(already);
      setIsSuccess(true);
      setEmail("");
      toast.success(
        already
          ? t("newsletter.alreadyToast")
          : t("newsletter.confirmToast"),
      );
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast.error(t("newsletter.errorToast"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="newsletter"
      className="h-full rounded-2xl border border-border/60 bg-gradient-card p-7 flex flex-col gap-4 scroll-mt-24"
    >
      <div className="flex items-center gap-3.5">
        <span className="w-12 h-12 rounded-[13px] flex-none flex items-center justify-center text-primary border border-primary/35 bg-[linear-gradient(135deg,hsl(71_91%_51%/0.18),hsl(71_91%_51%/0.04))]">
          <Mail className="w-[21px] h-[21px]" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display font-bold text-xl tracking-[-0.01em] text-foreground">
            {t("newsletter.title")}
          </h2>
          <span className="text-[13.5px] text-[hsl(0_0%_60%)]">
            {t("newsletter.subtitle")}
          </span>
        </div>
      </div>

      {isSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2.5 rounded-[14px] px-4 py-3.5 bg-primary/[0.08] border border-primary/35"
        >
          <CheckCircle2 className="w-[19px] h-[19px] text-primary flex-none" />
          <span className="text-sm font-semibold text-foreground">
            {alreadySubscribed
              ? t("newsletter.alreadyInline")
              : t("newsletter.confirmInline")}
          </span>
        </motion.div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <Input
              type="email"
              placeholder={t("newsletter.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-[46px] flex-1 rounded-[13px] bg-[hsl(0_0%_6%)] border-[hsl(0_0%_16%)] text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-0"
            />
            <Button type="submit" variant="lime" disabled={isLoading} className="h-[46px]">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("newsletter.submit")}
            </Button>
          </form>

          <p className="text-xs text-[hsl(0_0%_50%)]">
            <Trans
              i18nKey="events:newsletter.consent"
              components={[<BrandName inline />]}
            />
          </p>
        </>
      )}
    </div>
  );
};

export default NewsletterCTA;
