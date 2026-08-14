import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClubAuth } from "@/hooks/useClubAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MailPlus, Trash2, UserCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { formatPrice } from "@/lib/pricing";
import { useTranslation } from "react-i18next";

interface MemberRow {
  membership_id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  source: string;
  valid_until: string | null;
  member_since: string;
  bookings_total: number;
  bookings_month: number;
  discount_bookings_month: number;
  discount_cents_month: number;
  free_tennis_month: number;
  quota_minutes_month: number;
  last_booking_at: string | null;
}

interface InviteRow {
  id: string;
  email: string;
  created_at: string;
}

/** Rückmeldung der invite_club_members-RPC je Adresse. */
const INVITE_RESULTS: Record<string, string> = {
  added: "sofort aktiv",
  invited: "eingeladen",
  already_member: "war schon Mitglied",
  other_club: "gehört einem anderen Verein",
  already_invited: "bereits eingeladen",
  invalid: "keine gültige Adresse",
};

const STAT =
  "rounded-full border px-[9px] py-[3px] text-[10.5px] font-bold whitespace-nowrap";

export default function ClubMembers() {
  const { t } = useTranslation("club");
  const { clubId, club, isManager, isLoading: authLoading } = useClubAuth();
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState("");

  const { data: members, isLoading } = useQuery({
    queryKey: ["club-member-overview", clubId],
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await (supabase as any).rpc("club_member_overview", {
        p_club_id: clubId,
      });
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
    enabled: !!clubId,
  });

  const { data: invites } = useQuery({
    queryKey: ["club-member-invites", clubId],
    queryFn: async (): Promise<InviteRow[]> => {
      const { data, error } = await (supabase as any)
        .from("club_member_invites")
        .select("id, email, created_at")
        .eq("club_id", clubId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InviteRow[];
    },
    enabled: !!clubId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["club-member-overview", clubId] });
    queryClient.invalidateQueries({ queryKey: ["club-member-invites", clubId] });
  };

  const inviteMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const { data, error } = await (supabase as any).rpc("invite_club_members", {
        p_club_id: clubId,
        p_emails: emails,
      });
      if (error) throw error;
      return (data ?? []) as Array<{ email: string; result: string }>;
    },
    onSuccess: (rows) => {
      const added = rows.filter((r) => r.result === "added").length;
      const invited = rows.filter((r) => r.result === "invited").length;
      const problems = rows.filter((r) => !["added", "invited"].includes(r.result));

      toast.success(
        `${added} sofort aktiv, ${invited} eingeladen`,
        problems.length > 0
          ? {
              description: problems
                .map((p) => `${p.email}: ${INVITE_RESULTS[p.result] ?? p.result}`)
                .join(" · "),
              duration: 8000,
            }
          : undefined,
      );
      setEmailInput("");
      refresh();
    },
    onError: (error: Error) => toast.error("Fehler: " + error.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await (supabase as any).rpc("remove_club_member", {
        p_membership_id: membershipId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mitgliedschaft beendet");
      refresh();
    },
    onError: (error: Error) => toast.error("Fehler: " + error.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await (supabase as any).rpc("revoke_club_member_invite", {
        p_invite_id: inviteId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Einladung zurückgezogen");
      refresh();
    },
    onError: (error: Error) => toast.error("Fehler: " + error.message),
  });

  /** Komma, Semikolon, Leerzeichen und Zeilenumbrüche trennen gleichermaßen. */
  const parsedEmails = emailInput
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (authLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("members.title")}</h1>
        <p className="text-muted-foreground">
          {t("members.subtitle", { club: club?.name ?? "" })}
        </p>
      </div>

      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MailPlus className="h-4 w-4 text-primary" />
              {t("members.inviteTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={"max@beispiel.de\nanna@beispiel.de"}
              rows={4}
              className="text-sm"
            />
            <p className="text-xs leading-[1.5] text-muted-foreground">
              {t("members.inviteHint")}
            </p>
            <Button
              onClick={() => inviteMutation.mutate(parsedEmails)}
              disabled={parsedEmails.length === 0 || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("members.inviteButton", { count: parsedEmails.length })
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {invites && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t("members.pendingTitle", { count: invites.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("members.pendingHint")}</p>
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/[0.02] px-3.5 py-2.5"
              >
                <span className="font-mono text-[12.5px]">{invite.email}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(invite.created_at), "dd.MM.yyyy", { locale: de })}
                  </span>
                  {isManager && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeMutation.mutate(invite.id)}
                      className="h-8 text-destructive hover:text-destructive"
                    >
                      {t("members.revoke")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4 text-primary" />
            {t("members.listTitle", { count: members?.length ?? 0 })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : !members || members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              {t("members.empty")}
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.membership_id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-white/[0.02] px-3.5 py-3"
                >
                  <div className="flex min-w-[160px] flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold">{m.display_name || m.email}</span>
                    <span className="font-mono text-[11.5px] text-muted-foreground">
                      {m.email}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`${STAT} border-primary/30 bg-primary/10 text-primary`}
                    >
                      {t("members.statDiscounted", { count: m.discount_bookings_month })}
                    </Badge>
                    <Badge variant="outline" className={`${STAT} border-border text-foreground`}>
                      −{formatPrice(m.discount_cents_month)}
                    </Badge>
                    <Badge variant="outline" className={`${STAT} border-border text-foreground`}>
                      {t("members.statBookings", { count: m.bookings_month })}
                    </Badge>
                    {m.free_tennis_month > 0 && (
                      <Badge variant="outline" className={`${STAT} border-border text-foreground`}>
                        {t("members.statTennis", { count: m.free_tennis_month })}
                      </Badge>
                    )}
                    {m.quota_minutes_month > 0 && (
                      <Badge variant="outline" className={`${STAT} border-border text-foreground`}>
                        {t("members.statQuota", { minutes: m.quota_minutes_month })}
                      </Badge>
                    )}
                  </div>

                  {isManager && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMutation.mutate(m.membership_id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
