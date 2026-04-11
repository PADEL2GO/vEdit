"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Key, Mail } from "lucide-react";
import { NavLink } from "@/components/NavLink";

interface LockedContentOverlayProps {
  children: React.ReactNode;
  isLocked: boolean;
  onRequestPin: () => void;
  contactReason: string;
}

export const LockedContentOverlay = ({
  children,
  isLocked,
  onRequestPin,
  contactReason,
}: LockedContentOverlayProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  if (!isLocked) {
    return <>{children}</>;
  }

  const badgeText = contactReason === "partner" 
    ? "Werde PADEL2GO Partner" 
    : "PADEL2GO für deinen Verein";

  const headlineSecondary = contactReason === "partner"
    ? "Lass uns gemeinsam wachsen"
    : "Lass uns zusammenarbeiten";

  const buttonText = contactReason === "partner"
    ? "Bei PADEL2GO anfragen"
    : "Jetzt bei PADEL2GO anfragen";

  const bottomInfoText = contactReason === "partner"
    ? "Dieser Bereich enthält exklusive Informationen zum PADEL2GO Partnerschaftsprogramm. Fordere einen Zugangs-PIN an, um alle Inhalte freizuschalten."
    : "Dieser Bereich enthält exklusive Informationen zum PADEL2GO Vereinsprogramm. Fordere einen Zugangs-PIN an, um alle Inhalte freizuschalten.";

  return (
    <div className="relative">
      {/* Blurred content behind */}
      <div className="blur-sm opacity-20 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Lock overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 flex items-start justify-center pt-16 md:pt-24"
      >
        <section className="w-full max-w-5xl mx-4">
          {/* Availability Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-end mb-6"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-primary">{badgeText}</span>
            </div>
          </motion.div>

          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-3xl bg-card border border-border overflow-hidden shadow-2xl"
          >
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Left Side - Text Content */}
              <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
                {/* Elegant heading */}
                <div className="space-y-2 mb-10">
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="block text-lg md:text-xl text-muted-foreground font-light tracking-wide"
                  >
                    Exklusiv
                  </motion.span>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight"
                  >
                    {headlineSecondary}
                  </motion.h2>
                </div>

                {/* Book a call button with lines */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onMouseEnter={() => setIsButtonHovered(true)}
                  onMouseLeave={() => setIsButtonHovered(false)}
                  className="group relative flex items-center gap-4 mb-6"
                >
                  {/* Left line */}
                  <div 
                    className="h-px bg-gradient-to-r from-transparent via-primary/50 to-primary transition-all duration-500"
                    style={{ width: isButtonHovered ? "60px" : "40px" }}
                  />

                  {/* Button content */}
                  <NavLink
                    to={`/faq-kontakt?reason=${contactReason}`}
                    className="flex items-center gap-3 group-hover:gap-4 transition-all duration-300"
                  >
                    <Mail className="w-5 h-5 text-primary" />
                    <span className="text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                      {buttonText}
                    </span>
                    <ArrowUpRight 
                      className="w-4 h-4 text-primary transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" 
                    />
                  </NavLink>

                  {/* Right line */}
                  <div 
                    className="flex-1 h-px bg-gradient-to-r from-primary to-primary/50 via-transparent transition-all duration-500"
                    style={{ opacity: isButtonHovered ? 0.8 : 0.4 }}
                  />
                </motion.div>

                {/* Subtle subtext */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-sm text-muted-foreground"
                >
                  Unverbindliches Erstgespräch mit PADEL2GO • Individuelle Lösungen
                </motion.p>

                {/* PIN Entry Link */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  onClick={onRequestPin}
                  className="mt-8 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
                >
                  <Key className="w-4 h-4" />
                  <span className="text-sm font-medium">PIN eingeben</span>
                  <span className="text-xs text-muted-foreground/60 group-hover:text-primary/60 transition-colors">
                    (bereits Zugang?)
                  </span>
                </motion.button>
              </div>

              {/* Right Side - Interactive Circle Button */}
              <div className="relative p-8 md:p-12 lg:p-16 flex items-center justify-center bg-gradient-to-br from-card via-card to-muted/20">
                {/* Background decorative elements */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                  <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-primary/10 rounded-full blur-2xl" />
                </div>

                {/* Main Circle Button */}
                <NavLink
                  to={`/faq-kontakt?reason=${contactReason}`}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="relative group"
                >
                  <motion.div
                    animate={{
                      scale: isHovered ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-full flex items-center justify-center"
                  >
                    {/* Outer glow ring */}
                    <div 
                      className="absolute inset-0 rounded-full transition-all duration-500"
                      style={{
                        background: isHovered 
                          ? "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)"
                          : "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
                        transform: isHovered ? "scale(1.2)" : "scale(1)",
                      }}
                    />

                    {/* Main circle */}
                    <div 
                      className="absolute inset-4 rounded-full bg-gradient-to-br from-primary via-primary to-primary/80 transition-all duration-500"
                      style={{
                        boxShadow: isHovered 
                          ? "0 0 60px hsl(var(--primary) / 0.6), 0 0 100px hsl(var(--primary) / 0.4), inset 0 0 30px hsl(var(--primary) / 0.3)"
                          : "0 0 30px hsl(var(--primary) / 0.4), 0 0 60px hsl(var(--primary) / 0.2)",
                      }}
                    />

                    {/* Inner content */}
                    <div className="relative z-10 flex flex-col items-center justify-center text-primary-foreground">
                      <span className="text-lg md:text-xl font-light tracking-wide mb-1">PADEL</span>
                      <span className="text-2xl md:text-3xl font-bold tracking-tight">
                        <span className="text-gray-900">2</span>
                        <span>GO</span>
                      </span>
                      <ArrowUpRight 
                        className="w-6 h-6 mt-2 transition-transform duration-300"
                        style={{
                          transform: isHovered ? "translate(4px, -4px)" : "translate(0, 0)",
                        }}
                      />
                    </div>

                    {/* Rotating border effect */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 100 100"
                      style={{
                        transform: isHovered ? "rotate(45deg)" : "rotate(0deg)",
                        transition: "transform 0.8s ease-out",
                      }}
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="48"
                        fill="none"
                        stroke="hsl(var(--primary) / 0.3)"
                        strokeWidth="0.5"
                        strokeDasharray="8 4"
                      />
                    </svg>
                  </motion.div>
                </NavLink>
              </div>
            </div>

            {/* Bottom info bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="px-8 md:px-12 lg:px-16 py-6 border-t border-border/50 bg-muted/30"
            >
              <p className="text-sm text-muted-foreground max-w-2xl">
                {bottomInfoText}
              </p>
            </motion.div>
          </motion.div>
        </section>
      </motion.div>
    </div>
  );
};
