import type { QuizQuestion } from '../types';

// FIX: Replaced placeholder content with actual demo questions to make this a valid module.
export const demoQuestions: Record<string, QuizQuestion[]> = {
  'social-studies': [
    {
      id: 'demo-sb-101',
      type: 'quiz',
      grade: 5,
      topic: 'Birey ve Toplum',
      difficulty: 'kolay',
      kazanimId: 'SB.5.1.4',
      subjectId: 'social-studies',
      question: 'AÅŸaÄŸÄ±dakilerden hangisi Ã§ocuk haklarÄ±ndan biri deÄŸildir?',
      options: ['EÄŸitim hakkÄ±', 'SaÄŸlÄ±k hakkÄ±', 'Oyun oynama hakkÄ±', 'Araba kullanma hakkÄ±'],
      answer: 'Araba kullanma hakkÄ±',
      explanation: 'Ã‡ocuklarÄ±n araba kullanma ehliyeti ve hakkÄ± yoktur; bu yetiÅŸkinlere ait bir haktÄ±r. DiÄŸer seÃ§enekler temel Ã§ocuk haklarÄ±ndandÄ±r.'
    },
    {
      id: 'demo-sb-102',
      type: 'quiz',
      grade: 5,
      topic: 'KÃ¼ltÃ¼r ve Miras',
      difficulty: 'orta',
      kazanimId: 'SB.5.2.1',
      subjectId: 'social-studies',
      question: 'YazÄ±yÄ± icat ederek insanlÄ±k tarihine Ã¶nemli bir katkÄ±da bulunan Mezopotamya uygarlÄ±ÄŸÄ± aÅŸaÄŸÄ±dakilerden hangisidir?',
      options: ['SÃ¼merler', 'Hititler', 'Urartular', 'Frigler'],
      answer: 'SÃ¼merler',
      explanation: 'SÃ¼merler, Ã§ivi yazÄ±sÄ±nÄ± icat ederek tarihin yazÄ±lÄ± dÃ¶nemini baÅŸlatan Ã¶nemli bir Mezopotamya uygarlÄ±ÄŸÄ±dÄ±r.'
    },
  ],
  'math': [
      {
          id: 'demo-math-201',
          type: 'quiz',
          grade: 8,
          topic: 'SayÄ±lar ve Ä°ÅŸlemler',
          difficulty: 'kolay',
          kazanimId: 'M.8.1.1.1',
          subjectId: 'math',
          question: '12 sayÄ±sÄ±nÄ±n pozitif tam sayÄ± bÃ¶lenleri aÅŸaÄŸÄ±dakilerden hangisinde doÄŸru verilmiÅŸtir?',
          options: ['1, 2, 3, 4, 6, 12', '1, 2, 3, 4, 8, 12', '1, 2, 4, 6, 12', '1, 3, 4, 6, 12'],
          answer: '1, 2, 3, 4, 6, 12',
          explanation: '12\'yi tam bÃ¶len sayÄ±lar 1, 2, 3, 4, 6 ve 12\'dir.'
      }
  ],
  'science': [
    {
      id: 'demo-sci-301',
      type: 'quiz',
      grade: 5,
      topic: 'GÃœNEÅ, DÃœNYA VE AY',
      difficulty: 'kolay',
      kazanimId: 'F.5.1.1.1',
      subjectId: 'science',
      question: 'GÃ¼neÅŸ\'in katmanlardan oluÅŸtuÄŸu dÃ¼ÅŸÃ¼nÃ¼ldÃ¼ÄŸÃ¼nde, yÃ¼zeyinde daha soÄŸuk olan bÃ¶lgelere ne ad verilir?',
      options: ['GÃ¼neÅŸ lekesi', 'GÃ¼neÅŸ rÃ¼zgarÄ±', 'Korona', 'Ã‡ekirdek'],
      answer: 'GÃ¼neÅŸ lekesi',
      explanation: 'GÃ¼neÅŸ lekeleri, Ã§evresindeki bÃ¶lgelere gÃ¶re daha soÄŸuk olduklarÄ± iÃ§in daha koyu renkte gÃ¶rÃ¼nen alanlardÄ±r.'
    }
  ],
  'turkish': [
    {
      id: 'demo-tur-401',
      type: 'quiz',
      grade: 5,
      topic: 'OKUMA',
      difficulty: 'kolay',
      kazanimId: 'T.5.1.5',
      subjectId: 'turkish',
      question: '"Bu kadar iÅŸin arasÄ±nda bir de yeni projeye baÅŸlamak gÃ¶zÃ¼mÃ¼ korkuttu." cÃ¼mlesindeki altÄ± Ã§izili deyimin anlamÄ± nedir?',
      options: ['Bir iÅŸi yapmaktan Ã§ekinmek, zor geleceÄŸini dÃ¼ÅŸÃ¼nmek', 'Ã‡ok sevinmek', 'GÃ¶zleri aÄŸrÄ±mak', 'Bir ÅŸeyi gÃ¶rememek'],
      answer: 'Bir iÅŸi yapmaktan Ã§ekinmek, zor geleceÄŸini dÃ¼ÅŸÃ¼nmek',
      explanation: '"GÃ¶zÃ¼ korkmak" deyimi, bir iÅŸin zorluÄŸundan veya tehlikesinden Ã§ekinmek, o iÅŸi yapmaya cesaret edememek anlamÄ±na gelir.'
    }
  ],
  'english': [
    {
      id: 'demo-eng-501',
      type: 'quiz',
      grade: 5,
      topic: 'THEME 1: SCHOOL LIFE',
      difficulty: 'kolay',
      kazanimId: 'ENG.5.1.V1',
      subjectId: 'english',
      question: 'Which one is NOT a school subject?',
      options: ['Math', 'Science', 'Art', 'Lunch'],
      answer: 'Lunch',
      explanation: 'Lunch is the meal you eat in the middle of the day. Math, Science, and Art are school subjects.'
    }
  ],
  'paragraph': [
    {
      id: 'demo-par-601',
      type: 'quiz',
      grade: 5,
      topic: 'Paragraf Becerileri',
      difficulty: 'kolay',
      kazanimId: 'PAR.5.1',
      subjectId: 'paragraph',
      question: 'Kitap okumak, kelime daÄŸarcÄ±ÄŸÄ±mÄ±zÄ± zenginleÅŸtirir ve hayal gÃ¼cÃ¼mÃ¼zÃ¼ geliÅŸtirir. FarklÄ± dÃ¼nyalara kapÄ± aralar, yeni karakterlerle tanÄ±ÅŸmamÄ±zÄ± saÄŸlar. Bu yÃ¼zden boÅŸ zamanlarÄ±mÄ±zÄ± kitap okuyarak deÄŸerlendirmek Ã§ok faydalÄ±dÄ±r.\n\nBu paragrafÄ±n ana fikri aÅŸaÄŸÄ±dakilerden hangisidir?',
      options: [
        'Kitap okumak Ã§ok yÃ¶nlÃ¼ bir geliÅŸim saÄŸlar.',
        'BoÅŸ zamanlarda sadece kitap okunmalÄ±dÄ±r.',
        'Hayal gÃ¼cÃ¼ en Ã¶nemli yeteneÄŸimizdir.',
        'Herkesin bir kÃ¼tÃ¼phanesi olmalÄ±dÄ±r.'
      ],
      answer: 'Kitap okumak Ã§ok yÃ¶nlÃ¼ bir geliÅŸim saÄŸlar.',
      explanation: 'Paragrafta kitap okumanÄ±n kelime daÄŸarcÄ±ÄŸÄ±na, hayal gÃ¼cÃ¼ne olan faydalarÄ±ndan bahsedilerek genel olarak geliÅŸim saÄŸladÄ±ÄŸÄ± vurgulanmaktadÄ±r.'
    }
  ],
};

