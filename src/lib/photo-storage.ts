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

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const prepared = await compressImage(file);
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