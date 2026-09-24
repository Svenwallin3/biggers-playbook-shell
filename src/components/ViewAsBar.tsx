import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, type ViewAs } from "@/hooks/useAuth";

const divisions = [
  { value: "market", label: "Market" },
  { value: "kitchen", label: "Kitchen" },
  { value: "delivery", label: "Delivery" },
] as const;

const roles: { label: string; tier: ViewAs["tier"]; canManageTeam: boolean }[] = [
  { label: "General Manager", tier: "manager", canManageTeam: true },
  { label: "Manager", tier: "manager", canManageTeam: false },
  { label: "Staff", tier: "staff", canManageTeam: false },
];

function describe(v: ViewAs) {
  const role = v.tier === "staff" ? "Staff" : v.canManageTeam ? "General Manager" : "Manager";
  const div = divisions.find((d) => d.value === v.divisionScope)?.label ?? "no division";
  return `${role}, ${div}`;
}

/** Owner-only "View as" control + banner. Display-only; the database still sees the Owner. */
export function ViewAsBar() {
  const { realIsOwner, viewAs, setViewAs } = useAuth();
  if (!realIsOwner) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 text-xs ${
        viewAs ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
      }`}
    >
      {viewAs ? (
        <span className="font-semibold">
          Viewing as {describe(viewAs)}. Saves still use your Owner rights.
        </span>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            <Eye className="size-3.5" aria-hidden="true" />
            View as
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56">
          <DropdownMenuItem onSelect={() => setViewAs(null)}>Owner (normal)</DropdownMenuItem>
          {roles.map((r) => (
            <div key={r.label}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">{r.label}</DropdownMenuLabel>
              {divisions.map((d) => (
                <DropdownMenuItem
                  key={d.value}
                  className="pl-5"
                  onSelect={() =>
                    setViewAs({
                      tier: r.tier,
                      canManageTeam: r.canManageTeam,
                      divisionScope: d.value,
                    })
                  }
                >
                  {d.label}
                </DropdownMenuItem>
              ))}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {viewAs ? (
        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setViewAs(null)}>
          Switch back
        </Button>
      ) : null}
    </div>
  );
}
