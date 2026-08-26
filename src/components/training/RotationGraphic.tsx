import { ArrowLeft } from "lucide-react";

/**
 * Reusable stock-rotation (First In, First Out) graphic.
 * Rendered from a `stock_rotation` step block — nothing to configure.
 */
export function RotationGraphic() {
  return (
    <figure className="w-full space-y-2 rounded-lg border border-border bg-surface/60 p-3 sm:p-4">
      <figcaption className="font-display text-sm font-semibold">
        Stock rotation — oldest to the front
      </figcaption>

      <div
        className="flex w-full items-stretch overflow-hidden rounded-md"
        role="img"
        aria-label="Stock rotation: older stock moves to the front, new stock goes behind it, so the oldest product sells or gets used first."
      >
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center bg-primary px-1 py-3 text-center leading-tight text-primary-foreground">
          <span className="text-[10px] font-bold uppercase tracking-wide sm:text-xs">
            Older stock
          </span>
          <span className="text-[9px] opacity-85 sm:text-[11px]">Move to the front</span>
        </div>

        <div className="flex shrink-0 items-center justify-center bg-surface px-1.5 text-muted-foreground sm:px-2">
          <ArrowLeft className="size-4" aria-hidden="true" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center justify-center bg-muted px-1 py-3 text-center leading-tight text-muted-foreground">
          <span className="text-[10px] font-bold uppercase tracking-wide sm:text-xs">
            New stock
          </span>
          <span className="text-[9px] opacity-90 sm:text-[11px]">Goes to the back</span>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        First in, first out. Always move older product to the front and place new stock behind it,
        so the oldest sells or gets used first.
      </p>
    </figure>
  );
}
