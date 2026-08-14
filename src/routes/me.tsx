import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { MascotImage } from "@/components/brand/MascotImage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { onboardingCompletionQueryOptions } from "@/lib/queue.queries";
import { planQueryOptions, type PlanModule } from "@/lib/training.queries";
import { trackTheme } from "@/lib/track-theme";

const title = "Me — Biggers Training Platform";
const description =
  "Your own training record at Biggers Market: what you've completed, what's left, and anything assigned to you.";

export const Route = createFileRoute("/me")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MePage,
});

function tierLabel(tier: string | null, canManageTeam: boolean | null) {
  if (tier === "manager" && canManageTeam) return "general manager";
  return tier ?? "—";
}

function MePage() {
  const { employee, loading, session } = useAuth();

  const planQuery = useQuery({
    ...planQueryOptions(employee?.department_scope ?? null, employee?.sub_path ?? null, false),
    enabled: !!employee?.department_scope,
  });
  const onboardingQuery = useQuery({
    ...onboardingCompletionQueryOptions(),
    enabled: !!employee,
  });
  const progressQuery = useQuery({
    queryKey: ["my-progress", employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_records")
        .select("step_id, status")
        .eq("employee_id", employee!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const assignmentsQuery = useQuery({
    queryKey: ["my-assignments", employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignable_module_assignments")
        .select("id, due_date, module:modules(id, name)")
        .eq("employee_id", employee!.id)
        .eq("is_deleted", false)
        .order("due_date", { nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const doneStepIds = useMemo(
    () =>
      new Set(
        (progressQuery.data ?? [])
          .filter((r) => r.status === "completed" || r.status === "signed_off")
          .map((r) => r.step_id),
      ),
    [progressQuery.data],
  );

  const grouped = useMemo(() => {
    const byTrack = new Map<string, { name: string; modules: PlanModule[] }>();
    for (const mod of planQuery.data ?? []) {
      if (mod.is_assignable) continue;
      const existing = byTrack.get(mod.track.id);
      if (existing) existing.modules.push(mod);
      else byTrack.set(mod.track.id, { name: mod.track.name, modules: [mod] });
    }
    return [...byTrack.values()];
  }, [planQuery.data]);

  const assignedSteps = useMemo(() => {
    const byModule = new Map<string, PlanModule>();
    for (const mod of planQuery.data ?? []) byModule.set(mod.id, mod);
    return byModule;
  }, [planQuery.data]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!session || !employee) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          Sign in
        </Link>{" "}
        to see your training record.
      </p>
    );
  }

  const onboarding = onboardingQuery.data?.[employee.id];
  const assignments = assignmentsQuery.data ?? [];

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
          <UserRound className="size-5 text-primary" />
          {employee.full_name ?? employee.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tierLabel(employee.auth_tier, employee.can_manage_team)}
          {employee.path ? ` · ${employee.path} path` : ""}
          {employee.department_scope ? ` · ${employee.department_scope}` : ""}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-sm text-muted-foreground">Onboarding:</span>
          {!employee.path || !onboarding || onboarding.total === 0 ? (
            <span className="text-sm text-muted-foreground">—</span>
          ) : onboarding.completed >= onboarding.total ? (
            <>
              <Badge variant="secondary">Complete</Badge>
              <MascotImage path="mascot/milestone.png" alt="" className="h-16 sm:h-20" />
            </>
          ) : (
            <Badge variant="outline">
              {onboarding.completed}/{onboarding.total}
            </Badge>
          )}
        </div>
      </div>

      {!employee.path ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your training path hasn&apos;t been set yet — ask your manager.
          </CardContent>
        </Card>
      ) : (
        <>
          {planQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading your training…</p>
          ) : null}
          {planQuery.isError ? (
            <p className="text-sm text-destructive">Couldn&apos;t load your training.</p>
          ) : null}

          {grouped.map((track) => {
            const theme = trackTheme(track.name);
            return (
              <section key={track.name} className="space-y-2">
                <h2
                  className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${theme.label}`}
                >
                  <span
                    className={`inline-block h-3 w-1.5 rounded-full ${theme.rail}`}
                    aria-hidden
                  />
                  {track.name}
                </h2>
                <Card className="relative overflow-hidden pl-1.5">
                  <span className={`absolute inset-y-0 left-0 w-1.5 ${theme.rail}`} aria-hidden />
                  <CardContent className="space-y-4 px-4 py-4 sm:px-5">
                    {track.modules.map((mod) => {
                      const done = mod.steps.filter((s) => doneStepIds.has(s.id)).length;
                      return (
                        <div key={mod.id} className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-display text-sm font-semibold">{mod.name}</p>
                            <span className="text-xs text-muted-foreground">
                              {done}/{mod.steps.length} done
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {mod.steps.map((step) => {
                              const isDone = doneStepIds.has(step.id);
                              return (
                                <li
                                  key={step.id}
                                  className="flex items-start gap-2 text-sm text-muted-foreground"
                                >
                                  {isDone ? (
                                    <CheckCircle2
                                      className="mt-0.5 size-4 shrink-0 text-success"
                                      aria-hidden
                                    />
                                  ) : (
                                    <Circle className="mt-0.5 size-4 shrink-0" aria-hidden />
                                  )}
                                  <span
                                    className={`min-w-0 flex-1 ${isDone ? "text-foreground" : ""}`}
                                  >
                                    {step.title}
                                  </span>
                                  <StepStatusBadge status={step.content_status} />
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </>
      )}

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Assigned to you
        </h2>
        <Card>
          <CardContent className="px-4 py-4 sm:px-5">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No additional assignments.</p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((a) => {
                  const mod = assignedSteps.get(a.module?.id ?? "");
                  const steps = mod?.steps ?? [];
                  const done = steps.filter((s) => doneStepIds.has(s.id)).length;
                  const complete = steps.length > 0 && done >= steps.length;
                  return (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{a.module?.name ?? "Module"}</span>
                        {a.due_date ? (
                          <span className="block text-xs text-muted-foreground">
                            Due {new Date(a.due_date).toLocaleDateString()}
                          </span>
                        ) : null}
                      </span>
                      {complete ? (
                        <Badge variant="secondary">Complete</Badge>
                      ) : (
                        <Badge variant="outline">
                          {done}/{steps.length}
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
