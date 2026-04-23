import type { FactionPreset } from '../game/types';
import { FACTION_PRESETS } from '../game/constants';

// Unique SVG <pattern> defs per faction so units/cities are visually
// distinguishable without relying on color alone (WCAG 1.4.1 "Use of
// Color"). Each faction gets both a solid fill AND a pattern overlay —
// colorblind users can tell factions apart by the pattern shape.
//
// Usage: render `<FactionPatterns />` once inside the root <svg>; then
// cities/units can reference `url(#pattern-${faction.id})` as their fill.
//
// The patterns are kept subtle (low contrast against the faction color)
// so they don't fight the HP bars or glyphs for attention.
export function FactionPatterns() {
  return (
    <defs>
      {FACTION_PRESETS.map((p) => (
        <FactionPattern key={p.id} preset={p} />
      ))}
    </defs>
  );
}

function FactionPattern({ preset }: { preset: FactionPreset }) {
  const id = `pattern-${preset.id}`;
  const base = preset.color;
  const ink = preset.accent;
  switch (preset.pattern) {
    case 'crown':
      // Diagonal stripes — broad, high-contrast, scans well.
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <rect width="8" height="8" fill={base} />
          <rect width="3" height="8" fill={ink} opacity={0.25} />
        </pattern>
      );
    case 'skull':
      // Small dot grid — reads as "studded" / ominous.
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill={base} />
          <circle cx="3" cy="3" r="1.2" fill={ink} opacity={0.4} />
        </pattern>
      );
    case 'sunburst':
      // Radial sun rays from top — reads as "beam" / radiant.
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="10" height="10">
          <rect width="10" height="10" fill={base} />
          <path d="M5 0 L6 10 M5 0 L4 10" stroke={ink} strokeWidth="0.7" opacity={0.35} />
        </pattern>
      );
    case 'crescent':
      // Wavy horizontal bands — reads as "moon" / tidal.
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="12" height="6">
          <rect width="12" height="6" fill={base} />
          <path d="M0 3 Q 3 1, 6 3 T 12 3" stroke={ink} strokeWidth="0.8" fill="none" opacity={0.4} />
        </pattern>
      );
    default:
      // Fallback: plain solid fill under the faction id.
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill={base} />
        </pattern>
      );
  }
}
