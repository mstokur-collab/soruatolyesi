import type { OgrenmeAlani } from '../../types';
import { grade5English } from './english/grade5';
import { grade6English } from './english/grade6';
import { grade7English } from './english/grade7';
import { grade8English } from './english/grade8';

export const englishCurriculum: Record<number, OgrenmeAlani[]> = {
  5: grade5English,
  6: grade6English,
  7: grade7English,
  8: grade8English,
};
