import type { FactionPresetId, TerrainType, UnitType } from '../game/types';

// Each piece shares the same engraved ivory face and dark outline. Paths use a
// 24-unit design grid so the same mark works on a map token or an inspector.
const pieces: Record<UnitType | FactionPresetId, string> = {
  ballista: 'M2 8q10-10 20 0l-9-2v7h5v3H6v-3h5V6z M4 17a3 3 0 1 0 6 0 3 3 0 1 0-6 0z M14 17a3 3 0 1 0 6 0 3 3 0 1 0-6 0z',
  knight: 'M4 13V10a8 8 0 0 1 16 0v4l-5 7-2-7 6-3-7 1-7-1 5 3-1 7z',
  mage: 'M6 19 11 6l3-4 2 13 5 4-8 3z M17 4l2-3 2 3-2 3z',
  barbarian: 'M5 20 16 5l2 2L7 22z M8 4q5 3 10-2l3 8q-6 4-12-2z',
  rogue: 'M3 17Q5 8 13 2q8 7 9 15l-6 5-4-2-4 2z M7 14q5 7 11-2l-7 2z',
  archer: 'M4 3q21 0 16 18L4 3l14 13Q18 7 4 3z M3 20 15 8l-4 1 5-4-1 6-1-2L5 22z',
  skeleton: 'M4 10a8 8 0 1 1 16 0l-1 5-3 1-1 5H8l-1-5-3-2z M7 10v3h3v-3z M14 10v3h3v-3z M11 16l2-2 1 3z',
  wraith: 'M2 21q5-6 5-12 2-7 10-7-2 6 2 10l3 7-5-2 1 5-6-4-5 4 1-4z M10 10l2 3 4-5z',
  lich: 'M4 3l5 4 3-6 3 6 5-4-2 9-2 4 4 6H4l4-6-2-4z M8 11l2 3h1v-2z M16 11l-3 1v2h1z',
  aldermere: 'M2 6l6 4 4-8 4 8 6-4-3 12H5z M5 20h14v2H5z',
  grimhold: 'M4 10a8 8 0 1 1 16 0l-2 5-3 1v5H9v-5l-4-2z M7 9v4h4V9z M14 9v4h3V9z',
  sunspire: 'm12 1 2 5 5-2-1 5 5 3-5 2 2 5-6-1-2 5-2-5-6 2 2-6-5-2 5-3-2-5 6 2z M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0z',
  moonwatch: 'M17 2A10 10 0 1 0 21 17 9 9 0 0 1 17 2z M18 5l1 3 3 1-3 1-1 3-1-3-3-1 3-1z',
};

export function Emblem({ kind, size = 24 }: { kind: keyof typeof pieces; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" style={{display:'inline-block',verticalAlign:'middle'}}><path d={pieces[kind]} fill="currentColor" fillRule="evenodd" stroke="#29291f" strokeWidth=".8" strokeLinejoin="round" /></svg>;
}

const relief: Record<TerrainType, [string, string, string]> = {
  grass: ['#607844', 'M-12 6l-4-6 6 4 1-7 2 8z M4 9l1-6 2 3 5-4-5 7z', 'M-9 4l1-4 M6 7l2-2'],
  forest: ['#294738', 'M-18 7l6-10h-3l6-10 6 11h-3l6 10z M-2 10l6-10H1l6-12 7 12h-3l6 10z', 'M-9-10l-4 8 M7-8 3 0'],
  hills: ['#907349', 'M-22 7q11-23 24-4 10-13 20 6z', 'M-17 4q8-12 16-3 M4 4q6-7 11-2'],
  mountain: ['#605e59', 'm-22 10 13-20 6 8 7-16 18 28z', 'm-12-4 3-5 5 8 M0-4l4-10 6 12-5-3-3 4'],
  water: ['#335c7c', 'M-20-4q7-8 15-1t17-1l7 2q-10 8-20 2t-19 2z M-15 8q8-7 15-2t16-2q-6 10-17 5t-14 2z', 'M-16-4q5-4 11 0 M2 7q7 4 12 0'],
  coast: ['#d0be88', 'M-22 9q6-14 21-11t23-8v7q-8 9-21 8t-18 10z', 'M-15 7q6-8 15-7t15-3'],
};

export function TerrainRelief({ type }: { type: TerrainType }) {
  const [color, face, light] = relief[type];
  return <g pointerEvents="none" aria-hidden="true">
    <path d={face} fill="#22291d" opacity=".22" transform="translate(1 2)" />
    <path d={face} fill={color} /><path d={light} fill="none" stroke="#fff5c9" strokeWidth="1.6" opacity=".72" strokeLinecap="round" />
  </g>;
}
