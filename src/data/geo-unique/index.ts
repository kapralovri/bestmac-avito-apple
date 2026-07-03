import type { GeoUniqueMap } from './types';
import { GEO_UNIQUE_PART1 } from './part1';
import { GEO_UNIQUE_PART2 } from './part2';

/** Уникальные локальные блоки всех районов (part1: Москва+Химки, part2: МО). */
export const GEO_UNIQUE: GeoUniqueMap = {
  ...GEO_UNIQUE_PART1,
  ...GEO_UNIQUE_PART2,
};

export type { GeoUniqueBlock, GeoUniqueMap } from './types';
