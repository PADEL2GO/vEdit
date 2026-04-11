import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Gift, Copy, Check, Users, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: {
    totalReferrals: number;
    completedReferrals: number;
  };
}

export function ReferralShareCard() {
  const { session } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["referral-link", session?.user?.id],
    queryFn: async (): Promise<ReferralData> => {
      const { data, error } = await supabase.functions.invoke("referral-api/link", {
        method: "GET",
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const handleCopy = async () => {
    if (!data?.referralLink) return;
    
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      toast.success("Link kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const handleShare = async () => {
    if (!data?.referralLink) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Padel2Go",
          text: "Spiele Padel und sammle Credits! Nutze meinen Einladungslink:",
          url: data.referralLink,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-5 w-5 text-primary" />
          Freunde einladen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Teile deinen Link und erhalte <span className="font-semibold text-primary">+25 Credits</span> pro Anmeldung!
        </p>

        {/* Referral Link Input */}
        <div className="flex gap-2">
          <Input
            value={data?.referralLink || ""}
            readOnly
            className="font-mono text-xs bg-muted/50"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Share Button */}
        <Button onClick={handleShare} className="w-full gap-2">
          <Share2 className="h-4 w-4" />
          Link teilen
        </Button>

        {/* Stats */}
        {data?.stats && (data.stats.totalReferrals > 0 || data.stats.completedReferrals > 0) && (
          <div className="flex items-center gap-4 pt-2 border-t text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{data.stats.totalReferrals} eingeladen</span>
            </div>
            {data.stats.completedReferrals > 0 && (
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-500" />
                <span>{data.stats.completedReferrals} aktiv</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
