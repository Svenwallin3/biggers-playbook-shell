/**
 * Reusable YouTube embed. Platform-wide: any `video_url` text field (training
 * steps, reference document sections, anything added later) can render through
 * this. Renders nothing when the URL is missing or isn't a YouTube link.
 */
export function youTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return /^[\w-]{11}$/.test(trimmed) ? trimmed : null;
}

export function VideoEmbed({
  url,
  title = "Training video",
  className = "",
}: {
  url: string | null | undefined;
  title?: string;
  className?: string;
}) {
  const id = youTubeId(url);
  if (!id) return null;
  return (
    <div className={`aspect-video w-full overflow-hidden rounded-md bg-muted ${className}`}>
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="size-full border-0"
      />
    </div>
  );
}
