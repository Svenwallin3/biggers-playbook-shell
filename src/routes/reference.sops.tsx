import { createFileRoute } from "@tanstack/react-router";

import { ReferenceDocumentsScreen } from "@/components/reference/ReferenceDocumentsScreen";

const title = "Standard Operating Procedures — Biggers Training Platform";
const description =
  "Written standard operating procedures (SOPs) for Kitchen, Market, and shared work at Biggers Market.";

export const Route = createFileRoute("/reference/sops")({
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
  component: () => (
    <ReferenceDocumentsScreen
      documentType="sop"
      heading="SOPs"
      blurb="Standard Operating Procedures (SOPs) — the written way we do it."
    />
  ),
});
