import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { sectionThemeVars, useSectionTheme } from "@/hooks/useSectionThemes";
import { SectionShaderBackdrop } from "@/components/SectionShaderBackdrop";
import { Button } from "@/components/ui/button";
import {
  Calendar, Clock, MapPin, Ticket, QrCode, X, Check, Zap, ExternalLink,
  CalendarPlus, ShieldCheck, PartyPopper, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useDashboardEvents, useMyEventRegistrations, useRegisterForEvent, useCancelEventRegistration,
  type DashboardEvent, type MyEventRegistration,
} from "@/hooks/useEventRegistrations";

const pad = (n: number) => String(n).padStart(2, "0");
const eur = (c: number) => "€" + (c / 100).toFixed(2).replace(".", ",");

const hasPriceHint = (label?: string | null) =>
  !!label && /[\d€]/.test(label) && !/(kostenlos|gratis|free)/i.test(label);

const isFreeEvent = (e: DashboardEvent) => {
  if ((e.price_cents ?? 0) > 0) return false;
  if (e.price_cents === 0) return true;
  return !hasPriceHint(e.price_label);
};

const priceStr = (e: DashboardEvent) =>
  isFreeEvent(e) ? "Kostenlos" : e.price_label || (e.price_cents ? eur(e.price_cents) : "—");

const startDate = (e: DashboardEvent) => (e.start_at ? new Date(e.start_at) : null);
const fmtFull = (d: Date) => format(d, "EEEE, d. MMMM yyyy", { locale: de });
const fmtTime = (e: DashboardEvent) => {
  const s = startDate(e);
  if (!s) return "";
  const start = format(s, "HH:mm");
  const end = e.end_at ? " – " + format(new Date(e.end_at), "HH:mm") : "";
  return `${start}${end} Uhr`;
};

const DashboardEvents = () => {
  const { t } = useTranslation("p2g");
  const { user } = useAuth();

  const { data: events, isLoading } = useDashboardEvents();
  const { data: myRegs } = useMyEventRegistrations();
  const register = useRegisterForEvent();
  const cancel = useCancelEventRegistration();

  const [locF, setLocF] = useState("Alle");
  const [now, setNow] = useState(() => Date.now());
  const [bookEvent, setBookEvent] = useState<DashboardEvent | null>(null);
  const [bookedCode, setBookedCode] = useState<string | null>(null);
  const [ticketView, setTicketView] = useState<{ event: DashboardEvent; code: string } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const regByEvent = useMemo(() => {
    const m = new Map<string, MyEventRegistration>();
    (myRegs ?? []).forEach((r) => m.set(r.event_id, r));
    return m;
  }, [myRegs]);

  const upcoming = useMemo(
    () => (events ?? []).filter((e) => { const d = startDate(e); return !d || d.getTime() > now - 3 * 3600000; }),
    [events, now],
  );

  const cities = useMemo(() => {
    const set = new Set<string>();
    upcoming.forEach((e) => e.city && set.add(e.city));
    return ["Alle", ...Array.from(set)];
  }, [upcoming]);

  const filtered = upcoming.filter((e) => locF === "Alle" || e.city === locF);

  // Registered upcoming events (for NEXT UP + Meine Events), soonest first.
  const myUpcoming = useMemo(
    () =>
      (myRegs ?? [])
        .filter((r) => r.event && startDate(r.event) && startDate(r.event)!.getTime() > now - 3 * 3600000)
        .sort((a, b) => startDate(a.event!)!.getTime() - startDate(b.event!)!.getTime()),
    [myRegs, now],
  );
  const nextReg = myUpcoming[0];

  const codeFor = (eventId: string) => regByEvent.get(eventId)?.ticket_code ?? "";

  const openTicket = (e: DashboardEvent) => {
    const code = codeFor(e.id);
    if (code) setTicketView({ event: e, code });
  };

  const doBook = async () => {
    if (!bookEvent) return;
    try {
      const res = await register.mutateAsync(bookEvent.id);
      setBookedCode(res.ticket_code);
    } catch {
      /* toast handled in hook */
    }
  };

  const doCancel = (eventId: string) => {
    if (confirm("Anmeldung wirklich stornieren?")) cancel.mutate(eventId);
  };

  const sectionColor = useSectionTheme("events");

  // Kein Feature-Flag-Gate: veröffentlichte Events sind für alle eingeloggten User sichtbar
  // (wie auf der öffentlichen /events-Seite).

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t("meta.events.title")}</title>
      </Helmet>

      <div className="relative min-h-screen bg-background" style={sectionThemeVars(sectionColor)}>
      <SectionShaderBackdrop color={sectionColor} />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-5 py-6 md:py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex flex-col items-start gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1 text-xs font-semibold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Mein P2G
            </span>
            <h1 className="font-display font-extrabold tracking-tight text-[clamp(30px,4.6vw,48px)] leading-[1.08]">
              Event <span className="text-gradient-acc">Booking.</span>
            </h1>
            <p className="max-w-[520px] text-base leading-relaxed text-muted-foreground">
              Spot sichern, Ticket in der Tasche, auf dem Court sehen wir uns. Storno bis 48 h vorher kostenlos.
            </p>
          </div>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-muted-foreground hover:text-primary hover:border-primary/40"
          >
            Öffentliche Eventseite
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* NEXT UP */}
            {nextReg && nextReg.event ? (
              <NextUpCard
                event={nextReg.event}
                now={now}
                onTicket={() => openTicket(nextReg.event!)}
                onCancel={() => doCancel(nextReg.event_id)}
              />
            ) : (
              <div className="flex items-center gap-4 rounded-[20px] border border-dashed border-border/70 bg-white/[0.02] px-6 py-5">
                <span className="w-[50px] h-[50px] rounded-[14px] bg-white/[0.04] border border-border flex items-center justify-center text-muted-foreground shrink-0">
                  <CalendarPlus className="w-5 h-5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-display font-bold text-[17px]">Noch kein Event gebucht</span>
                  <span className="text-[13.5px] text-muted-foreground">
                    Sichere dir unten deinen ersten Spot — dein Ticket landet direkt hier.
                  </span>
                </div>
              </div>
            )}

            {/* Location filter */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {cities.map((c) => {
                const on = locF === c;
                return (
                  <button
                    key={c}
                    onClick={() => setLocF(c)}
                    className={`rounded-full px-4 py-2 text-[13px] font-semibold border transition-all ${
                      on
                        ? "bg-primary text-black border-transparent shadow-[0_0_18px_rgba(199,240,17,0.3)]"
                        : "bg-white/[0.04] text-foreground/75 border-border/70 hover:border-primary/50"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
              <span className="font-stat text-xs text-muted-foreground ml-auto whitespace-nowrap">
                {filtered.length} Events buchbar
              </span>
            </div>

            {/* Main grid */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
              {/* Bookable events */}
              <div className="flex flex-col gap-3.5 min-w-0">
                {filtered.length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-border/70 bg-white/[0.02] py-14 text-center text-muted-foreground">
                    Aktuell keine buchbaren Events{locF !== "Alle" ? ` in ${locF}` : ""}.
                  </div>
                ) : (
                  filtered.map((e, i) => (
                    <EventRow
                      key={e.id}
                      event={e}
                      index={i}
                      isReg={regByEvent.has(e.id)}
                      onBook={() => { setBookedCode(null); setBookEvent(e); }}
                      onTicket={() => openTicket(e)}
                    />
                  ))
                )}
              </div>

              {/* Meine Events */}
              <div className="lg:sticky lg:top-[90px]">
                <div className="rounded-2xl border border-border/60 bg-gradient-card p-[22px] flex flex-col gap-3.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <Ticket className="w-[18px] h-[18px] text-primary" />
                      <h3 className="font-display font-bold text-[17px]">Meine Events</h3>
                    </div>
                    <span className="font-stat text-xs text-primary bg-primary/[0.08] border border-primary/25 rounded-full px-2.5 py-0.5">
                      {myUpcoming.length}
                    </span>
                  </div>

                  {myUpcoming.length > 0 ? (
                    myUpcoming.map((r) => (
                      <MyTicketCard
                        key={r.id}
                        reg={r}
                        onShow={() => openTicket(r.event!)}
                        onCancel={() => doCancel(r.event_id)}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center gap-2.5 text-center py-6 rounded-[14px] border border-dashed border-border/70 bg-white/[0.02]">
                      <Ticket className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[13px] text-muted-foreground">Deine Tickets erscheinen hier.</span>
                    </div>
                  )}

                  <span className="inline-flex items-center gap-2 text-[11.5px] text-muted-foreground/80 mt-1">
                    <ShieldCheck className="w-3 h-3" />
                    Kostenlose Stornierung bis 48 h vor Event-Start.
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Book overlay (free events) */}
      {bookEvent && (
        <BookOverlay
          event={bookEvent}
          bookedCode={bookedCode}
          pending={register.isPending}
          onClose={() => { setBookEvent(null); setBookedCode(null); }}
          onBook={doBook}
          onShowTicket={() => {
            if (bookedCode) setTicketView({ event: bookEvent, code: bookedCode });
            setBookEvent(null);
          }}
        />
      )}

      {/* Ticket overlay */}
      {ticketView && (
        <TicketOverlay
          event={ticketView.event}
          code={ticketView.code}
          holder={user?.email ?? ""}
          onClose={() => setTicketView(null)}
        />
      )}
      </div>
    </DashboardLayout>
  );
};

// ── NEXT UP card with live countdown ─────────────────────────────────────────
function NextUpCard({
  event, now, onTicket, onCancel,
}: { event: DashboardEvent; now: number; onTicket: () => void; onCancel: () => void }) {
  const d = startDate(event)!;
  const diff = d.getTime() - now;
  const live = diff <= 0;
  const tiles = [
    { v: pad(Math.max(0, Math.floor(diff / 86400000))), l: "Tage" },
    { v: pad(Math.max(0, Math.floor((diff % 86400000) / 3600000))), l: "Std" },
    { v: pad(Math.max(0, Math.floor((diff % 3600000) / 60000))), l: "Min" },
    { v: pad(Math.max(0, Math.floor((diff % 60000) / 1000))), l: "Sek" },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/30 bg-gradient-card overflow-hidden glow-lime">
      <div className="grid md:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4 p-[clamp(22px,3vw,32px)]">
          <span className="inline-flex items-center gap-2 font-stat text-[11px] tracking-[0.18em] text-primary">
            <span className="w-[7px] h-[7px] rounded-full bg-primary animate-pulse" />
            NEXT UP — DEIN NÄCHSTES EVENT
          </span>
          <h2 className="font-display font-extrabold text-[clamp(24px,3.2vw,34px)] leading-[1.1] tracking-tight">
            {event.title}
          </h2>
          <div className="flex flex-wrap gap-y-2 gap-x-[18px]">
            <span className="inline-flex items-center gap-1.5 font-stat text-[12.5px] text-foreground/75"><Calendar className="w-3.5 h-3.5 text-primary" />{fmtFull(d)}</span>
            <span className="inline-flex items-center gap-1.5 font-stat text-[12.5px] text-foreground/75"><Clock className="w-3.5 h-3.5 text-primary" />{fmtTime(event)}</span>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground/75"><MapPin className="w-3.5 h-3.5 text-primary" />{event.venue_name || event.city}</span>
          </div>

          {live ? (
            <span className="inline-flex items-center gap-2.5 self-start font-stat text-sm font-bold text-primary bg-primary/10 border border-primary/40 rounded-full px-[18px] py-2.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-primary" />LIVE — läuft gerade 🎾
            </span>
          ) : (
            <div className="flex gap-2.5 flex-wrap">
              {tiles.map((tl) => (
                <span key={tl.l} className="flex flex-col items-center gap-0.5 min-w-[74px] bg-white/[0.04] border border-border rounded-[14px] px-2.5 py-3">
                  <span className="font-stat font-bold text-[27px] leading-none text-primary" style={{ textShadow: "0 0 24px rgba(199,240,17,0.4)" }}>{tl.v}</span>
                  <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">{tl.l}</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-3 flex-wrap mt-auto">
            <Button variant="hero" size="lg" onClick={onTicket}><QrCode className="w-4 h-4 mr-1" />Ticket anzeigen</Button>
            <button onClick={onCancel} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted-foreground border border-border rounded-xl px-[18px] hover:text-red-400 hover:border-red-500/40">
              Stornieren
            </button>
          </div>
        </div>
        <div className="relative min-h-[210px] md:min-h-[280px] order-first md:order-last">
          {event.image_url && <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, hsl(0 0% 4%), transparent 45%)" }} />
          <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-black/70 backdrop-blur border border-primary/40 rounded-full px-3 py-1.5">
            <Check className="w-3 h-3" strokeWidth={3} />Angemeldet
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Bookable event row ───────────────────────────────────────────────────────
function EventRow({
  event, index, isReg, onBook, onTicket,
}: { event: DashboardEvent; index: number; isReg: boolean; onBook: () => void; onTicket: () => void }) {
  const d = startDate(event);
  // With an external ticket link → book externally; without → in-app registration.
  const external = !!event.ticket_url;
  const cap = event.capacity;
  const used = event.registrations_count ?? 0;
  const left = cap != null ? Math.max(0, cap - used) : null;
  const full = !external && cap != null && left !== null && left <= 0 && !isReg;
  const pct = cap && cap > 0 ? Math.max(0, Math.min(100, ((left ?? 0) / cap) * 100)) : 100;
  const scarce = left !== null && cap ? left / cap <= 0.25 : false;
  const barCol = full ? "hsl(0 0% 40%)" : scarce ? "hsl(45 90% 55%)" : "#C7F011";
  const isToday = d ? new Date().toDateString() === d.toDateString() : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.05, 0.35) }}
      className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden transition-colors hover:border-primary/40"
    >
      <div className="flex items-stretch flex-wrap sm:flex-nowrap">
        {/* Date block */}
        <div className="w-[84px] flex-none flex flex-col items-center justify-center gap-px border-r border-border/50 py-4 px-2">
          <span className="text-[10.5px] font-bold tracking-wide uppercase" style={{ color: isToday ? "#C7F011" : "hsl(0 0% 55%)" }}>
            {isToday ? "Heute" : d ? format(d, "EE", { locale: de }) : "—"}
          </span>
          <span className="font-stat font-bold text-[26px] leading-tight">{d ? format(d, "dd") : "--"}</span>
          <span className="font-stat text-[10.5px] tracking-[0.16em] text-primary">{d ? format(d, "MMM", { locale: de }).toUpperCase() : ""}</span>
        </div>
        {/* Thumbnail */}
        {event.image_url && (
          <img src={event.image_url} alt="" className="hidden md:block w-[130px] flex-none object-cover border-r border-border/50" />
        )}
        {/* Info */}
        <div className="flex flex-col gap-2 p-4 flex-1 min-w-0 justify-center">
          <div className="flex items-center gap-2.5 flex-wrap">
            {event.event_type && (
              <span className="font-stat text-[10.5px] tracking-[0.12em] uppercase text-primary bg-primary/[0.08] border border-primary/25 rounded-full px-2.5 py-0.5">
                {event.event_type}
              </span>
            )}
            {isReg && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/10 border border-primary/35 rounded-full px-2.5 py-0.5">
                <Check className="w-2.5 h-2.5" strokeWidth={3} />Angemeldet
              </span>
            )}
          </div>
          <h3 className="font-display font-bold text-[17.5px] leading-tight tracking-tight line-clamp-2">{event.title}</h3>
          <div className="flex flex-wrap gap-y-1 gap-x-[15px]">
            <span className="inline-flex items-center gap-1.5 font-stat text-[11.5px] text-muted-foreground"><Clock className="w-3 h-3" />{fmtTime(event)}</span>
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground"><MapPin className="w-3 h-3" />{event.venue_name || event.city}</span>
          </div>
          {!external && cap != null && (
            <div className="flex items-center gap-2.5 max-w-[280px]">
              <div className="h-[5px] rounded-full bg-white/10 overflow-hidden flex-1">
                <div className="h-full rounded-full transition-all" style={{ width: pct + "%", background: barCol }} />
              </div>
              <span className="font-stat text-[11.5px] font-bold whitespace-nowrap" style={{ color: barCol }}>
                {full ? "Ausgebucht" : `${left} frei`}
              </span>
            </div>
          )}
        </div>
        {/* Action */}
        <div className="flex flex-col items-end justify-center gap-2.5 p-4 border-l border-border/50 flex-none w-full sm:w-auto">
          <span className="font-stat font-bold text-[18px] text-primary whitespace-nowrap">{priceStr(event)}</span>
          {isReg ? (
            <Button variant="outline" size="sm" onClick={onTicket}><QrCode className="w-3.5 h-3.5 mr-1" />Ticket</Button>
          ) : external ? (
            <Button variant="lime" size="sm" asChild>
              <a href={event.ticket_url!} target="_blank" rel="noopener noreferrer">
                <Ticket className="w-3.5 h-3.5 mr-1" />Tickets<ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          ) : full ? (
            <span className="text-[12.5px] font-bold text-muted-foreground border border-border rounded-full px-[15px] py-2 whitespace-nowrap">Ausverkauft</span>
          ) : (
            <Button variant="lime" size="sm" onClick={onBook}><Zap className="w-3.5 h-3.5 mr-1" />Spot sichern</Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Meine-Events ticket card ─────────────────────────────────────────────────
function MyTicketCard({ reg, onShow, onCancel }: { reg: MyEventRegistration; onShow: () => void; onCancel: () => void }) {
  const e = reg.event!;
  const d = startDate(e);
  return (
    <div className="flex flex-col gap-2.5 bg-white/[0.03] border border-border/70 rounded-[15px] px-[15px] py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-stat text-[11px] font-bold text-primary bg-primary/[0.08] border border-primary/25 rounded-full px-2.5 py-0.5 whitespace-nowrap">
          {d ? format(d, "EE dd.MM.", { locale: de }) : "—"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />Bestätigt
        </span>
      </div>
      <span className="font-display font-bold text-[14.5px] leading-snug">{e.title}</span>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{e.venue_name || e.city}</span>
      <div className="flex items-center justify-between gap-2 border-t border-dashed border-border/70 pt-2.5">
        <span className="font-stat text-[11px] text-muted-foreground whitespace-nowrap">{reg.ticket_code}</span>
        <span className="inline-flex gap-1.5">
          <button onClick={onShow} title="Ticket anzeigen" className="w-[30px] h-[30px] rounded-[9px] bg-white/[0.04] border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40">
            <QrCode className="w-3.5 h-3.5" />
          </button>
          <button onClick={onCancel} title="Stornieren" className="w-[30px] h-[30px] rounded-[9px] bg-white/[0.04] border border-border flex items-center justify-center text-muted-foreground hover:text-red-400 hover:border-red-500/40">
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      </div>
    </div>
  );
}

// ── Book overlay (free community events) ─────────────────────────────────────
function BookOverlay({
  event, bookedCode, pending, onClose, onBook, onShowTicket,
}: {
  event: DashboardEvent; bookedCode: string | null; pending: boolean;
  onClose: () => void; onBook: () => void; onShowTicket: () => void;
}) {
  const d = startDate(event);
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-5 overflow-y-auto"
    >
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-[min(430px,100%)] rounded-[22px] border border-border bg-gradient-to-br from-white/[0.06] to-black p-[26px] flex flex-col gap-4">
        {!bookedCode ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-[13px] bg-gradient-to-br from-primary/[0.18] to-primary/[0.04] border border-primary/35 flex items-center justify-center text-primary">
                  <Ticket className="w-5 h-5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-display font-bold text-[18px]">Spot sichern</h3>
                  <span className="text-[12.5px] text-muted-foreground">Dauert 10 Sekunden — versprochen.</span>
                </div>
              </div>
              <button onClick={onClose} className="w-[34px] h-[34px] rounded-[10px] border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 bg-white/[0.03] border border-border/70 rounded-[14px] px-[15px] py-3.5">
              <span className="font-display font-bold text-[15.5px]">{event.title}</span>
              {d && <span className="inline-flex items-center gap-2 font-stat text-[12.5px] text-foreground/75"><Calendar className="w-3.5 h-3.5 text-primary" />{fmtFull(d)}</span>}
              <span className="inline-flex items-center gap-2 font-stat text-[12.5px] text-foreground/75"><Clock className="w-3.5 h-3.5 text-primary" />{fmtTime(event)}</span>
              <span className="inline-flex items-center gap-2 text-[13px] text-foreground/75"><MapPin className="w-3.5 h-3.5 text-primary" />{event.venue_name || event.city}</span>
            </div>

            <div className="flex items-center gap-3 bg-primary/[0.06] border border-primary/25 rounded-[13px] px-[14px] py-3">
              <PartyPopper className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[13px] text-foreground/75">Kostenloses Community-Event — einfach anmelden.</span>
            </div>

            <Button variant="hero" size="lg" className="w-full" onClick={onBook} disabled={pending}>
              {pending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
              Kostenlos anmelden
            </Button>
            <span className="inline-flex items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground">
              <ShieldCheck className="w-3 h-3" />Kostenlose Stornierung bis 48 h vorher
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center py-2">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }}
              className="w-[76px] h-[76px] rounded-full bg-primary/10 border border-primary/45 flex items-center justify-center text-primary" style={{ boxShadow: "0 0 44px rgba(199,240,17,0.3)" }}>
              <Check className="w-9 h-9" strokeWidth={2.5} />
            </motion.span>
            <div className="flex flex-col gap-1.5">
              <span className="font-display font-extrabold text-2xl">Du bist dabei! 🎾</span>
              <span className="text-sm leading-relaxed text-muted-foreground">
                {event.title}<br />Ticket-Code <span className="font-stat text-primary">{bookedCode}</span>
              </span>
            </div>
            <div className="flex gap-2.5 w-full">
              <Button variant="outline" className="flex-1" onClick={onClose}>Fertig</Button>
              <Button variant="lime" className="flex-1" onClick={onShowTicket}><QrCode className="w-3.5 h-3.5 mr-1" />Ticket</Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Ticket overlay ───────────────────────────────────────────────────────────
function TicketOverlay({ event, code, holder, onClose }: { event: DashboardEvent; code: string; holder: string; onClose: () => void }) {
  const d = startDate(event);
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[110] bg-black/[0.78] backdrop-blur-md flex items-center justify-center p-5 overflow-y-auto"
    >
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-[min(380px,100%)] rounded-[24px] border border-primary/35 bg-gradient-to-br from-white/[0.06] to-black overflow-hidden" style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.65), 0 0 60px rgba(199,240,17,0.12)" }}>
        <div className="flex flex-col gap-3.5 p-6 pb-5">
          <div className="flex items-center justify-between gap-2.5">
            <span className="font-stat text-[10.5px] tracking-[0.2em] text-muted-foreground">EVENT-TICKET</span>
            <button onClick={onClose} className="w-8 h-8 rounded-[10px] border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h3 className="font-display font-extrabold text-[22px] leading-tight tracking-tight">{event.title}</h3>
          <div className="flex flex-col gap-2">
            {d && <span className="inline-flex items-center gap-2 font-stat text-[12.5px] text-foreground/75"><Calendar className="w-3.5 h-3.5 text-primary" />{fmtFull(d)}</span>}
            <span className="inline-flex items-center gap-2 font-stat text-[12.5px] text-foreground/75"><Clock className="w-3.5 h-3.5 text-primary" />{fmtTime(event)}</span>
            <span className="inline-flex items-center gap-2 text-[13px] text-foreground/75"><MapPin className="w-3.5 h-3.5 text-primary" />{event.venue_name || event.city}</span>
            {holder && <span className="inline-flex items-center gap-2 text-[13px] text-foreground/75 break-all"><Ticket className="w-3.5 h-3.5 text-primary" />{holder}</span>}
          </div>
        </div>
        <div className="relative border-t-2 border-dashed border-border">
          <span className="absolute -top-[11px] -left-[11px] w-[22px] h-[22px] rounded-full bg-black border border-border" />
          <span className="absolute -top-[11px] -right-[11px] w-[22px] h-[22px] rounded-full bg-black border border-border" />
        </div>
        <div className="flex flex-col items-center gap-2.5 p-6 pt-5">
          <div className="w-full h-[54px] rounded-md opacity-90" style={{ background: "repeating-linear-gradient(90deg, #FAFAFA 0px, #FAFAFA 2px, transparent 2px, transparent 5px, #FAFAFA 5px, #FAFAFA 6px, transparent 6px, transparent 10px)" }} />
          <span className="font-stat font-bold text-base tracking-[0.14em] text-primary">{code}</span>
          <span className="text-xs text-muted-foreground">Zeig dieses Ticket am Einlass — fertig.</span>
        </div>
      </motion.div>
    </div>
  );
}

export default DashboardEvents;
