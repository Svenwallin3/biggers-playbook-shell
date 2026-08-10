import { trackTheme } from "@/lib/track-theme";

type ModuleHeaderProps = {
  trackName: string | null | undefined;
  subPath?: string | null;
  dayAssignment?: number | null;
  name: string;
  description?: string | null;
  as?: "h1" | "h2";
};

/** Shared module header: context line, title, and description callout. */
export function ModuleHeader({
  trackName,
  subPath,
  dayAssignment,
  name,
  description,
  as = "h1",
}: ModuleHeaderProps) {
  const Heading = as;
  const theme = trackTheme(trackName);
  const titleClass =
    as === "h1"
      ? "font-display text-2xl font-semibold tracking-tight sm:text-3xl"
      : "font-display text-2xl font-semibold tracking-tight";

  return (
    <>
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${theme.label}`}
      >
        {trackName}
        {subPath ? ` · ${subPath}` : ""}
        {dayAssignment ? ` · Day ${dayAssignment}` : ""}
      </p>
      <Heading className={titleClass}>{name}</Heading>
      {description ? (
        <p className="mt-4 rounded-lg border border-accent/35 bg-accent/8 px-5 py-4 font-display text-lg font-semibold leading-snug tracking-tight text-foreground">
          {description}
        </p>
      ) : null}
    </>
  );
}
