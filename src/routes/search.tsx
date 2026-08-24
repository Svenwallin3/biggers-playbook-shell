import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { searchQueryOptions, stepTypeLabels } from "@/lib/training.queries";
import { sharedLabel } from "@/lib/reference.queries";

const title = "Search training — Biggers Training Platform";
const description = "Search every module, step, and sourcing entry at Biggers Market.";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [term, setTerm] = useState("");
  const { isManagerOrOwner } = useAuth();
  // Managers/owners browsing search are looking at content, not doing training.
  const previewSearch = isManagerOrOwner ? { preview: true as const } : {};
  const query = useQuery(searchQueryOptions(term));
  const results = query.data;
  const count =
    (results?.modules.length ?? 0) +
    (results?.steps.length ?? 0) +
    (results?.sourcing.length ?? 0) +
    (results?.referenceDocs.length ?? 0) +
    (results?.presentation.length ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modules, steps, and the Sourcing Board — all at once.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Try “tomatoes”, “temperature”, “cashier”…"
          className="h-12 pl-9 text-base"
        />
      </div>

      {term.trim().length < 2 ? (
        <p className="text-sm text-muted-foreground">Type at least two characters to search.</p>
      ) : query.isPending ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Search failed. Try again.</p>
      ) : count === 0 ? (
        <p className="text-sm text-muted-foreground">No matches for “{term}”.</p>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {count} result{count === 1 ? "" : "s"}
          </p>

          {results?.modules.length ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Modules
              </h2>
              {results.modules.map((mod) => (
                <Card key={mod.id}>
                  <CardContent className="py-4">
                    <Link
                      to="/modules/$moduleId"
                      params={{ moduleId: mod.id }}
                      search={{ step: undefined, ...previewSearch }}
                      className="text-sm font-medium hover:underline"
                    >
                      {mod.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {mod.track?.name}
                      {mod.path ? ` · ${mod.path}` : ""}
                    </p>
                    {mod.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}

          {results?.steps.length ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Steps
              </h2>
              {results.steps.map((step) => (
                <Card key={step.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/modules/$moduleId"
                        params={{ moduleId: step.module_id }}
                        search={{ step: step.id, ...previewSearch }}
                        className="text-sm font-medium hover:underline"
                      >
                        {step.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {stepTypeLabels[step.step_type]}
                      </span>
                      <StepStatusBadge status={step.content_status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{step.module?.name}</p>
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}

          {results?.sourcing.length ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Sourcing Board
              </h2>
              {results.sourcing.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="py-4">
                    <Link to="/reference/sourcing" className="text-sm font-medium hover:underline">
                      {entry.product}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[entry.supplier, entry.region].filter(Boolean).join(" · ")}
                    </p>
                    {entry.notes ? (
                      <p className="mt-1 text-sm text-muted-foreground">{entry.notes}</p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}

          {results?.referenceDocs.length ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Reference Library
              </h2>
              {results.referenceDocs.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={doc.document_type === "checklist" ? "/reference/checklists" : "/reference/sops"}
                        className="text-sm font-medium hover:underline"
                      >
                        {doc.title}
                      </Link>
                      <StepStatusBadge status={doc.content_status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[
                        doc.document_type === "checklist" ? "Checklist" : "SOP",
                        doc.sub_category,
                        sharedLabel(doc.departments),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}

          {results?.presentation.length ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Portioning &amp; Presentation
              </h2>
              {results.presentation.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="py-4">
                    <Link to="/reference/presentation" className="text-sm font-medium hover:underline">
                      {entry.item_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{entry.category}</p>
                    {entry.portion_note ? (
                      <p className="mt-1 text-sm text-muted-foreground">{entry.portion_note}</p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
