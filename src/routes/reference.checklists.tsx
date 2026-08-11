import { createFileRoute } from "@tanstack/react-router";

import { ReferenceDocumentsScreen } from "@/components/reference/ReferenceDocumentsScreen";

const title = "Checklists — Biggers Training Platform";
const description =
  "Opening, closing, cleaning, and station-readiness checklists for your department at Biggers Market.";

export const Route = createFileRoute("/reference/checklists")({
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
      documentType="checklist"
      heading="Checklists"
      blurb="Run-the-shift checklists, grouped by what they're for."
      subCategoryFilter={{ exclude: ["Manager Walkthrough Guides"] }}
    />
  ),
});
