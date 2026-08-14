/**
 * Admin-Zugriffspruefung fuer Edge Functions.
 *
 * Zwei Stufen, dieselbe Logik wie im Frontend und in den RLS-Policies:
 *   1. Vollzugriff  — app_role 'admin' oder die Superadmin-Adresse
 *   2. eigene Rolle — hat der Nutzer GENAU DIESE Admin-Seite zugewiesen?
 *
 * Ohne pageKey bleibt es beim alten Verhalten (nur Vollzugriff). Das ist die
 * richtige Voreinstellung fuer alles, was nicht an eine delegierbare Seite
 * gebunden ist — etwa Kontoloeschung oder Launch-Reset.
 */

const SUPERADMIN_EMAILS = ["fsteinfelder@padel2go.eu"];

interface MinimalUser {
  id: string;
  email?: string | null;
}

/** Vollzugriff: Systemrolle 'admin' oder Superadmin-Adresse. */
export async function isFullAdmin(
  supabaseAdmin: { from: (t: string) => any },
  user: MinimalUser,
): Promise<boolean> {
  if (user.email && SUPERADMIN_EMAILS.includes(user.email)) return true;

  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  return !!data;
}

/**
 * Darf dieser Nutzer die Aktion ausfuehren? Vollzugriff immer; sonst nur, wenn
 * ihm die angegebene Admin-Seite ueber eine eigene Rolle freigegeben wurde.
 */
export async function hasAdminAccess(
  supabaseAdmin: { from: (t: string) => any; rpc: (fn: string, args: Record<string, unknown>) => any },
  user: MinimalUser,
  pageKey?: string | string[],
): Promise<boolean> {
  if (await isFullAdmin(supabaseAdmin, user)) return true;
  if (!pageKey) return false;

  // Mehrere Seiten: eine genuegt. Nur fuer geteilte Werkzeuge gedacht (etwa die
  // Uebersetzung), die von mehreren Redaktionsseiten aus benutzt werden.
  const keys = Array.isArray(pageKey) ? pageKey : [pageKey];

  for (const key of keys) {
    const { data, error } = await supabaseAdmin.rpc("has_admin_page", {
      p_user: user.id,
      p_page: key,
    });
    if (error) {
      console.error("[adminAccess] has_admin_page failed", error.message);
      return false;
    }
    if (data === true) return true;
  }
  return false;
}
