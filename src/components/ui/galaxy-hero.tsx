"use client";

import React, { ReactNode } from "react";
import { motion } from "framer-motion";

interface GalaxyHeroProps {
  title: string;
  highlightedText?: string;
  children?: ReactNode;
  backgroundImage?: string;
}

function GalaxyBackground() {
  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black" />
      
      {/* Animated radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/15 via-primary/5 to-transparent animate-pulse" />
      
      {/* Floating orbs */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
        animate={{ 
          y: [0, -20, 0],
          opacity: [0.2, 0.3, 0.2]
        }}
        transition={{ 
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
        animate={{ 
          y: [0, 20, 0],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ 
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />
      <motion.div 
        className="absolute top-1/2 right-1/3 w-48 h-48 bg-lime-400/10 rounded-full blur-2xl"
        animate={{ 
          x: [0, 15, 0],
          opacity: [0.15, 0.25, 0.15]
        }}
        transition={{ 
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />
      
      {/* Stars overlay */}
      <div className="absolute inset-0 opacity-40">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function GalaxyHero({ title, highlightedText, children, backgroundImage }: GalaxyHeroProps) {
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black">
      {/* Background: photo or galaxy animation */}
      {backgroundImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </>
      ) : (
        <>
          <GalaxyBackground />
          <div className="absolute inset-0 bg-black/40 z-[1]" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center pt-16 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white">
            {title}{" "}
            {highlightedText && (
              <span className="text-gradient-lime">{highlightedText}</span>
            )}
          </h1>

          {children}
        </motion.div>
      </div>
    </section>
  );
}
