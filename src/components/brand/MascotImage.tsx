import { useState } from "react";

import { useBrandAsset } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

/**
 * Renders a mascot image from the `brand-assets` bucket, or nothing at all when
 * the object does not exist yet. No placeholder, no broken-image icon.
 */
export function MascotImage({
  path,
  alt,
  className,
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  const { url } = useBrandAsset(path);
  const [failed, setFailed] = useState(false);

  if (!url || failed) return null;

  return (
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn("h-24 w-auto shrink-0 object-contain sm:h-32", className)}
    />
  );
}
