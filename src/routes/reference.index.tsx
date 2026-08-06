import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/reference/")({
  beforeLoad: () => {
    throw redirect({ to: "/reference/sourcing", replace: true });
  },
});
