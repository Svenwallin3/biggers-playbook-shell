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
    <div className="relative overflow-hidden rounded-md border border-border bg-muted/40 px-3 py-2.5 sm:px-4 sm:py-3">
      <span className={`absolute inset-y-0 left-0 w-1 ${theme.rail}`} aria-hidden />
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">
        Read this first
      </p>
      <p className="mt-1 text-sm font-medium leading-snug text-foreground sm:text-[15px]">
        {renderFormattedText(description)}
      </p>
    </div>
  );
}
