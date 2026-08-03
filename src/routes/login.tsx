import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ShoppingBasket, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pathPrompt, setPathPrompt] = useState(false);

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
                We sent a sign-in link to {email || "your inbox"}.
              </p>
              <Button className="w-full" onClick={() => setPathPrompt(true)}>
                Continue (demo)
              </Button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@biggersmarket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Send magic link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Dialog open={pathPrompt} onOpenChange={setPathPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Which side are you training on?</DialogTitle>
            <DialogDescription>
              This sets your training path. A manager can change it later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Markets", icon: ShoppingBasket },
              { label: "Kitchen", icon: UtensilsCrossed },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate({ to: "/" })}
                className="flex flex-col items-center gap-2 rounded-lg border border-border px-4 py-6 text-sm font-medium transition-colors hover:border-primary hover:bg-accent"
              >
                <Icon className="size-6 text-primary" />
                {label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}