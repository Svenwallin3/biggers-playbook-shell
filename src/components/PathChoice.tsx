import { useState, type ComponentType } from "react";
import { Building2, MapPin, ShoppingBasket, UtensilsCrossed } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Option<T extends string> = {
  label: string;
  value: T;
  icon: ComponentType<{ className?: string }>;
};

function ChoiceScreen<T extends string>({
  heading,
  blurb,
  options,
  onChoose,
}: {
  heading: string;
  blurb: string;
  options: readonly Option<T>[];
  onChoose: (value: T) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function pick(value: T) {
    setBusy(true);
    try {
      await onChoose(value);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6 py-10 text-center">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map(({ label, value, icon: Icon }) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            onClick={() => void pick(value)}
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-base font-medium shadow-xs transition-colors hover:border-primary hover:bg-accent disabled:opacity-60"
          >
            <Icon className="size-8 text-primary" />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

const pathOptions = [
  { label: "Kitchen", value: "kitchen", icon: UtensilsCrossed },
  { label: "Markets", value: "market", icon: ShoppingBasket },
] as const;

const locationOptions = [
  { label: "Market Street", value: "market_street", icon: Building2 },
  { label: "Carolina Beach Road", value: "carolina_beach_road", icon: MapPin },
] as const;

/** Full-page department pick, shown once Hospitality is finished. */
export function PathChoice() {
  const { employee, refreshEmployee } = useAuth();
  return (
    <ChoiceScreen
      heading="Please pick which location you are working at"
      blurb="This sets your training path. A manager can change it later."
      options={pathOptions}
      onChoose={async (path) => {
        if (!employee) return;
        await supabase
          .from("employees")
          .update({ path, department_scope: path })
          .eq("id", employee.id);
        await refreshEmployee();
      }}
    />
  );
}

/** Full-page site pick — Market only, since Kitchen and Delivery are single-site. */
export function LocationChoice() {
  const { employee, refreshEmployee } = useAuth();
  return (
    <ChoiceScreen
      heading="Which location do you work at?"
      blurb="Your manager and sign-offs are based at this store."
      options={locationOptions}
      onChoose={async (location_id) => {
        if (!employee) return;
        await supabase.from("employees").update({ location_id }).eq("id", employee.id);
        await refreshEmployee();
      }}
    />
  );
}