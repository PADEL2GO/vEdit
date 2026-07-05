import { useState, Fragment } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { HeroBackgroundVisual } from "@/components/HeroBackgroundVisual";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User, Calendar, Smartphone, ArrowRight, CalendarCheck, Gem, ShoppingBag,
  Coins, Video, Bell, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLaunchDate } from "@/hooks/useLaunchDate";
import { useExpertLevels } from "@/hooks/useExpertLevels";
import { getExpertLevelEmoji } from "@/lib/expertLevels";
import leagueHero from "@/assets/league-hero.jpg";
import skypadelOutdoor from "@/assets/courts/skypadel-outdoor.jpg";
import eventsHero from "@/assets/events-hero.jpg";
import fuerVereineHero from "@/assets/fuer-vereine-hero.jpg";

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const FuerSpieler = () => {
  const { launchDate } = useLaunchDate();
  const { levels } = useExpertLevels();

  const { data: rates } = useQuery({
    queryKey: ["payback-rates-public"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("payback_points_60min, payback_points_120min")
        .eq("id", "global")
        .maybeSingle();
      return data;
    },
  });
  const p1 = Number((rates as any)?.payback_points_60min ?? 100) || 100;
  const p2 = Number((rates as any)?.payback_points_120min ?? 200) || 200;
  const maxMult = levels.length ? Math.max(...levels.map((l) => Number(l.multiplier) || 1)) : 2;

  const [nlMail, setNlMail] = useState("");
  const [nlDone, setNlDone] = useState(false);
  const [nlErr, setNlErr] = useState(false);
  const submitNl = async () => {
    if (!/.+@.+\..+/.test(nlMail.trim())) { setNlErr(true); return; }
    try {
      await (supabase as any).from("newsletter_subscribers").insert({ email: nlMail.trim().toLowerCase(), source: "fuer-spieler-ki" });
    } catch {
      /* duplicate email etc. — still confirm to the user */
    }
    setNlDone(true);
  };

  const launchLabel = format(launchDate, "dd.MM.yyyy", { locale: de });

  const pillars = [
    { img: skypadelOutdoor, tag: "Courts in ganz Deutschland", title: "Courts in ganz Deutschland", text: "SkyPadel-Courts auf Vereinsgeländen — die ersten Standorte machen den Anfang, weitere folgen.", cta: "Court buchen", to: "/booking" },
    { img: eventsHero, tag: "Open Play ab 0 €", title: "Events & Netzwerk", text: "Night Sessions, Turniere, Open Play — komm allein oder mit Crew, gematcht wird vor Ort. Dein Level zählt EU-weit in der P2G Liga.", cta: "Zu den Events", to: "/events" },
    { img: leagueHero, tag: "Payback bei jeder Buchung", title: "Marketplace & P2G Points", text: "Points sammelst du automatisch bei jeder Buchung — und löst sie im Marketplace gegen Equipment ein: als Rabatt oder für den vollen Preis.", cta: "Zum Marketplace", to: "/marketplace" },
  ];

  const steps = [
    { icon: CalendarCheck, chip: `+${p1} / +${p2} P`, title: "Buchen", text: "Fixe Points je Buchung — 1 h oder 2 h Court-Zeit." },
    { icon: Gem, chip: `bis ×${maxMult}`, title: "Multiplikator", text: "Dein Tier-Level legt obendrauf — je höher dein Level, desto mehr Payback." },
    { icon: ShoppingBag, chip: "bis 100 %", title: "Einlösen", text: "Im Marketplace gegen Equipment — als Rabatt oder für den vollen Preis." },
  ];

  const tierRange = (l: (typeof levels)[number]) => {
    const from = l.min_points.toLocaleString("de-DE");
    return l.max_points == null ? `${from}+ P` : `${from} – ${l.max_points.toLocaleString("de-DE")} P`;
  };

  return (
    <>
      <Helmet>
        <title>Für Spieler | PADEL2GO</title>
        <meta name="description" content="Courts in ganz Deutschland, Events & Community — und Payback-Points bei jeder Buchung." />
      </Helmet>

      <Navigation />

      <main className="bg-black text-foreground">
        {/* ① HERO */}
        <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
          <HeroBackgroundVisual
            videoKey="fuer-spieler.hero.video"
            imageKey="fuer-spieler.hero.image"
            alt="Padel-Spieler auf dem Court"
            fallbackSrc={leagueHero}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 55% at 50% 15%, rgba(199,240,17,0.12), transparent), linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.72) 55%, #000)" }} />
          <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-[900px] mx-auto px-5 pt-[120px] pb-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1 text-xs font-semibold text-primary">
              <User className="w-3.5 h-3.5" />Für Spieler
            </span>
            <h1 className="font-display font-extrabold tracking-tight text-[clamp(38px,7.6vw,76px)] leading-[1.06]">
              Dein Spiel. <span className="text-primary">Deine Points.</span><br />
              <span className="italic">Dein Network.</span>
            </h1>
            <p className="max-w-[560px] text-[clamp(15px,2.3vw,19px)] leading-relaxed text-foreground/75">
              Courts in ganz Deutschland, Events &amp; Community — und Payback-Points bei jeder Buchung.
            </p>
            <div className="flex flex-wrap gap-3.5 justify-center">
              <Button variant="hero" size="xl" asChild><NavLink to="/booking"><Calendar className="w-[18px] h-[18px] mr-1" />Court buchen</NavLink></Button>
              <Button variant="heroOutline" size="xl" asChild><NavLink to="/app-booking"><Smartphone className="w-[18px] h-[18px] mr-1" />App herunterladen</NavLink></Button>
            </div>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {[
                <>Launch <span className="text-primary font-bold">{launchLabel}</span></>,
                <>Registrierung <span className="text-primary font-bold">0 €</span></>,
                <>Buchung <span className="text-primary font-bold">&lt;30 Sek</span></>,
                <><span className="text-primary font-bold">+{p1}/+{p2} P</span> pro Buchung</>,
              ].map((chip, i) => (
                <span key={i} className="font-stat text-xs text-foreground/85 bg-white/[0.05] backdrop-blur border border-white/15 rounded-full px-4 py-2 whitespace-nowrap">{chip}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ② Network — 3 Pfeiler */}
        <section id="network" className="py-[clamp(72px,10vw,116px)] px-5">
          <div className="mx-auto max-w-[1200px]">
            <motion.div {...reveal()} className="flex flex-col items-center gap-3.5 text-center mb-12">
              <span className="font-stat text-xs tracking-[0.2em] uppercase text-primary">Das P2G Network</span>
              <h2 className="font-display font-extrabold text-[clamp(30px,4.6vw,52px)] leading-tight tracking-tight">
                Spielen. Connecten. <span className="text-gradient-lime">Einlösen.</span>
              </h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-5">
              {pillars.map((p, i) => (
                <motion.div key={p.title} {...reveal(i * 0.1)}
                  className="flex flex-col rounded-2xl border border-border/60 bg-gradient-card overflow-hidden">
                  <div className="relative">
                    <img src={p.img} alt={p.title} className="w-full h-[180px] object-cover" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7))" }} />
                    <span className="absolute top-3.5 left-3.5 font-stat text-[11px] text-primary bg-black/70 backdrop-blur border border-primary/35 rounded-full px-3 py-1.5 whitespace-nowrap">{p.tag}</span>
                  </div>
                  <div className="flex flex-col gap-2.5 p-[20px_22px_22px] flex-1">
                    <h3 className="font-display font-bold text-[21px] tracking-tight">{p.title}</h3>
                    <p className="text-[15px] leading-relaxed text-muted-foreground">{p.text}</p>
                    <NavLink to={p.to} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary mt-auto pt-1.5">
                      {p.cta}<ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </NavLink>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1100px] h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(199,240,17,0.45) 50%, transparent)" }} />

        {/* ③ So funktioniert Payback */}
        <section id="payback" className="py-[clamp(72px,10vw,116px)] px-5" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(199,240,17,0.06), transparent 55%), #000" }}>
          <div className="mx-auto max-w-[1100px] flex flex-col">
            <motion.div {...reveal()} className="flex flex-col items-center gap-3.5 text-center mb-11">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1 text-xs font-semibold text-primary">
                <Coins className="w-3.5 h-3.5" />P2G Points
              </span>
              <h2 className="font-display font-extrabold text-[clamp(30px,4.6vw,52px)] leading-tight tracking-tight">
                So funktioniert <span className="text-gradient-lime">Payback.</span>
              </h2>
            </motion.div>

            <motion.div {...reveal()} className="grid md:grid-cols-[1fr_40px_1fr_40px_1fr] gap-4 items-start">
              {steps.map((s, i) => (
                <Fragment key={s.title}>
                  <div className="flex flex-col items-center gap-2.5 text-center rounded-[18px] border border-border/50 p-[26px_20px]" style={{ background: "linear-gradient(145deg, hsl(0 0% 8%), hsl(0 0% 3%))" }}>
                    <span className="w-12 h-12 rounded-[13px] bg-gradient-to-br from-primary/[0.18] to-primary/[0.04] border border-primary/35 flex items-center justify-center text-primary">
                      <s.icon className="w-[22px] h-[22px]" />
                    </span>
                    <span className="font-stat font-bold text-[28px] text-primary">{s.chip}</span>
                    <h3 className="font-display font-bold text-[18px]">{s.title}</h3>
                    <p className="text-sm leading-snug text-muted-foreground">{s.text}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden md:flex items-center justify-center self-center text-primary/55">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </Fragment>
              ))}
            </motion.div>

            {/* Tier-Levels (aus Expert-Levels, Backend) */}
            {levels.length > 0 && (
              <>
                <motion.div {...reveal()} className="flex items-baseline justify-between gap-4 flex-wrap mt-[52px] mb-5">
                  <h3 className="font-display font-bold text-[clamp(19px,2.6vw,24px)] tracking-tight">
                    Dein Tier-Level = <span className="text-primary">dein Multiplikator</span>
                  </h3>
                  <span className="font-stat text-xs tracking-[0.12em] uppercase text-muted-foreground/70">{levels.length} Tiers · EU-weites Ranking</span>
                </motion.div>
                <motion.div {...reveal()} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {levels.map((l) => (
                    <div key={l.name} className="flex flex-col items-center gap-1.5 text-center rounded-2xl p-[18px_10px_14px] border border-primary/25 bg-gradient-to-br from-primary/[0.1] to-primary/[0.02]">
                      <span className="text-2xl leading-none">{l.emoji || getExpertLevelEmoji(l.name)}</span>
                      <span className="font-display font-bold text-[15px]">{l.name}</span>
                      <span className="font-stat text-[11px] text-muted-foreground">{tierRange(l)}</span>
                      <span className="font-stat text-xs font-bold text-primary bg-primary/10 border border-primary/30 rounded-full px-2.5 py-0.5 mt-0.5">×{Number(l.multiplier) || 1}</span>
                    </div>
                  ))}
                </motion.div>
              </>
            )}
          </div>
        </section>

        {/* ④ KI-Analyse Teaser */}
        <section id="ki" className="pt-[clamp(64px,9vw,104px)] px-5">
          <motion.div {...reveal()} className="relative mx-auto max-w-[1100px] rounded-[22px] overflow-hidden border" style={{ borderColor: "hsl(199 89% 60% / 0.25)" }}>
            <img src={fuerVereineHero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.22]" />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 80% at 50% 0%, hsl(199 89% 60% / 0.14), transparent 60%), linear-gradient(180deg, hsl(210 60% 3% / 0.82), rgba(0,0,0,0.94))" }} />
            <div className="relative flex flex-col items-center gap-4 text-center p-[clamp(36px,6vw,60px)_clamp(20px,4vw,48px)]">
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <span className="inline-flex items-center rounded-full border border-border bg-white/[0.05] px-3 py-1 text-xs font-semibold text-muted-foreground">Coming Soon</span>
                <span className="inline-flex items-center gap-2 font-stat text-[11px] tracking-[0.12em] uppercase rounded-full px-3.5 py-1.5" style={{ color: "hsl(199 89% 70%)", background: "hsl(199 89% 60% / 0.08)", border: "1px solid hsl(199 89% 60% / 0.3)" }}>
                  <Video className="w-3 h-3" />Powered by Wingfield
                </span>
              </div>
              <h2 className="font-display font-extrabold text-[clamp(26px,4vw,42px)] leading-tight tracking-tight">
                Als Nächstes: <span style={{ background: "linear-gradient(90deg, hsl(199 89% 62%), hsl(190 90% 70%))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>KI-Matchanalyse.</span>
              </h2>
              <p className="max-w-[560px] text-[clamp(14.5px,2vw,16.5px)] leading-relaxed text-foreground/70">
                Die Court-Kamera erfasst dein Spiel automatisch — 40+ Metriken, Auto-Clips und ein objektives Skill-Rating nach jedem Match.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["Match IQ", "Speed & Placement", "Auto-Clips", "Skill-Rating"].map((t) => (
                  <span key={t} className="font-stat text-[11.5px] rounded-full px-3.5 py-1.5 whitespace-nowrap" style={{ color: "hsl(199 89% 70%)", border: "1px solid hsl(199 89% 60% / 0.28)" }}>{t}</span>
                ))}
              </div>
              {nlDone ? (
                <div className="inline-flex items-center gap-2.5 text-[15px] font-semibold text-primary bg-primary/[0.08] border border-primary/30 rounded-full px-5 py-3 mt-1.5">
                  <Check className="w-4 h-4" />Du stehst auf der Liste — wir melden uns zum Start!
                </div>
              ) : (
                <div className="w-full max-w-[440px] flex flex-col gap-2 mt-1.5">
                  <div className={`flex gap-2.5 flex-wrap justify-center ${nlErr ? "animate-[shake_0.4s]" : ""}`}>
                    <Input type="email" value={nlMail} onChange={(e) => { setNlMail(e.target.value); setNlErr(false); }}
                      onKeyDown={(e) => e.key === "Enter" && submitNl()} placeholder="deine@email.de"
                      className="flex-1 min-w-0 h-[46px] bg-white/[0.05] border-border/70" />
                    <Button variant="lime" onClick={submitNl} className="h-[46px]"><Bell className="w-4 h-4 mr-1" />Benachrichtigt werden</Button>
                  </div>
                  {nlErr && <span className="text-[12.5px] text-red-400">Bitte gib eine gültige E-Mail-Adresse ein.</span>}
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* ⑤ CTA */}
        <section id="cta" className="py-[clamp(72px,10vw,116px)] px-5 pb-[clamp(80px,11vw,128px)]" style={{ background: "radial-gradient(ellipse 55% 45% at 50% 100%, rgba(199,240,17,0.09), transparent), #000" }}>
          <motion.div {...reveal()} className="mx-auto max-w-[760px] flex flex-col items-center gap-5 text-center">
            <h2 className="font-display font-extrabold text-[clamp(30px,4.6vw,50px)] leading-tight tracking-tight">
              Ready fürs <span className="italic text-primary">erste Match?</span>
            </h2>
            <div className="flex flex-wrap gap-3.5 justify-center">
              <Button variant="hero" size="xl" asChild><NavLink to="/booking"><Calendar className="w-[18px] h-[18px] mr-1" />Court buchen</NavLink></Button>
              <Button variant="heroOutline" size="xl" asChild><NavLink to="/app-booking"><Smartphone className="w-[18px] h-[18px] mr-1" />App herunterladen</NavLink></Button>
            </div>
            <span className="font-stat text-[12.5px] text-muted-foreground">Launch {launchLabel} · Registrierung kostenlos</span>
          </motion.div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default FuerSpieler;
