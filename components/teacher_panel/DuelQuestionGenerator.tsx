import React, { useState, useMemo, useEffect } from 'react';
import { Button, LoadingSpinner, AiBadge } from '../UI';
import { generateQuestionWithAI } from '../../services/geminiService';
import type { Difficulty } from '../../types';
import { useAuth, useData, useGame } from '../../contexts/AppContext';
import { addQuestionsToDuelPool, awardDuelTicket, deductAiCredits, refundAiCredits, recordQuestionCreation } from '../../services/firestoreService';
import { useToast } from '../Toast';

export const DuelQuestionGenerator: React.FC = () => {
    const { userType, currentUser } = useAuth();
    const { aiCredits, setAiCredits, setGlobalQuestions, loadGlobalQuestions, duelTickets, setDuelTickets } = useData();
    // FIX: Added `allSubjects` to get subject name for the API call.
    const { selectedSubjectId, ogrenmeAlanlari, allSubjects, mergedCurriculum, settings, updateSetting } = useGame();
    const { showToast } = useToast();
    
    const grade = settings.grade || 5;

    // State for form inputs
    const [ogrenmeAlani, setOgrenmeAlani] = useState<string>('');
    const [kazanımId, setKazanımId] = useState<string>('');
    const [kazanımText, setKazanımText] = useState<string>('');
    const [difficulty, setDifficulty] = useState<Difficulty>('orta');

    // State for component logic
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showTicketAnimation, setShowTicketAnimation] = useState(false);
    
    const isDevUser = currentUser?.uid === 'dev-user-12345';
    const creditCost = 3; // 5 soruluk düello paketinin kredi maliyeti

    const availableGrades = useMemo(() => {
        if (!selectedSubjectId || !mergedCurriculum[selectedSubjectId]) return [];
        return Object.keys(mergedCurriculum[selectedSubjectId]).map(Number).sort((a,b) => a-b);
    }, [selectedSubjectId, mergedCurriculum]);

    useEffect(() => {
        if (availableGrades.length > 0 && !availableGrades.includes(grade)) {
            updateSetting('grade', availableGrades[0]);
        }
    }, [availableGrades, grade, updateSetting]);
    
    const kazanımlar = useMemo(() => {
        if (!ogrenmeAlani) return [];
        const alan = ogrenmeAlanlari.find(oa => oa.name === ogrenmeAlani);
        return alan?.kazanimlar || [];
    }, [ogrenmeAlani, ogrenmeAlanlari]);

    // Reset selections when grade or subject changes
    useEffect(() => {
        const firstOgrenmeAlani = ogrenmeAlanlari[0]?.name || '';
        setOgrenmeAlani(firstOgrenmeAlani);
    }, [grade, ogrenmeAlanlari, selectedSubjectId]);

    useEffect(() => {
        const firstKazanım = kazanımlar[0];
        setKazanımId(firstKazanım?.id || '');
        setKazanımText(firstKazanım?.text || '');
    }, [ogrenmeAlani, kazanımlar]);
    
    const handleKazanımChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        setKazanımId(selectedId);
        const selectedKazanım = kazanımlar.find(k => k.id === selectedId);
        setKazanımText(selectedKazanım?.text || '');
    };

    const canGenerate = useMemo(() => {
        if (isDevUser) return true;
        if (userType === 'guest') return false;
        return aiCredits >= creditCost;
    }, [aiCredits, creditCost, userType, isDevUser]);
    
    const handleGenerate = async () => {
        if (userType === 'guest' && !isDevUser) {
            setError('Soru üretmek için giriş yapmalısınız.');
            return;
        }
        if (!kazanımId) {
          setError('Lütfen bir kazanım seçin.');
          return;
        }
        if (!canGenerate) {
            setError(`Yetersiz bakiye. Bu işlem için ${creditCost} bakiye gerekir, ${aiCredits} bakiyeniz var.`);
            return;
        }
        
        setIsLoading(true);
        setError('');

        let hasDeductedCredits = false;

        try {
            // FIX: Removed extra argument `false` to match the 9 arguments expected by `generateQuestionWithAI`.
            const results = await generateQuestionWithAI(
                grade, kazanımId, kazanımText, difficulty, 'quiz', 5, allSubjects[selectedSubjectId].name, null, undefined
            );

            const processedQuestions = results.map((q: any) => ({
                ...q,
                id: isDevUser ? `dev-duel-${Date.now()}-${Math.random()}` : undefined,
                type: 'quiz',
                grade,
                topic: ogrenmeAlani,
                difficulty,
                kazanımId,
                subjectId: selectedSubjectId,
                imageUrl: null,
                author: {
                    uid: currentUser?.uid,
                    name: currentUser?.displayName
                }
            }));

            if (isDevUser) {
                setGlobalQuestions(prev => [...prev, ...processedQuestions]);
            } else {
                await addQuestionsToDuelPool(processedQuestions);
                if (currentUser?.uid) {
                    try {
                        await recordQuestionCreation(currentUser.uid, processedQuestions.length);
                    } catch (statsError) {
                        console.warn('recordQuestionCreation (duel) failed:', statsError);
                    }
                }
            }

            if (userType === 'authenticated' && !isDevUser && currentUser?.uid) {
                const deductionMetadata = {
                    questionCount: processedQuestions.length,
                    subjectId: selectedSubjectId,
                    grade,
                    kazanımId,
                };

                const updatedCredits = await deductAiCredits({
                    uid: currentUser.uid,
                    amount: creditCost,
                    reason: 'duel-question-pack',
                    metadata: deductionMetadata,
                });
                hasDeductedCredits = true;
                setAiCredits(updatedCredits);

                await awardDuelTicket(currentUser.uid);
                setDuelTickets(prev => prev + 1);
                
                // Show ticket animation
                setShowTicketAnimation(true);
                setTimeout(() => setShowTicketAnimation(false), 2000);
            }
            
            showToast('5 soru başarıyla düello havuzuna eklendi! 1 Düello Bileti kazandın!', 'success');
        
        } catch (err: any) {
            if (hasDeductedCredits && currentUser?.uid) {
                try {
                    const refundCredits = await refundAiCredits({
                        uid: currentUser.uid,
                        amount: creditCost,
                        reason: 'duel-question-pack-refund',
                        metadata: {
                            subjectId: selectedSubjectId,
                            grade,
                            kazanımId,
                            error: err?.message || 'unknown-error',
                        },
                    });
                    setAiCredits(refundCredits);
                } catch (refundError) {
                    console.error('Düello kredisi iade edilirken hata oluştu:', refundError);
                }
            }
            setError(err.message || 'Soru üretilirken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex justify-center items-start p-4 sm:p-6 h-full relative">
            {/* Ticket Animation */}
            {showTicketAnimation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="animate-ticket-reward">
                        <div className="text-9xl transform rotate-12">🎫</div>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes ticketReward {
                    0% {
                        transform: scale(0) rotate(0deg);
                        opacity: 0;
                    }
                    30% {
                        transform: scale(1.5) rotate(360deg);
                        opacity: 1;
                    }
                    70% {
                        transform: scale(1.5) rotate(360deg);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(0.2) translateX(600px) translateY(-400px);
                        opacity: 0;
                    }
                }
                .animate-ticket-reward {
                    animation: ticketReward 2s ease-in-out;
                }
            `}</style>
            
            <div className="w-full max-w-2xl flex flex-col gap-4 bg-slate-800/50 p-6 rounded-xl border border-violet-500/30">
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-violet-300">⚔️ Düello Havuzuna Soru Ekle</h3>
                    <p className="text-slate-400 mt-2">Burada üreteceğiniz 5 çoktan seçmeli soru, size gösterilmeden doğrudan "Ortak Düello Havuzu"na eklenecektir. Bu katkınız karşılığında bir "Düello Bileti" kazanarak arkadaşlarınıza meydan okuyabilirsiniz.</p>
                </div>
                
                {availableGrades.length === 0 ? <p className="text-slate-400 p-4 text-center">Bu ders için müfredat tanımlanmamış.</p> : (
                <>
                {/* Grade and Learning Area */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <select value={grade} onChange={e => updateSetting('grade', parseInt(e.target.value))} className="p-3 bg-slate-700 rounded-md border border-slate-600 w-full">
                         {availableGrades.map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                    </select>
                    <select value={ogrenmeAlani} onChange={e => setOgrenmeAlani(e.target.value)} className="p-3 bg-slate-700 rounded-md border border-slate-600 w-full col-span-1 sm:col-span-2">
                        <option value="">Öğrenme Alanı Seçin</option>
                        {ogrenmeAlanlari.map(oa => <option key={oa.name} value={oa.name}>{oa.name}</option>)}
                    </select>
                </div>
                {/* Kazanım */}
                <select value={kazanımId} onChange={handleKazanımChange} disabled={!ogrenmeAlani} className="p-3 bg-slate-700 rounded-md border border-slate-600 w-full disabled:opacity-50 text-sm">
                    <option value="">Kazanım Seçin</option>
                    {kazanımlar.map(k => <option key={k.id} value={k.id}>{k.id} - {k.text}</option>)}
                </select>

                {/* Difficulty */}
                 <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className="p-3 bg-slate-700 rounded-md border border-slate-600 w-full">
                    <option value="kolay">Kolay</option>
                    <option value="orta">Orta</option>
                    <option value="zor">Zor</option>
                </select>
                
                {error && <p className="text-red-400 text-sm text-center -mb-2">{error}</p>}

                <Button
                    onClick={handleGenerate}
                    disabled={isLoading || !kazanımId || !canGenerate}
                    title={userType === 'guest' ? 'Bu özelliği kullanmak için giriş yapmalısınız' : !canGenerate ? 'Yetersiz bakiye.' : ''}
                    variant="duel"
                    className="w-full !py-4 !text-lg mt-2"
                >
                    {isLoading ? 'Sorular üretilip havuza ekleniyor...' : (
                        <div className="flex flex-col items-center gap-1 text-center">
                            <span className="flex items-center justify-center gap-2 text-xl font-black tracking-tight uppercase">
                                <AiBadge size="sm" />
                                <span>ile 5 Düello Sorusu Üret</span>
                            </span>
                            <span className="text-sm text-white/85">
                                (5 soru · {creditCost} kredi)
                            </span>
                        </div>
                    )}
                </Button>

                {userType === 'authenticated' && !canGenerate && (
                    <p className="text-red-400 text-sm text-center -mt-2">Yetersiz bakiye.</p>
                )}
                </>
                )}
            </div>
        </div>
    );
};
