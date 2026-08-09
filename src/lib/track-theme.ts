/**
 * Visual identity per training track so modules stop blending together.
 * Presentation only — no data or ordering behaviour depends on this.
 */
export type TrackTheme = {
  key: "hospitality" | "market" | "kitchen" | "delivery";
  /** Left colour rail on a card. */
  rail: string;
  /** Small icon/letter chip. */
  chip: string;
  /** Uppercase section label. */
  label: string;
};

const themes: Record<TrackTheme["key"], TrackTheme> = {
  hospitality: {
    key: "hospitality",
    rail: "bg-track-hospitality",
    chip: "bg-track-hospitality/12 text-track-hospitality",
    label: "text-track-hospitality",
  },
  market: {
    key: "market",
    rail: "bg-track-market",
    chip: "bg-track-market/15 text-track-market",
    label: "text-track-market",
  },
  kitchen: {
    key: "kitchen",
    rail: "bg-track-kitchen",
    chip: "bg-track-kitchen/15 text-track-kitchen",
    label: "text-track-kitchen",
  },
  delivery: {
    key: "delivery",
    rail: "bg-track-delivery",
    chip: "bg-track-delivery/18 text-track-delivery",
    label: "text-track-delivery",
  },
};

export function trackTheme(trackName: string | null | undefined): TrackTheme {
  const name = (trackName ?? "").toLowerCase();
  if (name.includes("kitchen")) return themes.kitchen;
  if (name.includes("deliver")) return themes.delivery;
  if (name.includes("market")) return themes.market;
  return themes.hospitality;
}