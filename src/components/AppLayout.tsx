import { Link, Outlet } from "@tanstack/react-router";

const navItems = [{ label: "Home", to: "/" as const }];

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-tight">
            Biggers Training Platform
          </span>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "text-foreground font-medium" }}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          Biggers Market — internal tool
        </div>
      </footer>
    </div>
  );
}