import { useState, useCallback } from "react";
import { useSettingsStore } from "@/store/settings";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvailableCalendars } from "./AvailableCalendars";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { CalDAVAccountForm } from "./CalDAVAccountForm";

export function AccountManager() {
  const { accounts, refreshAccounts, removeAccount } = useSettingsStore();
  const { system } = useSettingsStore();
  const [showAvailableFor, setShowAvailableFor] = useState<string | null>(null);
  const [showCalDAVForm, setShowCalDAVForm] = useState(false);

  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  const handleConnect = (provider: "GOOGLE" | "OUTLOOK") => {
    if (provider === "GOOGLE") {
      window.location.href = `/api/calendar/google/auth`;
    } else if (provider === "OUTLOOK") {
      window.location.href = `/api/calendar/outlook/auth`;
    }
  };

  const handleRemove = async (accountId: string) => {
    try {
      await removeAccount(accountId);
    } catch (error) {
      console.error("Failed to remove account:", error);
    }
  };

  const toggleAvailableCalendars = useCallback((accountId: string) => {
    setShowAvailableFor((current) =>
      current === accountId ? null : accountId
    );
  }, []);

  const showGoogleCredentialsWarning =
    !system.googleClientId || !system.googleClientSecret;

  const showOutlookCredentialsWarning =
    !system.outlookClientId || !system.outlookClientSecret;

  const handleCalDAVSuccess = () => {
    setShowCalDAVForm(false);
    refreshAccounts();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your connected calendar accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showGoogleCredentialsWarning && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Missing Google Credentials</AlertTitle>
              <AlertDescription>
                Please go to the System Settings tab and configure your Google
                Client ID and Secret before connecting Google Calendar.
              </AlertDescription>
            </Alert>
          )}

          {showOutlookCredentialsWarning && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Missing Outlook Credentials</AlertTitle>
              <AlertDescription>
                Please go to the System Settings tab and configure your Outlook
                Client ID and Secret before connecting Outlook Calendar.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleConnect("GOOGLE")}
              disabled={showGoogleCredentialsWarning}
            >
              Connect Google Calendar
            </Button>
            <Button
              onClick={() => handleConnect("OUTLOOK")}
              disabled={showOutlookCredentialsWarning}
            >
              Connect Outlook Calendar
            </Button>
            <Button onClick={() => setShowCalDAVForm(true)} variant="outline">
              Connect CalDAV Calendar
            </Button>
          </div>

          {showCalDAVForm && (
            <Card>
              <CardContent className="pt-6">
                <CalDAVAccountForm
                  onSuccess={handleCalDAVSuccess}
                  onCancel={() => setShowCalDAVForm(false)}
                />
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            account.provider === "GOOGLE"
                              ? "default"
                              : account.provider === "OUTLOOK"
                              ? "secondary"
                              : "outline"
                          }
                          className="capitalize"
                        >
                          {account.provider.toLowerCase()}
                        </Badge>
                        <span className="text-sm font-medium">
                          {account.email}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {account.calendars.length} calendars
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAvailableCalendars(account.id)}
                        >
                          {showAvailableFor === account.id ? "Hide" : "Show"}{" "}
                          Calendars
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemove(account.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {showAvailableFor === account.id && (
                  <Card>
                    <CardContent className="pt-6">
                      <AvailableCalendars
                        accountId={account.id}
                        provider={account.provider}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
