import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useData, useGame } from '../contexts/AppContext';
import { Button, LoadingSpinner } from './UI';
// FIX: The UserData type was being imported from `services/firestoreService`, which doesn't export it. The import has been updated to correctly source the `UserData` type from `../types`, where it is defined and globally exported. This resolves the TypeScript error.
import { onOnlineUsersChange } from '../services/firestoreService';
import type { UserData, OgrenmeAlani, Kazanim } from '../types';

const PlayerCard: React.FC<{ user: UserData; onChallenge: (user: UserData) => void; }> = ({ user, onChallenge }) => {
    return (
        <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 flex flex-col items-center text-center animate-slideIn">
            <img src={user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`} alt={user.displayName} className="w-24 h-24 rounded-full mb-3 border-4 border-slate-600 object-cover" />
            <h3 className="font-bold text-lg text-slate-100">{user.displayName}</h3>
            <p className="text-sm text-slate-400">{user.okul}</p>
            <p className="text-xs text-slate-500">{user.ilce}, {user.il}</p>
            <p className="text-sm font-semibold text-yellow-400 mt-2">{user.sinif}/{user.sube}</p>
            <Button onClick={() => onChallenge(user)} variant="violet" className="!py-2 !px-6 !text-base mt-4 w-full">
                ⚔️ Düello Gönder
            </Button>
        </div>
    );
};


const ChallengeScreen: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, isDevUser } = useAuth();
    const { sendDuelInvitation, okul, userData } = useData();
    const { allSubjects, mergedCurriculum } = useGame();
    const [activeTab, setActiveTab] = useState<'school' | 'all'>('all');
    const [isSendingDuel, setIsSendingDuel] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState<UserData[]>([]);
    const [selectedOpponent, setSelectedOpponent] = useState<UserData | null>(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [selectedKazanim, setSelectedKazanim] = useState<string>('');

    const challengerGrade = useMemo(() => {
        if (typeof userData?.sinif === 'number' && userData.sinif > 0) {
            return userData.sinif;
        }
        if (selectedOpponent?.sinif && selectedOpponent.sinif > 0) {
            return selectedOpponent.sinif;
        }
        return 8;
    }, [userData?.sinif, selectedOpponent?.sinif]);

    // AI Studio simulation data
    const mockOnlineUsers: UserData[] = [
        {
            uid: 'mock-user-1', displayName: 'Ayşe Yılmaz', photoURL: 'https://i.pravatar.cc/150?u=mehmet', il: 'Ankara', ilce: 'Çankaya', okul: 'Anıttepe Ortaokulu', sinif: 8, sube: 'B', isOnline: true,
            highScores: [], solvedQuestionIds: [], documentLibrary: [], generatedExams: [], aiCredits: 0, lastCreditReset: '',
            answerHistory: [],
            duelWins: 0,
            duelLosses: 0,
            duelTickets: 0,
        },
        {
            uid: 'mock-user-2', displayName: 'Mehmet Kaya', photoURL: 'https://i.pravatar.cc/150?u=ayse', il: 'Bartın', ilce: 'Merkez', okul: 'Cumhuriyet Ortaokulu', sinif: 8, sube: 'A', isOnline: true,
            highScores: [], solvedQuestionIds: [], documentLibrary: [], generatedExams: [], aiCredits: 0, lastCreditReset: '',
            answerHistory: [],
            duelWins: 0,
            duelLosses: 0,
            duelTickets: 0,
        },
    ];

    useEffect(() => {
        // For AI Studio / Dev User, use mock data
        if (isDevUser) {
            setIsLoading(true);
            setTimeout(() => {
                setOnlineUsers(mockOnlineUsers);
                setIsLoading(false);
            }, 500);
            return;
        }

        // For real users, listen to Firestore
        setIsLoading(true);
        const unsubscribe = onOnlineUsersChange((users) => {
            setOnlineUsers(users);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isDevUser]);

    const schoolmates = useMemo(() => 
        onlineUsers.filter(u => u.okul === okul && u.uid !== currentUser?.uid)
    , [onlineUsers, okul, currentUser]);

    const allPlayers = useMemo(() => 
        onlineUsers.filter(u => u.uid !== currentUser?.uid)
    , [onlineUsers, currentUser]);


    const displayedUsers = activeTab === 'school' ? schoolmates : allPlayers;
    const emptyMessage = activeTab === 'school' 
        ? "Şu anda okulundan kimse çevrimiçi değil." 
        : "Meydan okunacak kimse bulunamadı.";

    const gatherTopicsForSubject = useCallback((subjectId: string): OgrenmeAlani[] => {
        const subjectCurriculum = mergedCurriculum?.[subjectId];
        if (!subjectCurriculum) {
            return [];
        }
        const gradeTopics = subjectCurriculum[challengerGrade];
        if (Array.isArray(gradeTopics) && gradeTopics.length > 0) {
            return gradeTopics;
        }
        const allTopics: OgrenmeAlani[] = [];
        Object.values(subjectCurriculum).forEach(entry => {
            if (Array.isArray(entry)) {
                allTopics.push(...entry);
            }
        });
        return allTopics;
    }, [mergedCurriculum, challengerGrade]);

    // Get topics for selected subject and grade (falls back safely if derece boş)
    const availableTopics = useMemo(() => {
        if (!selectedSubject) {
            console.log('availableTopics: Missing subject selection');
            return [];
        }
        const topicsSource = gatherTopicsForSubject(selectedSubject);
        if (!topicsSource.length) {
            console.log('availableTopics: No topics found for subject', selectedSubject);
            return [];
        }
        const uniqueTopics = Array.from(new Set(topicsSource.map(oa => oa.name).filter(Boolean)));
        console.log('availableTopics: Found topics', uniqueTopics);
        return uniqueTopics;
    }, [selectedSubject, gatherTopicsForSubject]);

    // Get kazanimlar for selected topic
    const availableKazanimlar = useMemo(() => {
        if (!selectedSubject || !selectedTopic) {
            console.log('availableKazanimlar: Missing requirements', { selectedSubject, selectedTopic });
            return [];
        }
        const topicsSource = gatherTopicsForSubject(selectedSubject);
        if (!topicsSource.length) {
            console.log('availableKazanimlar: No curriculum for subject', selectedSubject);
            return [];
        }
        const topicData = topicsSource.find(oa => oa.name === selectedTopic);
        if (!topicData) {
            console.log('availableKazanimlar: Topic not found', selectedTopic, 'Available:', topicsSource.map(oa => oa.name));
            return [];
        }
        const kazanimlar = Array.isArray(topicData.kazanimlar)
            ? topicData.kazanimlar
            : [];
        const uniqueKazanimlar = Array.from(
            new Map(kazanimlar.map((kazanim) => [kazanim.id, kazanim])).values()
        );
        console.log('availableKazanimlar: Found kazanimlar', uniqueKazanimlar.length);
        return uniqueKazanimlar;
    }, [selectedSubject, selectedTopic, gatherTopicsForSubject]);

    const selectedSubjectName = selectedSubject ? allSubjects[selectedSubject]?.name ?? 'Bilinmeyen Ders' : 'Tüm Dersler';
    const selectedTopicName = selectedTopic || 'Tüm Konular';
    const selectedKazanimData = selectedKazanim ? availableKazanimlar.find(k => k.id === selectedKazanim) : undefined;
    const selectedKazanimText = selectedKazanimData ? `${selectedKazanimData.id} - ${selectedKazanimData.text}` : 'Kazanım seçilmedi';

    const isKazanimUnavailable = Boolean(selectedTopic) && availableKazanimlar.length === 0;

    const handleChallengeClick = (user: UserData) => {
        setSelectedOpponent(user);
        setShowFilterModal(true);
        // Reset selections
        setSelectedSubject('');
        setSelectedTopic('');
        setSelectedKazanim('');
    };

    const handleSendDuel = async () => {
        if (!selectedOpponent) return;
        
        setIsSendingDuel(true);
        setErrorMessage('');
        
        try {
            console.log('Sending duel with params:', {
                opponent: selectedOpponent.displayName,
                subject: selectedSubject || 'none',
                topic: selectedTopic || 'none',
                kazanim: selectedKazanim || 'none'
            });
            
            await sendDuelInvitation(
                selectedOpponent,
                selectedSubject || undefined,
                selectedTopic || undefined,
                selectedKazanim || undefined
            );
            
            setShowFilterModal(false);
            setSelectedOpponent(null);
            setSelectedSubject('');
            setSelectedTopic('');
            setSelectedKazanim('');
        } catch (error) {
            console.error('Duel invitation error:', error);
            const message = error instanceof Error ? error.message : 'Düello daveti gönderilirken bir hata oluştu.';
            setErrorMessage(message);
        } finally {
            setIsSendingDuel(false);
        }
    };

    const handleCancelFilter = () => {
        setShowFilterModal(false);
        setSelectedOpponent(null);
        setSelectedSubject('');
        setSelectedTopic('');
        setSelectedKazanim('');
    };

    return (
        <div className="w-full h-full flex flex-col p-4 sm:p-6">
            <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="bg-amber-400/80 hover:bg-amber-300/90 text-slate-900 font-bold px-4 py-2 rounded-xl backdrop-blur-md transition-transform hover:scale-105 shadow-lg">
                    ← Geri
                </button>
                <button onClick={() => navigate('/')} className="bg-teal-600/90 hover:bg-teal-500/90 text-white font-bold px-4 py-2 rounded-xl backdrop-blur-md transition-transform hover:scale-105 shadow-lg">
                    🏠 Ana Menü
                </button>
            </div>
            <div className="w-full max-w-5xl mx-auto flex flex-col flex-grow">
                <h1 className="text-4xl font-extrabold text-center mt-16 mb-6 text-violet-300">Meydan Oku</h1>

                <div className="flex justify-center mb-6 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700 w-fit mx-auto flex-wrap">
                    <button 
                        onClick={() => setActiveTab('all')} 
                        className={`px-6 py-2 rounded-lg text-lg font-semibold transition-all ${activeTab === 'all' ? 'bg-violet-600 shadow-lg' : 'hover:bg-slate-700'}`}
                    >
                        Tüm Oyuncular ({allPlayers.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('school')} 
                        className={`px-6 py-2 rounded-lg text-lg font-semibold transition-all ${activeTab === 'school' ? 'bg-violet-600 shadow-lg' : 'hover:bg-slate-700'}`}
                    >
                        Okulumdakiler ({schoolmates.length})
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex-grow flex justify-center items-center">
                        <LoadingSpinner />
                    </div>
                ) : displayedUsers.length > 0 ? (
                    <div className="flex-grow overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {displayedUsers.map(user => <PlayerCard key={user.uid} user={user} onChallenge={handleChallengeClick} />)}
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex justify-center items-center text-center text-slate-400">
                        <p>{emptyMessage}</p>
                    </div>
                )}
            </div>

            {/* Filter Modal */}
            {showFilterModal && selectedOpponent && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-violet-500/50 shadow-2xl animate-slideIn">
                        <h2 className="text-2xl font-bold text-violet-300 mb-4 text-center">
                            Düello Filtresi
                        </h2>
                        <p className="text-slate-300 mb-6 text-center">
                            <span className="font-semibold">{selectedOpponent.displayName}</span> ile düello yapacaksınız
                        </p>

                        <div className="space-y-4 mb-6">
                            {/* Subject Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Ders Seçin (Opsiyonel)
                                </label>
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => {
                                        setSelectedSubject(e.target.value);
                                        setSelectedTopic('');
                                        setSelectedKazanim('');
                                    }}
                                    className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-violet-500 focus:outline-none transition-colors"
                                >
                                    <option value="">Tüm Dersler</option>
                                    {Object.entries(allSubjects).map(([id, subject]) => (
                                        <option key={id} value={id}>{subject.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Topic Selection */}
                            {selectedSubject && availableTopics.length > 0 && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Konu Seçin (Opsiyonel)
                                    </label>
                                    <select
                                        value={selectedTopic}
                                        onChange={(e) => {
                                            setSelectedTopic(e.target.value);
                                            setSelectedKazanim('');
                                        }}
                                        className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-violet-500 focus:outline-none transition-colors"
                                    >
                                        <option value="">Tüm Konular</option>
                                        {availableTopics.map((topic) => (
                                            <option key={topic} value={topic}>{topic}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Kazanim Selection */}
                            {selectedTopic && availableKazanimlar.length > 0 && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Kazanım Seçin (Opsiyonel)
                                    </label>
                                    <select
                                        value={selectedKazanim}
                                        onChange={(e) => setSelectedKazanim(e.target.value)}
                                        className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-violet-500 focus:outline-none transition-colors max-h-48 overflow-y-auto"
                                    >
                                        <option value="">Tüm Kazanımlar</option>
                                        {availableKazanimlar.map((kazanim) => (
                                            <option key={kazanim.id} value={kazanim.id}>
                                                {kazanim.id}: {kazanim.text}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Selected filter summary */}
                            <div className="bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-sm text-slate-300 space-y-1">
                                <p><span className="text-slate-400">Seçili Ders:</span> {selectedSubjectName}</p>
                                <p><span className="text-slate-400">Seçili Konu:</span> {selectedTopicName}</p>
                                <p><span className="text-slate-400">Seçili Kazanım:</span> {selectedKazanimText}</p>
                            </div>

                            {/* Info Message */}
                            <div className="bg-violet-900/30 border border-violet-500/30 rounded-xl p-4">
                                <p className="text-sm text-slate-300">
                                    ℹ️ <span className="font-semibold">Filtre Seçimi:</span> Filtre seçmezseniz sınıf bazında rastgele sorular gelecektir. 
                                    Seçilen filtrelere uygun 5'ten az soru varsa otomatik olarak daha geniş filtreye geçilir.
                                </p>
                            </div>

                            {/* Error Message */}
                            {(errorMessage || isKazanimUnavailable) && (
                                <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
                                    <p className="text-sm text-red-300">
                                        ⚠️ <span className="font-semibold">Uyarı:</span>{' '}
                                        {isKazanimUnavailable
                                            ? 'Bu konu için uygun kazanım bulunamadı. Lütfen farklı bir filtre deneyin.'
                                            : errorMessage}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={handleCancelFilter}
                                variant="secondary"
                                className="flex-1 !py-3"
                            >
                                İptal
                            </Button>
                            <Button
                                onClick={handleSendDuel}
                                variant="violet"
                                className="flex-1 !py-3"
                                disabled={isSendingDuel || isKazanimUnavailable}
                            >
                                {isSendingDuel ? '⏳ Gönderiliyor...' : '⚔️ Düello Gönder'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChallengeScreen;
