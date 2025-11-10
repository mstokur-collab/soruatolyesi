import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useData } from '../contexts/AppContext';
import { 
    onDuelChanges, 
    submitDuelAnswer, 
    advanceToNextRound, 
    requestRematch,
    onUserChanges,
    declareWinnerOnDisconnect,
    requestPause,
    resumeDuel,
    forfeitDuel,
    getQuestionsByIds,
} from '../services/firestoreService';
import type { Duel, QuizQuestion } from '../types';
import { LoadingSpinner, Button, Modal } from './UI';
import { useToast } from '../components/Toast';

const SUBJECT_TIME_LIMITS: Record<string, number> = {
    math: 50,
    turkish: 50,
    paragraph: 50,
    'social-studies': 40,
    science: 40,
    english: 40,
};

const DEFAULT_TIME_LIMIT = 40;
const MAX_QUESTION_FETCH_ATTEMPTS = 3;

// Her bir oyuncunun bölümünü oluşturan bileşen
// FIX: React.memo ile optimize et - gereksiz re-render'ları önle
const PlayerSection: React.FC<{
    player: { name: string; photoURL?: string; score: number };
    options: string[];
    onSelect: (option: string) => void;
    selection: string | null;
    correctAnswer: string;
    isRoundOver: boolean;
    canSelect: boolean;
    highlight?: boolean;
}> = React.memo(({ player, options, onSelect, selection, correctAnswer, isRoundOver, canSelect, highlight = false }) => {
    const containerClass = [
        'player-section flex flex-col w-full max-w-full mx-auto rounded-3xl p-4 sm:p-6 pb-8 sm:pb-10 gap-5 bg-blue-950/50 border border-blue-900/60 shadow-2xl transition-all duration-300 overflow-y-auto player-section-scroll',
        highlight && !isRoundOver ? 'ring-4 ring-violet-400 shadow-[0_0_35px_rgba(139,92,246,0.45)] animate-pulse' : '',
    ].join(' ');

    const headerClass = 'flex-shrink-0 flex items-center gap-4 p-3 sm:p-4 bg-blue-950/70 rounded-2xl';
    const avatarClass = 'w-14 h-14 sm:w-20 sm:h-20 rounded-full border-4 border-blue-800 object-cover';
    const nameClass = 'text-xl sm:text-2xl font-bold truncate text-slate-100';
    const scoreClass = 'text-3xl sm:text-5xl font-black text-amber-400';
    const optionWrapperClass = 'flex-grow grid option-grid w-full min-h-0 gap-3 sm:gap-4 lg:gap-6';
    const optionTextClass = 'text-lg sm:text-2xl leading-tight';

    const getOptionClass = (option: string) => {
        let baseClass = 'option-button w-full min-h-[4.5rem] rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center text-center p-3 sm:p-5 font-semibold break-words hyphens-auto disabled:cursor-not-allowed overflow-hidden border';
        const glowClass = highlight && !isRoundOver ? 'border-violet-400/70 shadow-[0_0_22px_rgba(139,92,246,0.40)]' : 'border-teal-500';
        const baseBg = 'bg-teal-700';

        if (!isRoundOver) {
            if(selection === option) { // Benim seçimim (onay bekliyor)
                return `${baseClass} ${glowClass} bg-teal-500 text-slate-900`;
            }
            return `${baseClass} ${glowClass} ${baseBg} hover:bg-teal-600 text-white cursor-pointer`;
        }
        
        // Tur bittiğinde sonuçları göster
        const isCorrect = option === correctAnswer;

        if (isCorrect) {
            return `${baseClass} bg-amber-500 border-amber-400 text-slate-900 font-bold`;
        }
        if (option === selection && !isCorrect) {
            return `${baseClass} bg-red-600 border-red-500 text-white`;
        }
        
        return `${baseClass} ${baseBg} opacity-40 border-teal-800`;
    };

    return (
        <div className={containerClass}>
            {/* Oyuncu Bilgileri */}
            <div className={headerClass}>
                <img src={player.photoURL || `https://i.pravatar.cc/150?u=${player.name}`} alt={player.name} className={avatarClass}/>
                <div className="text-left">
                    <h2 className={nameClass}>{player.name}</h2>
                    <p className={scoreClass}>{player.score}</p>
                </div>
            </div>

            {/* Cevap Seçenekleri */}
            <div className={optionWrapperClass}>
                {options.map((opt, index) => (
                    <button 
                        key={index}
                        onClick={() => onSelect(opt)}
                        disabled={!canSelect}
                        className={getOptionClass(opt)}
                    >
                        <span className={optionTextClass}>{opt}</span>
                    </button>
                ))}
            </div>
        </div>
    );
});


const DuelGameScreen: React.FC = () => {
    const { duelId } = useParams<{ duelId: string }>();
    const navigate = useNavigate();
    const { currentUser, isDevUser } = useAuth();
    const { startRematch, handleQuestionAnswered, exitActiveDuel } = useData();
    const { showToast } = useToast();

    // Oyun durumu
    const [duel, setDuel] = useState<Duel | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_LIMIT);
    const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
    const lastRecordedIndex = useRef(-1);
    const lastQuestionIdsRef = useRef<string>('');
    const questionFetchRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isComponentMountedRef = useRef(true);

    const runIfMounted = (fn: () => void) => {
        if (isComponentMountedRef.current) {
            fn();
        }
    };

    const fetchQuestionsWithRetry = useCallback(async (ids: string[], attempt = 1): Promise<void> => {
        if (ids.length === 0) {
            runIfMounted(() => {
                setIsLoading(false);
                setLoadingMessage('');
            });
            return;
        }

        if (attempt === 1) {
            runIfMounted(() => setIsLoading(true));
        }

        runIfMounted(() => {
            if (attempt === 1) {
                setLoadingMessage('Sorular hazirlaniyor...');
            } else {
                setLoadingMessage(`Sorular yukleniyor (deneme ${attempt}/${MAX_QUESTION_FETCH_ATTEMPTS})...`);
            }
        });

        try {
            const fetchedQuestions = await getQuestionsByIds(ids, true) as QuizQuestion[];

            if (!isComponentMountedRef.current) {
                return;
            }

            if (fetchedQuestions.length > 0) {
                if (questionFetchRetryRef.current) {
                    clearTimeout(questionFetchRetryRef.current);
                    questionFetchRetryRef.current = null;
                }
                setQuestions(fetchedQuestions);
                setIsLoading(false);
                setLoadingMessage('');
                return;
            }

            throw new Error('No questions returned from Firestore');
        } catch (error) {
            console.error(`Failed to load questions (attempt ${attempt})`, error);

            if (!isComponentMountedRef.current) {
                return;
            }

            if (attempt < MAX_QUESTION_FETCH_ATTEMPTS) {
                const nextAttempt = attempt + 1;
                const delay = 800 * nextAttempt;

                if (questionFetchRetryRef.current) {
                    clearTimeout(questionFetchRetryRef.current);
                }

                questionFetchRetryRef.current = setTimeout(() => {
                    fetchQuestionsWithRetry(ids, nextAttempt);
                }, delay);
            } else {
                if (questionFetchRetryRef.current) {
                    clearTimeout(questionFetchRetryRef.current);
                    questionFetchRetryRef.current = null;
                }
                setIsLoading(false);
                setLoadingMessage('');
                showToast('Sorular su anda yuklenemiyor. Lutfen tekrar deneyin.', 'error');
                navigate('/meydan-oku');
            }
        }
    }, [navigate, showToast]);

    
    useEffect(() => {
        isComponentMountedRef.current = true;
        return () => {
            isComponentMountedRef.current = false;
            if (questionFetchRetryRef.current) {
                clearTimeout(questionFetchRetryRef.current);
                questionFetchRetryRef.current = null;
            }
        };
    }, []);

    // Duello verilerini ve sorulari yukle
    useEffect(() => {
        if (!duelId) { navigate('/meydan-oku'); return; }

        if (isDevUser) {
            setIsLoading(false);
            setLoadingMessage('');
            return;
        }

        const unsubscribe = onDuelChanges(duelId, async (updatedDuel) => {
            runIfMounted(() => setDuel(updatedDuel));

            if (updatedDuel && updatedDuel.questionIds.length > 0) {
                const questionIdsKey = updatedDuel.questionIds.join('|');
                const needsFetch = questionIdsKey !== lastQuestionIdsRef.current || questions.length === 0;

                if (needsFetch) {
                    lastQuestionIdsRef.current = questionIdsKey;
                    if (questionFetchRetryRef.current) {
                        clearTimeout(questionFetchRetryRef.current);
                        questionFetchRetryRef.current = null;
                    }
                    fetchQuestionsWithRetry(updatedDuel.questionIds);
                }
            } else {
                runIfMounted(() => {
                    setIsLoading(false);
                    setLoadingMessage('');
                });
            }
        });

        return () => unsubscribe();
    }, [duelId, navigate, isDevUser, questions.length, fetchQuestionsWithRetry]);

    const { me, opponent, isMyTurnToAct, currentQuestion, opponentId } = useMemo(() => {
        // FIX: Daha kapsamlı kontroller - undefined değerleri önle
        if (!duel || !currentUser || questions.length === 0) {
            return { me: null, opponent: null, isMyTurnToAct: false, currentQuestion: null, opponentId: null };
        }
        
        // FIX: currentQuestionIndex'in geçerli olduğundan emin ol
        if (duel.currentQuestionIndex < 0 || duel.currentQuestionIndex >= questions.length) {
            return { me: null, opponent: null, isMyTurnToAct: false, currentQuestion: null, opponentId: null };
        }
        
        const currentOpponentId = duel.opponentId === currentUser.uid ? duel.challengerId : duel.opponentId;
        const mePlayer = duel.players?.[currentUser.uid];
        const opponentPlayer = duel.players?.[currentOpponentId];
        
        // FIX: undefined kontrolü ekle
        if (!mePlayer || !opponentPlayer) {
            return { me: null, opponent: null, isMyTurnToAct: false, currentQuestion: null, opponentId: null };
        }
        
        const q = questions[duel.currentQuestionIndex];
        
        return {
            me: mePlayer,
            opponent: opponentPlayer,
            isMyTurnToAct: currentUser.uid === duel.challengerId,
            currentQuestion: q || null,
            opponentId: currentOpponentId,
        };
    }, [duel, currentUser, questions]);


    // Record answer for stats when round is finished
    useEffect(() => {
        if (
            duel?.roundState === 'finished' &&
            me &&
            currentQuestion &&
            me.selection !== null && // ensure I made a selection
            lastRecordedIndex.current !== duel.currentQuestionIndex // ensure it's not a duplicate record for this round
        ) {
            const isCorrect = me.selection === currentQuestion.answer;
            handleQuestionAnswered(currentQuestion, isCorrect);
            lastRecordedIndex.current = duel.currentQuestionIndex;
        }
    }, [duel, me, currentQuestion, handleQuestionAnswered]);

    // Opponent disconnect listener
    useEffect(() => {
        if (!opponentId || !duel || duel.status !== 'in-progress') return;

        const unsubscribe = onUserChanges(
            opponentId,
            (opponentData) => {
                if (opponentData?.isOnline === false) {
                    if (duel.status === 'in-progress') {
                        declareWinnerOnDisconnect(duel.id, currentUser!.uid);
                    }
                }
            },
            (error) => {
                console.error('Failed to monitor opponent status:', error);
            }
        );

        return () => unsubscribe();
    }, [opponentId, duel, currentUser]);

    // Round transition logic
    // FIX: Dependency'leri daralt - sadece gerekli değişiklikler tetiklesin
    useEffect(() => {
        if (duel?.roundState === 'finished' && isMyTurnToAct && duel?.id) {
            const timer = setTimeout(() => {
                advanceToNextRound(duel.id);
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [duel?.roundState, duel?.id, isMyTurnToAct]);

    const currentTimeLimit = useMemo(() => {
        if (!currentQuestion) return DEFAULT_TIME_LIMIT;
        return SUBJECT_TIME_LIMITS[currentQuestion.subjectId] ?? DEFAULT_TIME_LIMIT;
    }, [currentQuestion]);

    // Timer logic - oyuncular cevap vermeden sure dolarsa otomatik cevap gonder
    useEffect(() => {
        if (duel?.roundState !== 'asking' || !currentQuestion) {
            setTimeLeft(currentTimeLimit);
            return;
        }

        const roundStartedAt = duel.roundStartedAt?.toDate();
        if (!roundStartedAt) {
            setTimeLeft(currentTimeLimit);
            return;
        }

        const calculateTimeLeft = () => {
            const secondsPassed = Math.floor((Date.now() - roundStartedAt.getTime()) / 1000);
            return Math.max(0, currentTimeLimit - secondsPassed);
        };

        const initialTime = calculateTimeLeft();
        setTimeLeft(initialTime);

        let timeoutHandled = false;

        if (initialTime === 0 && !me?.selection && !opponent?.selection) {
            timeoutHandled = true;
            submitDuelAnswer(duel.id, 'timeout', duel.currentQuestionIndex, 'timeout', currentQuestion);
            return;
        }

        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);

            if (newTimeLeft === 0 && !me?.selection && !opponent?.selection && !timeoutHandled) {
                timeoutHandled = true;
                clearInterval(timer);
                submitDuelAnswer(duel.id, 'timeout', duel.currentQuestionIndex, 'timeout', currentQuestion);
            }
        }, 500);

        return () => clearInterval(timer);
    }, [duel?.roundState, duel?.roundStartedAt, duel?.currentQuestionIndex, duel?.id, currentQuestion, currentTimeLimit, me?.selection, opponent?.selection]);
    
    // Pause auto-resume logic
    // FIX: 30 saniyelik pause süresi ekle ve her iki oyuncu da resume yapabilir
    useEffect(() => {
        if (duel?.roundState === 'paused' && duel.pauseEndsAt) {
            const pauseEndTime = duel.pauseEndsAt.toDate().getTime();
            // 30 saniye ekle
            const resumeTime = pauseEndTime + 30000;
            const timeout = Math.max(0, resumeTime - Date.now());
            
            // FIX: Sadece challenger değil, her iki oyuncu da resume yapabilir
            // Ama sadece biri yaparsa yeterli
            if (isMyTurnToAct) {
                const timer = setTimeout(() => {
                    resumeDuel(duel.id);
                }, timeout);
                
                return () => clearTimeout(timer);
            }
        }
    }, [duel?.roundState, duel?.pauseEndsAt, duel?.id, isMyTurnToAct]);

    // FIX: useCallback ile optimize et ve double-click'i önle
    const handleMySelection = useCallback(async (option: string) => {
        if (!duel || !currentUser || !currentQuestion || me?.selection) return;
        
        // Optimistic update - UI hemen güncellensin
        setDuel(prev => {
            if (!prev || !currentUser) return prev;
            return {
                ...prev,
                players: {
                    ...prev.players,
                    [currentUser.uid]: {
                        ...prev.players[currentUser.uid],
                        selection: option
                    }
                }
            };
        });

        try {
            await submitDuelAnswer(duel.id, currentUser.uid, duel.currentQuestionIndex, option, currentQuestion);
        } catch (error: any) {
            console.error('Failed to submit answer:', error);
            showToast(error.message || 'Cevap gönderilemedi!', 'error');
            
            // Hata durumunda selection'ı geri al
            setDuel(prev => {
                if (!prev || !currentUser) return prev;
                return {
                    ...prev,
                    players: {
                        ...prev.players,
                        [currentUser.uid]: {
                            ...prev.players[currentUser.uid],
                            selection: null
                        }
                    }
                };
            });
        }
    }, [duel, currentUser, currentQuestion, me?.selection, showToast]);
    
    // FIX: useCallback ile optimize et
    const handleForfeit = useCallback(async () => {
        if (!duel || !currentUser) return;
        await forfeitDuel(duel.id, currentUser.uid);
        setIsPauseModalOpen(false);
    }, [duel, currentUser]);
    
    const handleRematch = useCallback(async () => {
        if (!duel || !currentUser) return;
        await requestRematch(duel.id, currentUser.uid);
    }, [duel, currentUser]);

    const handlePauseRequest = useCallback(async () => {
        if (!duel || !currentUser || me?.pauseAttemptsLeft === 0) return;
        try {
            await requestPause(duel.id, currentUser.uid);
            setIsPauseModalOpen(false);
        } catch (e) {
            showToast("Şu anda mola verilemiyor.", "error");
        }
    }, [duel, currentUser, me?.pauseAttemptsLeft, showToast]);
    
    const handleResume = useCallback(async () => {
        if (!duel) return;
        await resumeDuel(duel.id);
    }, [duel]);

    // Rematch creation and navigation
    useEffect(() => {
        if (duel?.roundState === 'gameover' && me?.rematchRequested && opponent?.rematchRequested) {
            if (isMyTurnToAct) {
                // Challenger creates the new game
                startRematch(duel);
            }
        }
        if (duel?.nextDuelId) {
            navigate(`/duel-game/${duel.nextDuelId}`, { replace: true });
        }
    }, [duel, me, opponent, isMyTurnToAct, startRematch, navigate]);

    useEffect(() => {
        if (!duel) return;
        if ((duel.status === 'completed' || duel.status === 'disconnected') && !duel.nextDuelId) {
            exitActiveDuel();
        }
    }, [duel, exitActiveDuel]);

    const isRoundOver = duel?.roundState === 'finished';

    const roundFeedback = useMemo(() => {
        if (!isRoundOver || !currentQuestion || !me || !opponent) return null;

        const iAnswered = me.selection !== null;
        const oppAnswered = opponent.selection !== null;
        const iCorrect = iAnswered && me.selection === currentQuestion.answer;
        const oppCorrect = oppAnswered && opponent.selection === currentQuestion.answer;

        let text = 'S\u00fcre doldu.';
        let color = 'text-yellow-400';

        if (!iAnswered && !oppAnswered) {
            text = 'S\u00fcre doldu, hi\u00e7biriniz yan\u0131t vermediniz.';
        } else if (iAnswered && !oppAnswered) {
            if (iCorrect) {
                text = 'Rakibin yan\u0131t vermedi, do\u011fru cevab\u0131nla turu ald\u0131n.';
                color = 'text-green-400';
            } else {
                text = 'Rakibin yan\u0131t vermedi ancak cevab\u0131n da do\u011fru de\u011fildi; tur berabere kapand\u0131.';
            }
        } else if (!iAnswered && oppAnswered) {
            if (oppCorrect) {
                text = 'Yan\u0131t vermedin; rakibin do\u011fru cevab\u0131yla turu kaybettin.';
                color = 'text-red-500';
            } else {
                text = 'Sen yan\u0131t vermedin, rakibin cevab\u0131 da hatal\u0131; tur berabere bitti.';
            }
        } else {
            if (iCorrect && oppCorrect) {
                text = 'Her iki oyuncu da soruyu do\u011fru yan\u0131tlad\u0131; tur berabere sonu\u00e7land\u0131.';
            } else if (iCorrect && !oppCorrect) {
                text = 'Do\u011fru yan\u0131t\u0131nla turu kazand\u0131n!';
                color = 'text-green-400';
            } else if (!iCorrect && oppCorrect) {
                text = 'Rakibin do\u011fru yan\u0131tlad\u0131, bu turu kaybettin.';
                color = 'text-red-500';
            } else {
                text = 'Her iki oyuncu da yanl\u0131\u015f yan\u0131t verdi; tur berabere kapand\u0131.';
            }
        }

        return { text, color };
    }, [isRoundOver, currentQuestion, me?.selection, opponent?.selection, me, opponent]);


    if (isLoading) {
        const message = loadingMessage || 'Oyun verileri yukleniyor...';
        return (
            <div className="w-screen h-screen flex flex-col justify-center items-center gap-4 bg-teal-900 text-white px-6 text-center">
                <LoadingSpinner />
                <p className="text-lg font-semibold max-w-md">{message}</p>
            </div>
        );
    }

    if (!duel || !me || !opponent || !currentQuestion) {
        return (
            <div className="w-screen h-screen flex flex-col justify-center items-center gap-6 bg-teal-900 text-white px-6 text-center">
                <p className="text-xl font-semibold max-w-md">
                    Oyun verileri yuklenemedi. Lutfen tekrar deneyin.
                </p>
                <Button onClick={() => { exitActiveDuel(); navigate('/meydan-oku'); }} variant="primary">
                    Ana Menuye Don
                </Button>
            </div>
        );
    }
    
    if (duel.roundState === 'gameover' || duel.status === 'completed' || duel.status === 'disconnected') {
        let resultText = '';
        let resultColor = '';

        if (duel.status === 'disconnected') {
            resultText = 'Rakibin Bağlantısı Koptu. Kazandın!';
            resultColor = 'text-green-400';
        } else if (duel.gameWinnerId === me.uid) {
            resultText = 'Kazandın!';
            resultColor = 'text-green-400';
        } else if (duel.gameWinnerId === null) {
            resultText = 'Berabere!';
            resultColor = 'text-yellow-400';
        } else {
            resultText = 'Kaybettin';
            resultColor = 'text-red-400';
        }

        const getRematchButton = () => {
            if (me.rematchRequested && !opponent.rematchRequested) {
                return <Button variant="success" disabled>Rakip Bekleniyor...</Button>;
            }
             if (me.rematchRequested && opponent.rematchRequested) {
                return <Button variant="success" disabled>Eşleşme Bulundu!</Button>;
            }
            return <Button onClick={handleRematch} variant="success">Tekrar Oyna</Button>;
        };

        return (
            <div className="w-full h-full flex flex-col justify-center items-center text-center p-6 bg-slate-900">
                <h1 className={`text-5xl md:text-7xl font-extrabold ${resultColor} mb-8 animate-fadeIn`}>{resultText}</h1>
                <div className="text-3xl font-bold mb-10 text-white">
                    <span>{me.score}</span>
                    <span className="mx-4 text-slate-500">-</span>
                    <span>{opponent.score}</span>
                </div>
                <div className="flex gap-4">
                    {getRematchButton()}
                    <Button onClick={() => { exitActiveDuel(); navigate('/meydan-oku'); }} variant="primary">Ana Menü</Button>
                </div>
            </div>
        )
    }

    const canISelect = Boolean(me) && duel.roundState === 'asking' && me.selection === null;
    const isPaused = duel.roundState === 'paused';
    const iAmThePauser = isPaused && duel.pausedBy === currentUser?.uid;
    const opponentAnswered = Boolean(opponent?.selection);
    const shouldHighlightMySection = opponentAnswered && !isRoundOver && !isPaused;
    const showOpponentAnsweredBanner = shouldHighlightMySection;

    return (
        <>
        <style>{`
            .duel-layout {
                width: min(96vw, 1200px);
                max-width: 100%;
            }
            @media (min-width: 768px) {
                .duel-layout {
                    width: min(94vw, 1400px);
                }
            }
            @media (min-width: 1024px) {
                .duel-layout {
                    width: min(92vw, 1600px);
                }
            }
            @media (min-width: 1440px) {
                .duel-layout {
                    width: min(90vw, 1800px);
                }
            }
            .player-section-scroll {
                -ms-overflow-style: none;
                scrollbar-width: none;
                -webkit-overflow-scrolling: touch;
                max-height: 100%;
                touch-action: pan-y;
                overscroll-behavior: contain;
            }
            .player-section-scroll::-webkit-scrollbar {
                display: none;
            }
            .option-grid {
                grid-template-columns: repeat(1, minmax(0, 1fr));
                justify-content: center;
                align-content: flex-start;
            }
            .option-grid > * {
                width: 100%;
            }
            @media (min-width: 640px) {
                .option-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
            @media (min-width: 1024px) {
                .option-grid {
                    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
                }
            }
            @media (orientation: landscape) and (max-height: 620px) {
                .duel-screen {
                    padding: 1.25rem;
                    justify-content: flex-start;
                }
                .duel-layout {
                    width: 98vw;
                    max-width: 100%;
                    gap: 1rem;
                    padding: 1.25rem;
                }
                .status-bar {
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .timer-circle {
                    width: 4.5rem;
                    height: 4.5rem;
                    font-size: 1.75rem;
                }
                .question-card {
                    max-height: none;
                    padding: 1rem 1.25rem;
                    font-size: clamp(1rem, 1.7vw, 1.2rem);
                }
                .player-section {
                    padding: 1.25rem;
                    gap: 1rem;
                }
                .player-section-scroll {
                    max-height: calc(100dvh - 200px);
                    padding-bottom: 1rem;
                }
                .option-grid {
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 0.75rem;
                }
                .option-button {
                    min-height: 3.25rem;
                    font-size: clamp(0.95rem, 1.6vw, 1.2rem);
                    padding: 0.75rem 1rem;
                }
            }
            @media (max-width: 639px) {
                .player-section-scroll {
                    max-height: calc(100dvh - 275px);
                    padding-bottom: 1.5rem;
                }
            }
            @keyframes countdown-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
            .countdown-pulse-animation { animation: countdown-pulse 1s ease-in-out infinite; }
            @keyframes result-popup { 0% { transform: scale(0.5) rotate(-10deg); opacity: 0; } 70% { transform: scale(1.1) rotate(5deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
            .animate-result-popup { animation: result-popup 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}</style>
        <div className="duel-screen w-screen min-h-[100dvh] overflow-y-auto flex flex-col items-center justify-start md:justify-center text-white p-4 sm:p-8 bg-teal-900 relative">
            <div className={`w-full duel-layout mx-auto bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 flex flex-col relative p-4 sm:p-6 gap-4 transition-all duration-300 ${isPaused ? 'blur-sm brightness-50' : ''}`}>
                
                <div className="absolute top-4 right-4 z-20">
                    <button
                        onClick={() => setIsPauseModalOpen(true)}
                        disabled={isPaused || isRoundOver || me.pauseAttemptsLeft === 0}
                        className="w-12 h-12 bg-slate-900/50 rounded-full flex items-center justify-center text-2xl transition-transform hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={`Mola ver (Kalan: ${me.pauseAttemptsLeft})`}
                    >
                        ⚙️
                        <span className="absolute -top-1 -right-1 bg-yellow-500 text-slate-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{me.pauseAttemptsLeft}</span>
                    </button>
                </div>

                {showOpponentAnsweredBanner && (
                    <div className="flex-shrink-0 w-full bg-violet-600/80 border border-violet-300 text-white text-center text-base sm:text-lg font-bold py-3 rounded-xl shadow-[0_0_25px_rgba(139,92,246,0.45)] animate-pulse">
                        Rakibin Soruyu Cevapladi!
                    </div>
                )}

                <div className="status-bar flex-shrink-0 flex justify-center items-center gap-6 p-2 rounded-2xl">
                    <div className="text-xl font-bold bg-slate-900/50 px-4 py-2 rounded-lg">Soru {duel.currentQuestionIndex + 1}/{duel.questionIds.length}</div>
                    <div className={`timer-circle text-4xl font-black rounded-full w-20 h-20 flex items-center justify-center border-4 ${timeLeft <= 5 ? 'text-red-400 border-red-500 countdown-pulse-animation' : 'text-yellow-300 border-yellow-400'}`}>
                        {timeLeft}
                    </div>
                </div>

                <div className="question-card flex-shrink-0 w-full mx-auto bg-slate-900/70 border border-violet-500/30 rounded-2xl p-4 sm:p-6 text-lg sm:text-xl font-semibold text-center shadow-lg overflow-y-auto max-h-[30vh]">
                    {/* FIX: Replaced 'imageUrl' with 'userUploadedImage' to match the type definition for QuizQuestion. */}
                    {currentQuestion.userUploadedImage && <img src={`data:image/png;base64,${currentQuestion.userUploadedImage}`} alt="Soru görseli" className="max-h-32 w-auto mx-auto rounded-lg mb-4" />}
                    <p className="break-words hyphens-auto">{currentQuestion.question}</p>
                </div>
                
                <div className="flex-grow w-full flex min-h-0 justify-center">
                    <PlayerSection 
                        player={{name: me.name, photoURL: me.photoURL, score: me.score}}
                        options={currentQuestion.options}
                        onSelect={handleMySelection}
                        selection={me.selection}
                        correctAnswer={currentQuestion.answer}
                        isRoundOver={isRoundOver}
                        canSelect={canISelect}
                        highlight={shouldHighlightMySection}
                    />
                </div>
            </div>

            {isRoundOver && !isPaused && roundFeedback && (
                <div className="absolute inset-0 flex justify-center items-center z-10 pointer-events-none">
                    <div
                        className={`animate-result-popup font-extrabold text-center px-6 sm:px-12 max-w-3xl leading-snug text-3xl sm:text-4xl ${roundFeedback.color}`}
                        style={{ textShadow: '0 0 20px rgba(94,234,212,0.25)' }}
                    >
                        {roundFeedback.text}
                    </div>
                </div>
            )}
            
            {isPaused && !iAmThePauser && (
                 <div className="absolute inset-0 flex flex-col justify-center items-center z-20 text-center">
                    <h2 className="text-4xl font-bold">Rakibin Oyunu Durdurdu</h2>
                    <p className="text-lg mt-2">Oyun yakında devam edecek...</p>
                 </div>
            )}
            
            {isPauseModalOpen && (
                 <div className="absolute inset-0 bg-black/60 flex justify-center items-center z-50 p-4 animate-fadeIn">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center w-full max-w-sm">
                        <h3 className="text-3xl font-bold mb-6">Mola</h3>
                        <div className="space-y-4">
                            <Button onClick={() => setIsPauseModalOpen(false)} variant="primary" className="w-full">Geri Dön</Button>
                            <Button onClick={handlePauseRequest} variant="violet" className="w-full" disabled={me.pauseAttemptsLeft === 0}>Mola İste ({me.pauseAttemptsLeft} Hakkın Kaldı)</Button>
                            <Button onClick={handleForfeit} variant="secondary" className="w-full">Oyundan Çekil</Button>
                        </div>
                    </div>
                </div>
            )}
            
             {iAmThePauser && (
                 <div className="absolute inset-0 bg-black/60 flex justify-center items-center z-50 p-4 animate-fadeIn">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center w-full max-w-sm">
                        <h3 className="text-3xl font-bold mb-2">Oyun Duraklatıldı</h3>
                        <p className="text-lg text-slate-300 mb-6">30 saniye içinde devam edilecek.</p>
                        <div className="space-y-4">
                            <Button onClick={handleResume} variant="success" className="w-full">Şimdi Devam Et</Button>
                            <Button onClick={handleForfeit} variant="secondary" className="w-full">Oyundan Çekil</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

export default DuelGameScreen;

