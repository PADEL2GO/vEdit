import { MapPin, CalendarDays, CreditCard, PartyPopper, Check } from "lucide-react";
import { NavLink } from "@/components/NavLink";

/**
 * Booking-Flow-Fortschritt: Standort → Termin → Bezahlen → Fertig.
 * Sticky-Leiste direkt unter der fixierten Navigation. `currentStep`:
 * 0 = Standort (/booking), 1 = Termin (/booking/locations/:slug),
 * 2 = Bezahlen (/booking/checkout | /booking/cancel), 3 = Fertig (/booking/success).
 * `detailPath` macht Schritt "Termin" anklickbar (zurück zur Standort-Detailseite).
 */
const STEPS = [
  { icon: MapPin, label: "Standort" },
  { icon: CalendarDays, label: "Termin" },
  { icon: CreditCard, label: "Bezahlen" },
  { icon: PartyPopper, label: "Fertig" },
];

export function BookingStepper({ currentStep, detailPath }: { currentStep: number; detailPath?: string }) {
  const isSuccess = currentStep === 3;

  return (
    <div className="sticky top-16 md:top-20 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="flex items-center justify-center gap-1 h-14">
          {STEPS.map((step, i) => {
            const done = i < currentStep || isSuccess;
            const active = i === currentStep && !isSuccess;
            const Icon = done ? Check : step.icon;
            const href = i === 0 ? "/booking" : i === 1 ? detailPath : undefined;
            const clickable = done && !isSuccess && !!href;

            const inner = (
              <div className="flex items-center gap-[7px] px-[5px] py-1">
                <span
                  className={`flex-none w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all duration-300 ${
                    done
                      ? "bg-primary text-black border border-transparent shadow-[0_0_18px_hsl(71_91%_51%/0.3)]"
                      : active
                        ? "bg-primary/[0.12] text-primary border border-primary/60 shadow-[0_0_18px_hsl(71_91%_51%/0.3)]"
                        : "bg-[hsl(0_0%_7%)] text-[hsl(0_0%_45%)] border border-[hsl(0_0%_18%)]"
                  }`}
                >
                  <Icon className="w-[15px] h-[15px]" strokeWidth={done ? 3 : 2} />
                </span>
                <span
                  className={`hidden md:inline text-[13px] font-semibold whitespace-nowrap ${
                    active ? "text-foreground" : done ? "text-[hsl(0_0%_70%)]" : "text-[hsl(0_0%_45%)]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );

            return (
              <div key={step.label} className="flex items-center gap-1 min-w-0">
                {i > 0 && (
                  <span
                    className={`flex-none h-0.5 rounded ${
                      i <= currentStep || isSuccess ? "bg-primary/55" : "bg-[hsl(0_0%_16%)]"
                    }`}
                    style={{ width: "clamp(10px, 2.6vw, 34px)" }}
                  />
                )}
                {clickable ? (
                  <NavLink to={href!} className="cursor-pointer">
                    {inner}
                  </NavLink>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
