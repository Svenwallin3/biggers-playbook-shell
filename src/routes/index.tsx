import { createFileRoute } from "@tanstack/react-router";

const title = "Home — Biggers Training Platform";
const description =
  "Internal training platform for Biggers Market staff. Scaffold in progress.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
      <p className="text-sm text-muted-foreground">
        Blank shell — screens come in later stages.
      </p>
    </section>
  );
}
