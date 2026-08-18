import {
  AlertTriangle,
  Clock,
  MapPin,
  Scale,
  ShieldAlert,
  Slice,
  Snowflake,
  SprayCan,
  Thermometer,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { StoredPhoto } from "@/components/PhotoUpload";
import { VideoEmbed, youTubeId } from "@/components/VideoEmbed";
import { renderFormattedText } from "@/lib/richText";
import { DangerZoneGraphic } from "./DangerZoneGraphic";

/** Decorative label-keyword → icon map for card-grid content. */
const labelIcons: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ["temp", "temperature"], icon: Thermometer },
  { keywords: ["time", "duration", "minutes", "hours"], icon: Clock },
  { keywords: ["knife", "cut", "slice"], icon: Slice },
  { keywords: ["storage", "cooler", "fridge", "freezer"], icon: Snowflake },
  { keywords: ["allergen", "allergy"], icon: AlertTriangle },
  { keywords: ["clean", "cleaning", "sanitiz"], icon: SprayCan },
  { keywords: ["ppe", "safety", "hazard", "danger"], icon: ShieldAlert },
  { keywords: ["equipment", "machine"], icon: Wrench },
  { keywords: ["location", "where"], icon: MapPin },
  { keywords: ["quantity", "amount", "portion"], icon: Scale },
];

export function labelIcon(label: string): LucideIcon | null {
  const text = label.toLowerCase();
  for (const entry of labelIcons) {
    if (entry.keywords.some((k) => text.includes(k))) return entry.icon;
  }
  return null;
}

export type StepBlockRow = {
  id: string;
  block_type: string;
  payload: unknown;
  sequence_order: number;
};

type Pair = { label: string; value: string };
type Photo = { path: string; caption?: string };

function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Shared sub-header + bullets styling (also used by the legacy `## ` parser). */
export function HeadingBlock({ text, level = "h2" }: { text: string; level?: "h2" | "h3" }) {
  const Tag = level === "h3" ? "h4" : "h3";
  return (
    <Tag
      className={
        level === "h3"
          ? "font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          : "font-display text-base font-semibold"
      }
    >
      {renderFormattedText(text)}
    </Tag>
  );
}

export function ParagraphBlock({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed">{renderFormattedText(text)}</p>
  );
}

export function BulletedList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{renderFormattedText(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary">
            {i + 1}
          </span>
          <span>{renderFormattedText(item)}</span>
        </li>
      ))}
    </ol>
  );
}

export function LabelValueList({ pairs }: { pairs: Pair[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface/60">
      {pairs.map((pair, i) => {
        const Icon = labelIcon(pair.label);
        return (
          <li key={i} className="min-w-0 px-3.5 py-3">
            <p className="flex items-center gap-1.5 font-display text-sm font-semibold leading-snug">
              {Icon ? <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
              {pair.label}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              {renderFormattedText(pair.value)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function Caption({ text }: { text: string }) {
  if (!text) return null;
  return <figcaption className="px-1 text-xs text-muted-foreground">{text}</figcaption>;
}

export function PhotoBlock({ path, caption }: { path: string; caption?: string }) {
  if (!path) return null;
  return (
    <figure className="space-y-1.5">
      <Card className="overflow-hidden">
        <CardContent className="space-y-3 px-0 py-0 sm:px-6 sm:py-6">
          <StoredPhoto
            path={path}
            alt={caption || "Training photo"}
            className="mx-auto block h-auto w-full max-w-2xl rounded-none border-0 object-contain sm:rounded-md"
          />
        </CardContent>
      </Card>
      <Caption text={caption ?? ""} />
    </figure>
  );
}

function GalleryBlock({ photos }: { photos: Photo[] }) {
  if (!photos.length) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {photos.map((photo, i) => (
        <figure key={i} className="space-y-1.5">
          <StoredPhoto path={photo.path} alt={photo.caption || "Training photo"} />
          <Caption text={photo.caption ?? ""} />
        </figure>
      ))}
    </div>
  );
}

function VideoBlock({ url, caption }: { url: string; caption?: string }) {
  if (!youTubeId(url)) return null;
  return (
    <figure className="space-y-1.5">
      <VideoEmbed url={url} title={caption || "Training video"} />
      <Caption text={caption ?? ""} />
    </figure>
  );
}

function renderBlock(block: StepBlockRow) {
  const payload = asRecord(block.payload);

  switch (block.block_type) {
    case "heading": {
      const level = payload["level"] === "h3" ? "h3" : "h2";
      return <HeadingBlock text={asString(payload["text"])} level={level} />;
    }
    case "paragraph":
      return <ParagraphBlock text={asString(payload["text"])} />;
    case "list": {
      const items = Array.isArray(payload["items"])
        ? (payload["items"] as unknown[]).map(asString).filter(Boolean)
        : [];
      if (!items.length) return null;
      return payload["style"] === "bulleted" ? (
        <BulletedList items={items} />
      ) : (
        <NumberedList items={items} />
      );
    }
    case "photo":
      return (
        <PhotoBlock path={asString(payload["path"])} caption={asString(payload["caption"])} />
      );
    case "gallery": {
      const photos = (Array.isArray(payload["photos"]) ? payload["photos"] : [])
        .map((entry) => {
          const record = asRecord(entry);
          return { path: asString(record["path"]), caption: asString(record["caption"]) };
        })
        .filter((photo) => photo.path);
      return <GalleryBlock photos={photos} />;
    }
    case "video":
      return <VideoBlock url={asString(payload["url"])} caption={asString(payload["caption"])} />;
    case "label_value": {
      const pairs = (Array.isArray(payload["pairs"]) ? payload["pairs"] : [])
        .map((entry) => {
          const record = asRecord(entry);
          return { label: asString(record["label"]), value: asString(record["value"]) };
        })
        .filter((pair) => pair.label || pair.value);
      if (!pairs.length) return null;
      return <LabelValueList pairs={pairs} />;
    }
    case "danger_zone":
      return <DangerZoneGraphic />;
    default:
      return null;
  }
}

/** Renders an ordered list of step_blocks rows. */
export function BlockRenderer({ blocks }: { blocks: StepBlockRow[] }) {
  if (!blocks.length) return null;
  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        const node = renderBlock(block);
        return node ? <div key={block.id}>{node}</div> : null;
      })}
    </div>
  );
}