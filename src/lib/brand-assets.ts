import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Brand artwork (mascot, etc.) lives in the private `brand-assets` bucket and is
 * uploaded straight through the Supabase dashboard — the app only reads it.
 * A missing object is a normal state: the hook returns url: null and callers
 * render nothing.
 */
export const BRAND_BUCKET = "brand-assets";

const SIGNED_URL_TTL = 60 * 60; // 1 hour

export function useBrandAsset(path: string): { url: string | null; loading: boolean } {
  const query = useQuery({
    queryKey: ["brand-asset", path],
    enabled: Boolean(path),
    retry: false,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.storage
          .from(BRAND_BUCKET)
          .createSignedUrl(path, SIGNED_URL_TTL);
        if (error) return null;
        return data?.signedUrl ?? null;
      } catch {
        return null;
      }
    },
  });

  return { url: query.data ?? null, loading: query.isLoading };
}
