import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Shared photo storage helpers. The `reference-photos` bucket is private, so a
 * stored value is an object PATH (e.g. "sourcing/uuid.jpg"), and display URLs
 * are signed on demand. Generic on purpose — pass a `folder` per feature
 * (sourcing, presentation, delivery-issues, …).
 */
export const PHOTO_BUCKET = "reference-photos";

const SIGNED_URL_TTL = 60 * 60; // 1 hour

/** Long-edge cap and JPEG quality for browser-side compression. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

/**
 * Downscale (never upscale) to a 1600px long edge and re-encode as JPEG.
 * Returns the original file untouched if anything about the canvas path fails —
 * a bigger upload beats a failed one.
 */
export async function compressImage(file: File): Promise<File> {
  if (typeof document === "undefined" || !file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  let url: string | null = null;
  try {
    url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url!;
    });

    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    if (!longEdge) return file;
    const scale = Math.min(1, MAX_EDGE / longEdge);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || !blob.size) return file;
    // Only take the compressed version if it actually helps.
    if (scale === 1 && blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

/** Thrown when an iPhone HEIC photo can't be turned into a JPEG we can display. */
export class HeicConversionError extends Error {
  constructor() {
    super("Couldn't convert this photo — try saving it as a JPEG first, then upload again.");
    this.name = "HeicConversionError";
  }
}

function looksHeic(file: File) {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.type === "image/heic-sequence" ||
    file.type === "image/heif-sequence" ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

function asJpegFile(blob: Blob, originalName: string) {
  const name = originalName.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

/**
 * Safari/WebKit can decode HEIC natively — much faster and far more reliable
 * than the JS decoder. Returns null anywhere else (Chrome/Firefox/Edge).
 */
async function nativeHeicToJpeg(file: File): Promise<File | null> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return null;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || !blob.size) return null;
    return asJpegFile(blob, file.name);
  } catch {
    return null;
  }
}

/**
 * iPhone HEIC/HEIF → JPEG, client-side. Never returns an unconverted HEIC:
 * an unusable upload that renders as a broken image everywhere is worse than a
 * clear error, so a failure throws HeicConversionError for the caller to show.
 */
async function convertHeicIfNeeded(file: File): Promise<File> {
  if (!looksHeic(file)) return file;

  const native = await nativeHeicToJpeg(file);
  if (native) return native;

  try {
    // Dynamic so the decoder is only downloaded by HEIC uploaders. heic-to
    // wraps a current libheif/libde265 build, which (unlike heic2any's older
    // bundle) reconstructs the grid-tiled primary image modern iPhones write
    // alongside HDR gain map / style / sky-matte auxiliary images.
    const { heicTo } = await import("heic-to");
    const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.85 });
    if (!blob || !blob.size) throw new Error("heic-to returned an empty image");
    return asJpegFile(blob, file.name);
  } catch (error) {
    console.error("HEIC conversion failed:", error);
    throw new HeicConversionError();
  }
}


export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const converted = await convertHeicIfNeeded(file);
  const prepared = await compressImage(converted);
  // Last line of defence: never store a HEIC — it can't render outside Safari.
  if (looksHeic(prepared)) throw new HeicConversionError();
  const ext = prepared.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, prepared, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return path;
}


export async function removePhoto(path: string) {
  // Best-effort cleanup; a dangling object is harmless.
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Resolves a stored photo path (or a plain http URL) to something renderable. */
export function usePhotoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["photo-url", path],
    enabled: Boolean(path),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!path) return null;
      if (/^https?:\/\//.test(path)) return path;
      // Root-relative app/CDN assets (e.g. /__l5e/assets-v1/…) are served from
      // this origin — pass them straight through instead of signing them.
      if (path.startsWith("/")) return path;
      return signedPhotoUrl(path);
    },
  });
}