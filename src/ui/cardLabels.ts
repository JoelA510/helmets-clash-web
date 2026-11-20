import type { CardTarget } from '../game/types';

export const targetLabels: Record<CardTarget, string> = {
  none: 'Immediate', ally_unit: 'Friendly unit', enemy_unit: 'Explored enemy unit',
  enemy_city: 'Explored enemy city', tile: 'Any map tile',
};
