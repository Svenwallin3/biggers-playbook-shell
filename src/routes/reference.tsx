import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

const tabs = [
  { label: "Sourcing Board", to: "/reference/sourcing" as const },
  { label: "Checklists", to: "/reference/checklists" as const },
  { label: "SOPs", to: "/reference/sops" as const },
  { label: "Portioning & Presentation", to: "/reference/presentation" as const },
];

export const Route = createFileRoute("/reference")({
  component: ReferenceLayout,
});

function ReferenceLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Reference Guides</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sourcing, checklists, standard operating procedures, and plate-up standards.
        </p>
        <nav className="mt-4 flex flex-wrap items-center gap-1 border-b border-border pb-3 text-sm text-muted-foreground">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              activeProps={{ className: "bg-secondary text-secondary-foreground font-semibold" }}
              className="rounded-md px-2.5 py-1.5 text-[13px] transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
