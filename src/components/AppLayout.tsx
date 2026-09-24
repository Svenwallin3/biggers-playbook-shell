import { useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { ViewAsBar } from "@/components/ViewAsBar";

type NavItem = { label: string; to: string };

const linkClass =
  "rounded-md px-2.5 py-1.5 transition-colors hover:bg-secondary/60 hover:text-foreground";
const activeClass = "bg-secondary text-secondary-foreground font-semibold";

export function AppLayout() {
  const { session, employee, tier, isManagerOrOwner, isOwner, isGeneralManager, signOut } =
    useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isAdminScreen = [
    "/admin",
    "/approvals",
    "/assign-training",
    "/compliance",
    "/delivery-issues",
    "/huddle-notes",
    "/merge-tool",
    "/suggest",
    "/team",
    "/training-queue",
  ].some((p) => pathname.startsWith(p));

  const [mobileOpen, setMobileOpen] = useState(false);

  const baseItems: NavItem[] = [
    { label: "Today", to: "/" },
    { label: "Search", to: "/search" },
    { label: "Reference Guides", to: "/reference" },
  ];

  const contentItems: NavItem[] = isManagerOrOwner
    ? [
        ...(isOwner || isGeneralManager ? [{ label: "Approvals", to: "/approvals" }] : []),
        { label: "Content", to: "/admin/content" },
        { label: "Preview Training", to: "/preview" },
        ...(isOwner ? [{ label: "Gaps", to: "/admin/gaps" }] : []),
      ]
    : [];

  const adminItems: NavItem[] = isOwner
    ? [
        { label: "Team", to: "/team" },
        { label: "Huddle & Notes", to: "/huddle-notes" },
        { label: "Delivery Issues", to: "/delivery-issues" },
        { label: "Compliance", to: "/compliance" },
        { label: "Assign Training", to: "/assign-training" },
        { label: "Locations & Paths", to: "/admin/locations-paths" },
        { label: "Merge", to: "/merge-tool" },

      ]
    : isGeneralManager
      ? [
          { label: "Team", to: "/team" },
          { label: "Huddle & Notes", to: "/huddle-notes" },
          { label: "Delivery Issues", to: "/delivery-issues" },
          { label: "Assign Training", to: "/assign-training" },
        ]
      : isManagerOrOwner
        ? [
            { label: "Huddle & Notes", to: "/huddle-notes" },
            { label: "Delivery Issues", to: "/delivery-issues" },
            { label: "Assign Training", to: "/assign-training" },
          ]
        : [];

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const groupActive = (items: NavItem[]) => items.some((i) => isActive(i.to));

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  const NavDropdown = ({ label, items }: { label: string; items: NavItem[] }) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex items-center gap-1 ${linkClass} ${groupActive(items) ? activeClass : ""}`}
      >
        {label}
        <ChevronDown className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link to={item.to} className={isActive(item.to) ? "font-semibold" : ""}>
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const MobileGroup = ({ label, items }: { label: string; items: NavItem[] }) =>
    items.length ? (
      <div className="space-y-0.5">
        <p className="px-2.5 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={`block ${linkClass} ${isActive(item.to) ? activeClass : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    ) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ViewAsBar />
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
        <div
          className={`mx-auto flex min-h-14 w-full flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 ${
            isAdminScreen ? "max-w-7xl" : "max-w-5xl"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto">
                <SheetTitle className="px-2.5 font-display text-base">Biggers Training</SheetTitle>
                <nav className="mt-2 flex flex-col px-2 pb-6 text-sm text-muted-foreground">
                  {baseItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`block ${linkClass} ${isActive(item.to) ? activeClass : ""}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  {isManagerOrOwner ? (
                    <Link
                      to="/training-queue"
                      onClick={() => setMobileOpen(false)}
                      className={`block ${linkClass} ${
                        isActive("/training-queue") ? activeClass : ""
                      }`}
                    >
                      Training Queue
                    </Link>
                  ) : null}
                  <MobileGroup label="Content" items={contentItems} />
                  <MobileGroup label="Admin" items={adminItems} />
                  <div className="mt-4 border-t border-border pt-3">
                    {session ? (
                      <>
                        <p className="px-2.5 text-xs text-muted-foreground">
                          {employee?.full_name ?? session.user.email}
                          {tier ? ` · ${tier}` : ""}
                        </p>
                        <Link
                          to="/me"
                          onClick={() => setMobileOpen(false)}
                          className={`mt-1 block ${linkClass} ${isActive("/me") ? activeClass : ""}`}
                        >
                          Me
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            setMobileOpen(false);
                            await handleSignOut();
                          }}
                          className={`mt-1 block w-full text-left ${linkClass}`}
                        >
                          Sign out
                        </button>
                      </>
                    ) : (
                      <Link
                        to="/login"
                        onClick={() => setMobileOpen(false)}
                        className={`block ${linkClass}`}
                      >
                        Sign in
                      </Link>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
            <Link to="/" className="flex min-w-0 items-center gap-2">
            <span
              className="flex size-7 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground"
              aria-hidden
            >
              B
            </span>
              <span className="truncate font-display text-[15px] font-semibold tracking-tight">
                Biggers Training
              </span>
            </Link>
          </div>
          <nav className="hidden flex-wrap items-center gap-1 text-sm text-muted-foreground md:flex">
            {baseItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`${linkClass} ${isActive(item.to) ? activeClass : ""}`}
              >
                {item.label}
              </Link>
            ))}
            {isManagerOrOwner ? (
              <Link
                to="/training-queue"
                className={`${linkClass} ${isActive("/training-queue") ? activeClass : ""}`}
              >
                Training Queue
              </Link>
            ) : null}
            {contentItems.length ? <NavDropdown label="Content" items={contentItems} /> : null}
            {adminItems.length ? <NavDropdown label="Admin" items={adminItems} /> : null}
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger className={`flex items-center gap-1 ${linkClass}`}>
                  <span className="max-w-40 truncate text-xs">
                    {employee?.full_name ?? session.user.email}
                    {tier ? ` · ${tier}` : ""}
                  </span>
                  <ChevronDown className="size-3.5" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/me" className={isActive("/me") ? "font-semibold" : ""}>
                      Me
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void handleSignOut()}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                activeProps={{ className: "text-foreground font-semibold" }}
                className={linkClass}
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      {!session ? (
        <div className="border-b border-warning/40 bg-warning-soft/60">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-4 py-2 text-xs sm:px-6">
            <span className="font-semibold">You&apos;re signed out.</span>
            <span className="text-muted-foreground">
              Checklists, SOPs, sourcing, and everything owner-only stay hidden until you sign in —
              that&apos;s why these lists look empty.
            </span>
            <Link to="/login" className="font-semibold underline underline-offset-2">
              Sign in
            </Link>
          </div>
        </div>
      ) : null}
      <main
        className={`mx-auto w-full min-w-0 flex-1 px-4 sm:px-6 ${
          isAdminScreen ? "admin-dense max-w-7xl py-5 sm:py-6" : "max-w-5xl py-6 sm:py-8"
        }`}
      >
        <Outlet />
      </main>
      <footer className="border-t border-border bg-surface/50">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          Biggers Market — internal tool
        </div>
      </footer>
    </div>
  );
}
