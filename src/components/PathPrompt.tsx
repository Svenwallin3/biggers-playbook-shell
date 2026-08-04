import { useState } from "react";
import { ShoppingBasket, UtensilsCrossed } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const options = [
  { label: "Markets", path: "market", icon: ShoppingBasket },
  { label: "Kitchen", path: "kitchen", icon: UtensilsCrossed },
] as const;

export function PathPrompt() {
  const { employee, refreshEmployee } = useAuth();
  const [busy, setBusy] = useState(false);

  // Only floor staff must pick a track — managers/owners can leave path null.
  const open = Boolean(employee && !employee.path && employee.auth_tier === "staff");

  async function choose(path: "market" | "kitchen") {
    if (!employee) return;
    setBusy(true);
    await supabase
      .from("employees")
      .update({ path, department_scope: path })
      .eq("id", employee.id);
    await refreshEmployee();
    setBusy(false);
  }

  return (
    <Dialog open={open}>
      <DialogContent className="[&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Which side are you training on?</DialogTitle>
          <DialogDescription>
            This sets your training path. A manager can change it later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              type="button"
              disabled={busy}
              onClick={() => void choose(path)}
              className="flex flex-col items-center gap-2 rounded-lg border border-border px-4 py-6 text-sm font-medium transition-colors hover:border-primary hover:bg-accent disabled:opacity-60"
            >
              <Icon className="size-6 text-primary" />
              {label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
