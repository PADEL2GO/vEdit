import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavLink } from "react-router-dom";
import { Loader2, User, Mail, Phone, Check, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface GuestCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, email: string, phone: string) => Promise<void>;
  isSubmitting: boolean;
  locationSlug: string;
}

export function GuestCheckoutModal({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  locationSlug,
}: GuestCheckoutModalProps) {
  const { t } = useTranslation("booking");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agbAccepted, setAgbAccepted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t("guestModal.errors.name"));
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error(t("guestModal.errors.email"));
      return;
    }
    if (!agbAccepted) {
      toast.error(t("guestModal.errors.agb"));
      return;
    }
    await onConfirm(name.trim(), email.trim(), phone.trim());
  };

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className="max-w-[440px] gap-[18px] rounded-[22px] border border-border/60 bg-gradient-card p-[26px]">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[13px] border border-primary/35 bg-[linear-gradient(135deg,hsl(71_91%_51%/0.18),hsl(71_91%_51%/0.04))] text-primary">
              <User className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-[19px] font-bold tracking-tight">
                {t("guestModal.title")}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground">
                {t("guestModal.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-[13px]">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="guest-name"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-foreground/75"
            >
              <User className="h-[13px] w-[13px] text-primary" />
              {t("guestModal.nameLabel")}
            </label>
            <Input
              id="guest-name"
              placeholder={t("guestModal.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="h-11"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="guest-email"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-foreground/75"
            >
              <Mail className="h-[13px] w-[13px] text-primary" />
              {t("guestModal.emailLabel")}
            </label>
            <Input
              id="guest-email"
              type="email"
              placeholder={t("guestModal.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="h-11"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="guest-phone"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-foreground/75"
            >
              <Phone className="h-[13px] w-[13px] text-primary" />
              {t("guestModal.phoneLabel")}
            </label>
            <Input
              id="guest-phone"
              type="tel"
              placeholder={t("guestModal.phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
              className="h-11"
            />
          </div>

          {/* AGB */}
          <button
            type="button"
            onClick={() => setAgbAccepted(!agbAccepted)}
            disabled={isSubmitting}
            className="flex items-start gap-3 pt-1 text-left disabled:cursor-not-allowed"
          >
            <span
              className={`mt-0.5 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-md border transition-colors ${
                agbAccepted
                  ? "border-primary bg-primary text-black"
                  : "border-border bg-white/[0.03] text-transparent"
              }`}
            >
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </span>
            <span className="text-[12.5px] leading-relaxed text-muted-foreground">
              {t("guestModal.agbIntro")}
              <NavLink
                to="/agb"
                target="_blank"
                className="text-primary underline hover:no-underline"
              >
                {t("guestModal.agbLink")}
              </NavLink>
              {t("guestModal.agbAnd")}
              <NavLink
                to="/datenschutz"
                target="_blank"
                className="text-primary underline hover:no-underline"
              >
                {t("guestModal.privacyLink")}
              </NavLink>
              {t("guestModal.agbOutro")}
            </span>
          </button>

          <p className="pl-8 text-[11.5px] leading-relaxed text-muted-foreground/80">
            {t("guestModal.cancellationNote")}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="hero"
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("guestModal.submitting")}
              </>
            ) : (
              <>
                {t("guestModal.submit")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          {/* Privacy hint */}
          <span className="inline-flex items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Deine Daten werden nur für diese Buchung verwendet.
          </span>

          <div className="h-px bg-border" />

          {/* Login link */}
          <p className="text-center text-[13px] text-muted-foreground">
            {t("guestModal.hasAccount")}{" "}
            <NavLink
              to={`/auth?redirect=/booking/locations/${locationSlug}`}
              className="font-bold text-primary hover:underline"
            >
              {t("guestModal.login")}
            </NavLink>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
