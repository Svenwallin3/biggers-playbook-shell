import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link2, Mail } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { findPossibleDuplicate } from "@/lib/signup.functions";

const title = "Sign in — Biggers Training Platform";
const description = "Magic-link sign in for Biggers Market staff training.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const checkDuplicate = useServerFn(findPossibleDuplicate);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [sent, setSent] = useState(false);
  const [magicLink, setMagicLink] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ fullName: string; maskedEmail: string } | null>(
    null,
  );

  useEffect(() => {
    if (session) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  async function sendLink() {
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        ...(fullName.trim() ? { data: { full_name: fullName.trim() } } : {}),
      },
    });
    setBusy(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setDuplicate(null);
    setSent(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      if (fullName.trim().length > 1) {
        const result = await checkDuplicate({ data: { fullName, email } });
        if (result.match) {
          setDuplicate(result.match);
          setBusy(false);
          return;
        }
      }
    } catch {
      // Duplicate check is advisory only — never block sign-in on it.
    }
    setBusy(false);
    await sendLink();
  }

  async function openMagicLinkInPreview() {
    setError(null);
    setBusy(true);
    try {
      const url = new URL(magicLink.trim());
      const isSupabaseLink =
        url.protocol === "https:" &&
        url.hostname === "kouyxrwnzjphuvnvxwyj.supabase.co" &&
        url.pathname.startsWith("/auth/v1/verify");
      const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
      const type = url.searchParams.get("type");

      if (!isSupabaseLink || !tokenHash || type !== "magiclink") {
        setError("Paste the complete Biggers Training sign-in link from the email.");
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      });
      if (verifyError) {
        setError(
          verifyError.message.toLowerCase().includes("expired")
            ? "That link has already been used or expired. Send yourself a new link, then copy it without opening it and paste the new link here."
            : verifyError.message,
        );
        return;
      }

      await navigate({ to: "/", replace: true });
    } catch {
      setError("Paste the complete Biggers Training sign-in link from the email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Biggers Training</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your work email and we&apos;ll send a sign-in link. No password to remember.
      </p>

      <Card className="mt-6">
        <CardContent className="py-6">
          {sent ? (
            <div className="space-y-4 text-center">
              <Mail className="mx-auto size-8 text-primary" />
              <p className="text-sm font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in code to {email}. Type it below and you&apos;ll stay signed in
                on this device.
              </p>
              <form
                className="space-y-2 text-left"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError(null);
                  setBusy(true);
                  const { error: codeError } = await supabase.auth.verifyOtp({
                    email,
                    token: code.trim(),
                    type: "email",
                  });
                  setBusy(false);
                  if (codeError) {
                    setError(
                      codeError.message.toLowerCase().includes("expired")
                        ? "That code has expired or was already used. Send yourself a new one."
                        : "That code didn't work. Check the numbers and try again.",
                    );
                    return;
                  }
                  await navigate({ to: "/", replace: true });
                }}
              >
                <Label htmlFor="otp-code">Sign-in code</Label>
                <Input
                  id="otp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={10}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg tracking-widest"
                />
                {error && !magicLink ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={code.length < 6 || busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
              <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/40 p-4 text-left">
                <div className="flex items-start gap-2">
                  <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Signing in inside the Lovable editor?</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Copy the sign-in link from the email without opening it, paste it here, then
                      open it in this preview.
                    </p>
                  </div>
                </div>
                <Label htmlFor="magic-link">Sign-in link</Label>
                <Input
                  id="magic-link"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://kouyxrwnzjphuvnvxwyj.supabase.co/auth/v1/verify…"
                  value={magicLink}
                  onChange={(event) => setMagicLink(event.target.value)}
                />
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button
                  type="button"
                  className="w-full"
                  disabled={!magicLink.trim() || busy}
                  onClick={openMagicLinkInPreview}
                >
                  {busy ? "Signing in…" : "Open link in this preview"}
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setSent(false)}>
                Use a different email
              </Button>
            </div>
          ) : duplicate ? (
            <div className="space-y-4">
              <Alert>
                <AlertTitle>Is this you?</AlertTitle>
                <AlertDescription>
                  We already have an account for <strong>{duplicate.fullName}</strong> under{" "}
                  {duplicate.maskedEmail}. If that&apos;s you, sign in with that email so your
                  training progress stays in one place.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => setDuplicate(null)}>
                  That&apos;s me — use my other email
                </Button>
                <Button onClick={sendLink} disabled={busy}>
                  Not me — send my link
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="name">Your full name</Label>
                  <Input
                    id="name"
                    placeholder="Jordan Fields"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="you@biggersmarket.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Sending…" : "Send magic link"}
                </Button>
              </form>

              <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/40 p-4">
                <div className="flex items-start gap-2">
                  <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Already have a sign-in link?</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Copy it from your email without opening it, then paste it here to sign in
                      inside this preview.
                    </p>
                  </div>
                </div>
                <Label htmlFor="existing-magic-link">Sign-in link</Label>
                <Input
                  id="existing-magic-link"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="Paste the link from your email"
                  value={magicLink}
                  onChange={(event) => setMagicLink(event.target.value)}
                />
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button
                  type="button"
                  className="w-full"
                  disabled={!magicLink.trim() || busy}
                  onClick={openMagicLinkInPreview}
                >
                  {busy ? "Signing in…" : "Open link in this preview"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
