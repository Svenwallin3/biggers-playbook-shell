import { createFileRoute } from "@tanstack/react-router";

import { ReferenceDocumentsScreen } from "@/components/reference/ReferenceDocumentsScreen";

const title = "Manager Guides — Biggers Training Platform";
const description =
  "Trainer scripts for running new hire walkthroughs, role-plays, and sign-offs at Biggers Market.";

export const Route = createFileRoute("/reference/manager-guides")({
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
      heading="Manager Guides"
      blurb="Trainer scripts for running walkthroughs, role-plays, and sign-offs. Not day-to-day staff reference."
      subCategoryFilter={{ include: ["Manager Walkthrough Guides"] }}
    />
  ),
});