import type { OgrenmeAlani } from '../../types';
import { flattenLearningAreas } from '../../utils/curriculum';
import { grade5English } from './english/grade5';
import { grade6English } from './english/grade6';
import { grade7English } from './english/grade7';
import { grade8English } from './english/grade8';

export const englishCurriculum: Record<number, OgrenmeAlani[]> = {
  5: flattenLearningAreas(grade5English),
  6: flattenLearningAreas(grade6English),
  7: flattenLearningAreas(grade7English),
  8: flattenLearningAreas(grade8English),
};
