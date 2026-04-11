import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, CheckCircle, XCircle } from "lucide-react";

interface PinGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onValidate: (pin: string) => Promise<boolean>;
  pageTitle: string;
}

export const PinGate = ({
  open,
  onOpenChange,
  onValidate,
  pageTitle,
}: PinGateProps) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setIsValidating(true);

    try {
      const isValid = await onValidate(pin);
      if (isValid) {
        setSuccess(true);
        setTimeout(() => {
          onOpenChange(false);
          setSuccess(false);
          setPin("");
        }, 1000);
      } else {
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
    } catch {
      setError(true);
      setTimeout(() => setError(false), 2000);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Geschützter Bereich
          </DialogTitle>
          <DialogDescription>
            Gib deinen PIN ein, um die vollständigen Inhalte der Seite "{pageTitle}" freizuschalten.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="PIN eingeben (z.B. P2G-V25)"
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              className={`text-center text-lg font-mono tracking-wider ${
                error ? "border-destructive" : success ? "border-primary" : ""
              }`}
              autoFocus
            />
            {error && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
            )}
            {success && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">
              Ungültiger PIN. Bitte versuche es erneut.
            </p>
          )}

          {success && (
            <p className="text-sm text-primary text-center">
              Zugang gewährt! Inhalte werden freigeschaltet...
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" variant="hero" className="flex-1" disabled={!pin.trim() || isValidating}>
              {isValidating ? "Prüfe..." : "Freischalten"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
