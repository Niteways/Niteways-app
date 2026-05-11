import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PageState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "form" };

function parseHashError(): string | null {
  const raw = window.location.hash?.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash ?? "";
  const params = new URLSearchParams(raw);
  const err = params.get("error");
  if (!err) return null;
  const desc = params.get("error_description");
  const decoded = desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : "";
  if (decoded) return decoded;
  return err;
}

function hashLooksLikeRecovery(): boolean {
  const h = window.location.hash ?? "";
  return (
    h.includes("type=recovery") ||
    h.includes("type%3Drecovery") ||
    (h.includes("access_token") && h.includes("refresh_token"))
  );
}

/**
 * Supabase password recovery: email link → this URL with hash → set new password.
 * Keep this route outside VenuePortalGate.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const hashErr = parseHashError();
    if (hashErr) {
      setState({ kind: "error", message: hashErr });
      return;
    }

    const recoveryFromUrl = hashLooksLikeRecovery();

    let timeoutId = window.setTimeout(() => {
      setState((prev) =>
        prev.kind === "loading"
          ? {
              kind: "error",
              message:
                "This link is invalid or has expired. Request a new reset email from the login page.",
            }
          : prev
      );
    }, 12000);

    const goForm = () => {
      window.clearTimeout(timeoutId);
      setState({ kind: "form" });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        goForm();
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && recoveryFromUrl) {
        goForm();
      }
    });

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, []);

  const onSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (password !== password2) {
      setFormError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    await supabase.auth.signOut();
    navigate("/login?reset=success", { replace: true });
  };

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border/80 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Could not reset password</CardTitle>
            <CardDescription className="text-destructive">{state.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/80 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">Choose a new password</CardTitle>
          <CardDescription>Your email link was accepted. Set a new password for your venue portal account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-pw">New password</Label>
              <Input
                id="recovery-pw"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                required
                minLength={6}
                className="bg-muted/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-pw2">Confirm password</Label>
              <Input
                id="recovery-pw2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(ev) => setPassword2(ev.target.value)}
                required
                minLength={6}
                className="bg-muted/40"
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving…" : "Update password"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" asChild>
              <Link to="/login">Cancel</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
