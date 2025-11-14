// types.ts

export type QuizMode = 'klasik' | 'zamana-karsi' | 'hayatta-kalma';
export type Difficulty = 'kolay' | 'orta' | 'zor';

export interface GameSettings {
  grade?: number;
  topic?: string; // Ogrenme Alani
  kazanimId?: string;
  difficulty?: Difficulty;
  // FIX: Added 'voice' to the gameMode type to support the Voice Game feature and resolve a type error in AppContext.
  gameMode?: 'quiz' | 'fill-in' | 'matching' | 'kapisma' | 'voice';
  quizMode?: QuizMode;
  competitionMode?: 'bireysel' | 'grup';
  teamACount?: number;
  teamBCount?: number;
  questionCount?: number;
  subjectId?: string;
}

export interface Question {
  id: string;
  type: 'quiz' | 'fill-in' | 'matching';
  grade: number;
  topic: string; // Ogrenme Alani
  difficulty: Difficulty;
  kazanimId: string;
  subjectId: string;
  userUploadedImage?: string; // Replaced imageUrl
  author?: {
    uid?: string;
    name?: string;
  };
}

export interface QuizQuestion extends Question {
  type: 'quiz';
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

export interface FillInQuestion extends Question {
  type: 'fill-in';
  sentence: string; // e.g., "The capital of Turkey is ___."
  answer: string;
  distractors: string[]; // Incorrect options
}

export interface MatchingQuestion extends Question {
  type: 'matching';
  question?: string; // Optional prompt like "Match the terms with their definitions."
  pairs: { term: string; definition: string }[];
}

export interface HighScore {
  name: string;
  score: number;
  date: string;
  settings: GameSettings;
}

export interface DocumentLibraryItem {
  id: string;
  name: string;
  content: { mimeType: string; data: string }; // base64 data for PDF or Image
  createdAt: string;
  summary: {
    title: string;
    topics: string[];
  } | null;
}

export interface GeneratedQuestion {
  id: string;
  kazanimId: string;
  kazanimText: string;
  questionStem: string;
  answer: string;
  premise?: string;
  visualDescription?: string; // AI's description of the needed visual
  userUploadedImage?: string; // Base64 data of user-uploaded image
  points: number;
}

export interface Exam {
  id: string;
  title: string;
  createdAt: string;
  scenarios: Record<string, GeneratedQuestion[]>;
  settings: {
    grade: number;
    selectedKazanims: Record<string, { text: string; count: number }>;
  };
  schoolName: string;
  academicYear: string;
  subjectId: string;
  grade: number;
}

export interface Kazanim {
  id: string;
  text: string;
}

export interface AltKonu {
  name: string;
  kazanimlar: Kazanim[];
}

export interface OgrenmeAlani {
  name: string;
  altKonular: AltKonu[];
}

export interface AnswerRecord {
  questionId: string;
  isCorrect: boolean;
  answeredAt: number;
  subjectId: string;
  kazanimId: string;
  difficulty: Difficulty;
}

export interface PerformanceSnapshot {
  label: string;
  total: number;
  correct: number;
  successRate: number;
}

export interface AiCoachHighlight {
  title: string;
  description: string;
  supportingStat?: string;
  icon?: string;
  actionTip?: string;
  recommendation?: string;
}

export interface AiCoachActionItem {
  title: string;
  steps: string[];
  expectedBenefit: string;
}

export interface AiCoachReport {
  generalSummary: string;
  strengths: AiCoachHighlight[];
  focusAreas: AiCoachHighlight[];
  hardestKazanims: AiCoachHighlight[];
  progressSummary: string;
  weeklyTrendSummary: string;
  snapshotSummary: string;
  actionPlan: AiCoachActionItem[];
  motivationMessage: string;
  language: string;
}

export interface AiCoachReportRecord {
  id: string;
  createdAt: number;
  generatedAt?: number;
  report: AiCoachReport;
  overallStats?: {
    totalQuestions: number;
    correctAnswers: number;
    successRate: number;
  };
}

export interface QuestionGeneratorPrefill {
  subjectId: string;
  grade: number;
  topic: string;
  kazanimId: string;
  kazanimText: string;
}

export interface DuelPlayer {
  uid: string;
  name: string;
  photoURL?: string;
  score: number;
  selection: string | null;
  pauseAttemptsLeft: number;
  rematchRequested: boolean;
}

export interface Duel {
  id: string;
  challengerId: string;
  opponentId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected' | 'disconnected';
  createdAt: any; // Firestore Timestamp
  players: Record<string, DuelPlayer>;
  questionIds: string[];
  currentQuestionIndex: number;
  roundState: 'starting' | 'asking' | 'finished' | 'paused' | 'gameover';
  roundWinnerId: string | null;
  roundStartedAt: any;
  pausedBy: string | null;
  pauseEndsAt: any | null;
  gameWinnerId: string | null;
  nextDuelId?: string;
  challengerName?: string;
  challengerPhotoURL?: string;
  selectedSubjectId?: string;
  selectedTopic?: string;
  selectedKazanimId?: string;
  selectedGrade?: number;
  filtersFallbackUsed?: boolean;
}

export interface DuelSelectionCriteria {
  subjectId: string;
  topic?: string;
  kazanimId?: string;
}

export interface PresenceDeviceInfo {
  userAgent?: string;
  platform?: string;
  language?: string;
  vendor?: string;
}

export interface AiCoachLimits {
  dailyWindow: string;
  dailyCount: number;
  weeklyWindow: string;
  weeklyCount: number;
  lastAnalysisAt?: string;
}

export interface ModePlayStat {
  count: number;
  lastPlayedAt?: any;
}

export interface ParticipationStats {
  questionsCreated?: number;
  lastQuestionCreatedAt?: any;
  lastModePlayedAt?: any;
  modePlays?: Record<string, ModePlayStat>;
}

export interface UserData {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  isOnline?: boolean;
  lastSeen?: any; // Firestore Timestamp
  presenceUpdatedAt?: any;
  activeSessionId?: string;
  lastDeviceInfo?: PresenceDeviceInfo;
  il?: string;
  ilce?: string;
  okul?: string;
  sinif?: number;
  sube?: string;
  highScores: HighScore[];
  solvedQuestionIds: string[];
  answerHistory: AnswerRecord[];
  documentLibrary: DocumentLibraryItem[];
  generatedExams: Exam[];
  aiCredits: number;
  lastCreditReset: string;
  customCurriculum?: Record<string, Record<number, OgrenmeAlani[]>>;
  duelWins: number;
  duelLosses: number;
  duelTickets: number; // Duello bileti sayisi
  duelAnswerStats?: Record<string, {
    total: number;
    correct: number;
    updatedAt: string;
  }>;
  leaderboardScore: number;
  seasonScore: number;
  skillPoints: number;
  participationPoints: number;
  lastLeaderboardUpdate?: string;
  aiCoachLimits?: AiCoachLimits;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  adminPermissions?: {
    unlimitedCredits?: boolean;
    canEditAllContent?: boolean;
    canDeleteAllContent?: boolean;
    canManageUsers?: boolean;
    canAccessAdminPanel?: boolean;
  };
  creditPlan?: 'free' | 'pro';
  entitlements?: {
    examGenerator?: boolean;
    [key: string]: boolean | undefined;
  };
  missionPoints?: number;
  participationStats?: ParticipationStats;
}

export type LeaderboardSegmentType = 'global' | 'city' | 'school' | 'class';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL?: string;
  il?: string | null;
  okul?: string | null;
  sinif?: number | null;
  leaderboardScore: number;
  seasonScore: number;
  skillPoints: number;
  participationPoints: number;
  rank: number;
}

export interface LeaderboardSegment {
  id: string;
  seasonId: string;
  segmentType: LeaderboardSegmentType;
  segmentId: string;
  label: string;
  filters: {
    il?: string;
    okul?: string;
    sinif?: number;
  };
  topPlayers: LeaderboardEntry[];
  playerCount: number;
  updatedAt?: any;
}

export interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  before: number;
  after: number;
  metadata?: Record<string, any>;
  createdAt?: any;
}

export interface CreditTransactionsCursor {
  createdAt?: any;
  docId: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceTRY: number;
  description?: string;
  bestFor?: string;
  badge?: 'popular' | 'best-value' | 'new';
  isSubscription?: boolean;
  subscriptionType?: 'monthly' | 'yearly';
  packageType?: 'credit' | 'duel-ticket';
}

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due';

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: any; // Firestore Timestamp
  currentPeriodEnd: any; // Firestore Timestamp
  cancelAtPeriodEnd: boolean;
  creditsPerPeriod: number;
  pricePerPeriod: number;
  nextBillingDate: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  lastPaymentDate?: any; // Firestore Timestamp
  failedPaymentAttempts?: number;
}

export type MissionFrequency = 'daily' | 'weekly' | 'seasonal' | 'dynamic';
export type MissionTargetType =
  | 'duelWins'
  | 'questionsSolved'
  | 'practiceSessions'
  | 'aiAnalysis'
  | 'lessonCompleted'
  | 'kazanimPractice'
  | 'correctStreak'
  | 'speedChallenge'
  | 'difficultQuestions'
  | 'duelInvites'
  | 'rematchWins'
  | 'multiSubject'
  | 'newKazanim'
  | 'allSubjects'
  | 'dailyStreak'
  | 'morningQuestions'
  | 'eveningQuestions'
  | 'questionsCreated'
  | 'examsCreated'
  | 'aiCoachPractice'
  | 'perfectSession'
  | 'marathonSession';

export interface MissionFilters {
  segmentType?: LeaderboardSegmentType;
  il?: string;
  okul?: string;
  sinif?: number;
  userType?: 'guest' | 'authenticated';
}

export interface MissionPracticeConfig {
  kazanimId: string;
  kazanimLabel?: string;
  subjectId?: string;
  minQuestions: number;
  minAccuracy: number;
  dueAt?: string;
}

export interface MissionPracticeStats {
  attempts: number;
  correct: number;
  uniqueQuestionIds?: string[];
  firstAttemptAt?: string;
  lastAttemptAt?: string;
}

export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  frequency: MissionFrequency;
  rewardPoints: number;
  target: number;
  targetType: MissionTargetType;
  expiresInHours?: number;
  filters?: MissionFilters;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
  practiceConfig?: MissionPracticeConfig;
}

export interface MissionProgress {
  current: number;
  target: number;
  lastUpdatedAt: string;
}

export interface MissionInstance {
  id: string;
  missionId: string;
  title: string;
  description: string;
  rewardPoints: number;
  frequency: MissionFrequency;
  targetType: MissionTargetType;
  status: 'pending' | 'completed' | 'claimed' | 'expired';
  progress: MissionProgress;
  assignedAt: string;
  expiresAt?: string;
  completedAt?: string;
  expiredAt?: string;
  rewardClaimedAt?: string;
  practiceConfig?: MissionPracticeConfig;
  practiceConfigKazanimId?: string | null;
  practiceStats?: MissionPracticeStats;
  analysisTriggeredAt?: string;
  analysisChainId?: string;
}
