/**
 * Reusable food-safety temperature graphic.
 * Rendered from content_body via the `[[danger-zone]]` marker line.
 */
export function DangerZoneGraphic() {
  return (
    <figure className="w-full space-y-2 rounded-lg border border-border bg-surface/60 p-3 sm:p-4">
      <figcaption className="font-display text-sm font-semibold">
        Temperature danger zone
      </figcaption>

      <div className="flex w-full overflow-hidden rounded-md" role="img" aria-label="Temperature danger zone: safe cold at or below 41 degrees Fahrenheit, danger zone between 41 and 135 degrees Fahrenheit, safe hot at or above 135 degrees Fahrenheit.">
        <div className="flex min-w-0 flex-[1] items-center justify-center bg-success px-1 py-3 text-center text-[10px] font-semibold leading-tight text-success-foreground sm:text-xs">
          Safe cold
        </div>
        <div className="flex min-w-0 flex-[2.4] items-center justify-center bg-destructive px-1 py-3 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-destructive-foreground sm:text-xs">
          Danger zone
        </div>
        <div className="flex min-w-0 flex-[1] items-center justify-center bg-success px-1 py-3 text-center text-[10px] font-semibold leading-tight text-success-foreground sm:text-xs">
          Safe hot
        </div>
      </div>

      <div className="flex w-full text-[10px] font-medium text-muted-foreground sm:text-xs">
        <span className="flex-[1] text-center">≤ 41°F</span>
        <span className="flex-[2.4] text-center text-destructive">41°F – 135°F</span>
        <span className="flex-[1] text-center">≥ 135°F</span>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Food held between 41°F and 135°F is in the danger zone — bacteria grow fastest here.
      </p>
    </figure>
  );
}
