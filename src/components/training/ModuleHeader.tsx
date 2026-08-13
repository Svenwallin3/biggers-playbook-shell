import { trackTheme } from "@/lib/track-theme";
import { renderFormattedText } from "@/lib/richText";

type ModuleHeaderProps = {
  trackName: string | null | undefined;
  subPath?: string | null;
  dayAssignment?: number | null;
  name: string;
  description?: string | null;
  as?: "h1" | "h2";
  /**
   * "compact" renders the module as a quiet context line so the step title
   * below it is the single dominant heading on the screen.
   */
  variant?: "hero" | "compact";
};

/** Shared module header: context line, title, and description callout. */
export function ModuleHeader({
  trackName,
  subPath,
  dayAssignment,
  name,
  description,
  as = "h1",
  variant = "hero",
}: ModuleHeaderProps) {
  const Heading = as;
  const theme = trackTheme(trackName);
  const titleClass =
    as === "h1"
      ? "font-display text-2xl font-semibold tracking-tight sm:text-3xl"
      : "font-display text-2xl font-semibold tracking-tight";

  if (variant === "compact") {
    return (
      <div className="flex items-start gap-2.5">
        <span className={`mt-1 h-8 w-1.5 shrink-0 rounded-full ${theme.rail}`} aria-hidden />
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${theme.label}`}>
            {trackName}
            {subPath ? ` · ${subPath}` : ""}
            {dayAssignment ? ` · Day ${dayAssignment}` : ""}
          </p>
          <Heading className="font-display text-base font-semibold tracking-tight text-muted-foreground">
            {name}
          </Heading>
        </div>
      </div>
    );
  }

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
          {renderFormattedText(description)}
        </p>
      ) : null}
    </>
  );
}
