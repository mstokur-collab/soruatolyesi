import type { OgrenmeAlani } from '../../types';
import { socialStudiesCurriculum } from './social-studies';
import { mathCurriculum } from './math';
import { scienceCurriculum } from './science';
import { turkishCurriculum } from './turkish';
import { englishCurriculum } from './english';

export const allCurriculumData: Record<string, Record<number, OgrenmeAlani[]>> = {
  'social-studies': socialStudiesCurriculum,
  'math': mathCurriculum,
  'science': scienceCurriculum,
  'turkish': turkishCurriculum,
  'english': englishCurriculum,
};
