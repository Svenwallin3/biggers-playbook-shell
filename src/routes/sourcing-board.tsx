import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sourcing-board")({
  beforeLoad: () => {
    throw redirect({ to: "/reference/sourcing", replace: true });
  },
});
