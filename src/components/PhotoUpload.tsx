import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { removePhoto, uploadPhoto, usePhotoUrl } from "@/lib/photo-storage";

export type PhotoUploadProps = {
  /** Stored object path (or null when there's no photo yet). */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Storage folder for this context, e.g. "sourcing" or "delivery-issues". */
  folder: string;
  label?: string;
  helpText?: string;
  disabled?: boolean;
  className?: string;
};

const MAX_BYTES = 8 * 1024 * 1024;

export function PhotoUpload({
  value,
  onChange,
  folder,
  label = "Photo (optional)",
  helpText,
  disabled,
  className,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = usePhotoUrl(value);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That image is over 8 MB — try a smaller photo.");
      return;
    }
    setBusy(true);
    try {
      const previousPath = value;
      const path = await uploadPhoto(file, folder);
      onChange(path);
      if (previousPath && !/^https?:\/\//.test(previousPath)) void removePhoto(previousPath);
    } catch (error) {
      toast.error("Couldn't upload that photo", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {value ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="size-20 shrink-0 overflow-hidden rounded-md border bg-muted">
            {preview.data ? (
              <img
                src={preview.data}
                alt="Uploaded photo preview"
                className="size-full object-cover"
                loading="lazy"
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || busy}
              onClick={() => {
                if (value && !/^https?:\/\//.test(value)) void removePhoto(value);
                onChange(null);
              }}
            >
              <X className="mr-1.5 size-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-20 w-full justify-center border-dashed"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 size-4" />
          )}
          {busy ? "Uploading…" : "Add a photo"}
        </Button>
      )}

      {helpText ? <p className="text-xs text-muted-foreground">{helpText}</p> : null}
    </div>
  );
}

/** Read-only renderer for a stored photo path. */
export function StoredPhoto({
  path,
  alt,
  className,
}: {
  path: string | null;
  alt: string;
  className?: string;
}) {
  const url = usePhotoUrl(path);
  if (!path || !url.data) return null;
  return (
    <img
      src={url.data}
      alt={alt}
      loading="lazy"
      className={cn("w-full rounded-md border object-cover", className)}
    />
  );
}