import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent } from "@/components/ui/card";
import { sourcingBoard } from "@/data/mockTraining";

const title = "Sourcing Board — Biggers Training Platform";
const description = "Where Biggers Market ingredients and products come from.";

export const Route = createFileRoute("/sourcing-board")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SourcingBoardPage,
});

function SourcingBoardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sourcing Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who we buy from, so you can answer a guest without guessing.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sourcingBoard.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="space-y-1 py-5">
              <p className="text-sm font-medium">{entry.item}</p>
              <p className="text-sm text-muted-foreground">{entry.supplier}</p>
              <p className="text-xs text-muted-foreground">{entry.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}