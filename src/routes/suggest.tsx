import { createFileRoute, redirect } from "@tanstack/react-router";

// The old Suggest page is replaced by the "Suggest a change" button on each step.
export const Route = createFileRoute("/suggest")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
