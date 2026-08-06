import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { PathPrompt } from "@/components/PathPrompt";
import { useAuth } from "@/hooks/useAuth";

const baseNavItems = [
  { label: "Today", to: "/" as const },
  { label: "Search", to: "/search" as const },
];

export function AppLayout() {
  const { session, employee, tier, isManagerOrOwner, isOwner, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isAdminScreen = [
    "/admin",
    "/approvals",
    "/compliance",
    "/merge-tool",
    "/suggest",
    "/team",
    "/training-queue",
  ].some((p) => pathname.startsWith(p));

  const managerItems = isManagerOrOwner
    ? [
        { label: "Training Queue", to: "/training-queue" as const },
        { label: "Preview Training", to: "/preview" as const },
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
        { label: "Team", to: "/team" as const },
      ]
    : [];

  const privilegedItems = [...managerItems, ...ownerItems];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
        <div
          className={`mx-auto flex min-h-14 w-full flex-wrap items-center justify-between gap-3 px-6 py-2 ${
            isAdminScreen ? "max-w-7xl" : "max-w-5xl"
          }`}
        >
          <Link to="/" className="flex items-center gap-2">
            <span
              className="flex size-7 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground"
              aria-hidden
            >
              B
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight">
              Biggers Training
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {baseNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-secondary text-secondary-foreground font-semibold" }}
                className="rounded-md px-2.5 py-1.5 transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/reference"
              className={`rounded-md px-2.5 py-1.5 transition-colors hover:bg-secondary/60 hover:text-foreground ${
                pathname.startsWith("/reference")
                  ? "bg-secondary text-secondary-foreground font-semibold"
                  : ""
              }`}
            >
              Reference Guides
            </Link>
            {privilegedItems.length > 0 ? (
              <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            ) : null}
            {privilegedItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "bg-secondary text-secondary-foreground font-semibold" }}
                className="rounded-md px-2.5 py-1.5 text-[13px] transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            {session ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
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
                activeProps={{ className: "text-foreground font-semibold" }}
                className="rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main
        className={`mx-auto w-full flex-1 px-6 ${
          isAdminScreen ? "admin-dense max-w-7xl py-6" : "max-w-5xl py-8"
        }`}
      >
        <Outlet />
      </main>
      <PathPrompt />
      <footer className="border-t border-border bg-surface/50">
        <div className="mx-auto w-full max-w-7xl px-6 py-4 text-xs text-muted-foreground">
          Biggers Market — internal tool
        </div>
      </footer>
    </div>
  );
}
