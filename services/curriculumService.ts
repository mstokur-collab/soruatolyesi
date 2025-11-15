import type { OgrenmeAlani, Kazanım } from '../types';

// A cache to store curriculum data for subjects that have already been loaded.
const cachedCurriculum: { [subjectId: string]: Record<number, OgrenmeAlani[]> } = {};

/**
 * Dynamically loads the curriculum data for a specific subject.
 * This prevents all curriculum data from being loaded at the initial app start,
 * improving performance.
 * @param subjectId The ID of the subject to load (e.g., 'math', 'social-studies').
 * @returns A promise that resolves to the curriculum data for the requested subject.
 */
export const getCurriculumForSubject = async (subjectId: string): Promise<Record<number, OgrenmeAlani[]>> => {
  // Return from cache if already loaded
  if (cachedCurriculum[subjectId]) {
    return cachedCurriculum[subjectId];
  }

  try {
    let curriculumData: Record<number, OgrenmeAlani[]> = {};

    // Use dynamic import to lazy-load the subject's curriculum module
    switch (subjectId) {
      case 'social-studies': {
        const module = await import('../data/curriculum/social-studies');
        curriculumData = module.socialStudiesCurriculum;
        break;
      }
      case 'math': {
        const module = await import('../data/curriculum/math');
        curriculumData = module.mathCurriculum;
        break;
      }
      case 'science': {
        const module = await import('../data/curriculum/science');
        curriculumData = module.scienceCurriculum;
        break;
      }
      case 'turkish': {
        const module = await import('../data/curriculum/turkish');
        curriculumData = module.turkishCurriculum;
        break;
      }
      case 'english': {
        const module = await import('../data/curriculum/english');
        curriculumData = module.englishCurriculum;
        break;
      }
      case 'din': {
        const module = await import('../data/curriculum/din');
        curriculumData = module.dinCurriculum;
        break;
      }
      case 'german': {
        const module = await import('../data/curriculum/german');
        curriculumData = module.germanCurriculum;
        break;
      }
      // 'paragraph' subject does not have a separate curriculum file.
      case 'paragraph': {
          curriculumData = {};
          break;
      }
      default:
        console.warn(`No curriculum file found for subject: ${subjectId}`);
        curriculumData = {};
    }

    // Cache the loaded data
    cachedCurriculum[subjectId] = curriculumData;
    return curriculumData;
  } catch (error) {
    console.error(`Failed to dynamically load curriculum for subject "${subjectId}":`, error);
    // Return an empty object on failure to prevent the app from crashing.
    return {};
  }
};

/**
 * Dynamically loads and aggregates kazanımlar from all subjects.
 * @returns A promise that resolves to a unique list of all kazanımlar.
 */
export const getAllKazanims = async (): Promise<Kazanım[]> => {
  // 'paragraph' does not have a curriculum file.
  const subjectIds = ['social-studies', 'math', 'science', 'turkish', 'english', 'din', 'german'];
  const allKazanimsPromises = subjectIds.map(async (subjectId) => {
    try {
      const curriculum = await getCurriculumForSubject(subjectId);
      let kazanims: Kazanım[] = [];
      for (const grade in curriculum) {
        curriculum[grade].forEach((ogrenmeAlani) => {
          if (Array.isArray(ogrenmeAlani.kazanimlar)) {
            kazanims.push(...ogrenmeAlani.kazanimlar);
          }
        });
      }
      return kazanims;
    } catch (error) {
      console.error(`Failed to load kazanımlar for ${subjectId}:`, error);
      return []; // Return empty array on error for a specific subject
    }
  });

  const kazanimsBySubject = await Promise.all(allKazanimsPromises);
  const flatKazanims = kazanimsBySubject.flat();
  
  // Remove duplicates by ID to ensure a unique list
  const uniqueKazanims = Array.from(new Map(flatKazanims.map(k => [k.id, k])).values());
  return uniqueKazanims;
};
