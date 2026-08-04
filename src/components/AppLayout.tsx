import { Link, Outlet, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { PathPrompt } from "@/components/PathPrompt";
import { useAuth } from "@/hooks/useAuth";

const baseNavItems = [
  { label: "Today", to: "/" as const },
  { label: "Search", to: "/search" as const },
  { label: "Sourcing Board", to: "/sourcing-board" as const },
];

export function AppLayout() {
  const { session, employee, tier, isManagerOrOwner, isOwner, signOut } = useAuth();
  const navigate = useNavigate();

  const managerItems = isManagerOrOwner
    ? [
        { label: "Suggest", to: "/suggest" as const },
        { label: "Approvals", to: "/approvals" as const },
        { label: "Content", to: "/admin/content" as const },
      ]
    : [];

  const ownerItems = isOwner
    ? [
        { label: "Gaps", to: "/admin/gaps" as const },
        { label: "Compliance", to: "/compliance" as const },
        { label: "Merge", to: "/merge-tool" as const },
      ]
    : [];

  const privilegedItems = [...managerItems, ...ownerItems];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-2">
          <span className="text-sm font-semibold tracking-tight">
            Biggers Training Platform
          </span>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {baseNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "text-foreground font-medium" }}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            {privilegedItems.length > 0 ? (
              <span className="h-4 w-px bg-border" aria-hidden />
            ) : null}
            {privilegedItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "text-foreground font-medium" }}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <span className="h-4 w-px bg-border" aria-hidden />
            {session ? (
              <div className="flex items-center gap-2">
                <span className="text-xs">
                  {employee?.full_name ?? session.user.email}
                  {tier ? ` · ${tier}` : ""}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/login", replace: true });
                  }}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <Link
                to="/login"
                activeProps={{ className: "text-foreground font-medium" }}
                className="transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Outlet />
      </main>
      <PathPrompt />
      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          Biggers Market — internal tool
        </div>
      </footer>
    </div>
  );
}
