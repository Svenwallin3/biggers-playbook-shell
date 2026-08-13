import { trackTheme } from "@/lib/track-theme";
import { renderFormattedText } from "@/lib/richText";

/** Shared "Read this first" module theme callout (trainee route + preview). */
export function ModuleThemeCard({
  description,
  trackName,
}: {
  description: string | null | undefined;
  trackName: string | null | undefined;
}) {
  if (!description) return null;
  const theme = trackTheme(trackName);
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-accent/50 bg-accent/10 px-4 py-3 sm:px-7 sm:py-6">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${theme.rail}`} aria-hidden />
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-foreground/70 sm:text-[11px]">
        Read this first
      </p>
      <p className="mt-1.5 font-display text-base font-semibold leading-snug tracking-tight text-foreground sm:mt-2 sm:text-2xl">
        {renderFormattedText(description)}
      </p>
    </div>
  );
}
