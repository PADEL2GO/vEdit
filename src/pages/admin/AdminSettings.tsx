import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, Shield, Lock } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function AdminSettings() {
  const { settings, isLoading, isSaving, updateSetting } = useSiteSettings();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
          <p className="text-muted-foreground">System- und App-Einstellungen</p>
        </div>

        <div className="grid gap-6">
          {/* Content Lock Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Lock className="h-5 w-5 text-primary" />
                Inhalts-Sperre
              </CardTitle>
              <CardDescription>
                B2B-Seiten für nicht autorisierte Besucher sperren (PIN erforderlich)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Sperre für "Für Vereine"</Label>
                  <p className="text-sm text-muted-foreground">
                    PIN-Eingabe für /fuer-vereine erforderlich
                  </p>
                </div>
                <Switch 
                  checked={settings?.pin_lock_vereine ?? true}
                  onCheckedChange={(checked) => updateSetting("pin_lock_vereine", checked)}
                  disabled={isLoading || isSaving}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Sperre für "Für Partner"</Label>
                  <p className="text-sm text-muted-foreground">
                    PIN-Eingabe für /fuer-partner erforderlich
                  </p>
                </div>
                <Switch 
                  checked={settings?.pin_lock_partner ?? true}
                  onCheckedChange={(checked) => updateSetting("pin_lock_partner", checked)}
                  disabled={isLoading || isSaving}
                />
              </div>
            </CardContent>
          </Card>

          {/* General Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Settings className="h-5 w-5 text-primary" />
                Allgemeine Einstellungen
              </CardTitle>
              <CardDescription>Grundlegende Systemkonfiguration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app-name">App Name</Label>
                  <Input
                    id="app-name"
                    defaultValue="PADEL2GO"
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-timezone">Standard Zeitzone</Label>
                  <Input
                    id="default-timezone"
                    defaultValue="Europe/Berlin"
                    className="bg-background border-border"
                    disabled
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Wartungsmodus</Label>
                  <p className="text-sm text-muted-foreground">
                    App für Benutzer vorübergehend deaktivieren
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Bell className="h-5 w-5 text-primary" />
                Benachrichtigungen
              </CardTitle>
              <CardDescription>E-Mail und Push-Benachrichtigungen konfigurieren</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Buchungsbestätigungen</Label>
                  <p className="text-sm text-muted-foreground">
                    E-Mail bei neuen Buchungen senden
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Stornierungsbenachrichtigungen</Label>
                  <p className="text-sm text-muted-foreground">
                    E-Mail bei Stornierungen senden
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Admin-Benachrichtigungen</Label>
                  <p className="text-sm text-muted-foreground">
                    Admins über wichtige Ereignisse informieren
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Shield className="h-5 w-5 text-primary" />
                Sicherheit
              </CardTitle>
              <CardDescription>Sicherheitseinstellungen und Zugriffskontrolle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Zwei-Faktor-Authentifizierung</Label>
                  <p className="text-sm text-muted-foreground">
                    2FA für Admin-Konten erforderlich machen
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Session-Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatisch abmelden nach Inaktivität
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}