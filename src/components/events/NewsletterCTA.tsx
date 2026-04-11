import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BrandName from "@/components/BrandName";

export const NewsletterCTA = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email, source: "events_page" });

      if (error) {
        if (error.code === "23505") {
          toast.info("Du bist bereits für den Newsletter angemeldet!");
        } else {
          throw error;
        }
      } else {
        setIsSuccess(true);
        setEmail("");
        toast.success("Erfolgreich angemeldet! Du erhältst bald Updates zu unseren Events.");
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast.error("Anmeldung fehlgeschlagen. Bitte versuche es später erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative text-center h-full" id="newsletter">
      {/* Glow Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl blur-3xl" />
      
      <div className="relative p-8 md:p-12 rounded-3xl border border-primary/20 bg-card/50 backdrop-blur-sm h-full flex flex-col justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Nichts verpassen
            </h2>
            
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Erhalte exklusive Event-Updates, Early-Bird-Tickets und Community-News 
              direkt in dein Postfach. Kein Spam, nur das Beste von <BrandName inline />.
            </p>

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 text-primary font-medium"
              >
                <Check className="w-5 h-5" />
                Du bist dabei! Check dein Postfach.
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Deine E-Mail-Adresse"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-background border-border flex-1"
                />
                <Button 
                  type="submit" 
                  variant="hero" 
                  size="lg"
                  disabled={isLoading}
                  className="group"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Anmelden
                      <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              Mit der Anmeldung stimmst du zu, Event-Updates von <BrandName inline /> zu erhalten. 
              Du kannst dich jederzeit abmelden.
            </p>
      </div>
    </div>
  );
};

export default NewsletterCTA;
