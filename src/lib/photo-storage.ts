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

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
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
      return signedPhotoUrl(path);
    },
  });
}