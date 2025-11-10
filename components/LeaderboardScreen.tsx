import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSeasonLeaderboardSegments } from '../services/firestoreService';
import type { LeaderboardSegment, LeaderboardEntry } from '../types';
import { LoadingSpinner } from './UI';
import { useAuth, useData } from '../contexts/AppContext';

type FilterType = 'genel' | 'sehir' | 'okul' | 'sinif';

const FILTER_ORDER: FilterType[] = ['genel', 'sehir', 'okul', 'sinif'];

const formatTimestamp = (value?: any): string | null => {
    if (!value) return null;
    let date: Date | null = null;
    if (typeof value?.toDate === 'function') {
        date = value.toDate();
    } else if (typeof value === 'number') {
        date = new Date(value);
    } else if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
            date = new Date(parsed);
        }
    }
    return date
        ? date.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
        : null;
};

const LeaderboardScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userType, currentUser } = useAuth();
    const {
        okul,
        il,
        sinif,
        activeMissions,
        isMissionLoading: isMissionLoadingMissions,
        missionError,
        claimMissionReward,
    } = useData();
    const [segments, setSegments] = useState<LeaderboardSegment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('genel');
    const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
    const [claimingMissionId, setClaimingMissionId] = useState<string | null>(null);

    useEffect(() => {
        const fetchSegments = async () => {
            setIsLoading(true);
            try {
                const data = await getSeasonLeaderboardSegments();
                setSegments(data);
            } catch (error) {
                console.error('Liderlik tablosu yüklenemedi', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSegments();
    }, []);

    const segmentMap = useMemo<Record<FilterType, LeaderboardSegment | null>>(() => {
        const normalizedIl = il?.trim();
        const normalizedSchool = okul?.trim();

        return {
            genel: segments.find(segment => segment.segmentType === 'global') ?? null,
            sehir: normalizedIl
                ? segments.find(segment => segment.segmentType === 'city' && segment.filters?.il === normalizedIl) ?? null
                : null,
            okul: normalizedSchool
                ? segments.find(segment => segment.segmentType === 'school' && segment.filters?.okul === normalizedSchool) ?? null
                : null,
            sinif: normalizedSchool && typeof sinif === 'number'
                ? segments.find(segment =>
                    segment.segmentType === 'class' &&
                    segment.filters?.okul === normalizedSchool &&
                    segment.filters?.sinif === sinif
                ) ?? null
                : null,
        };
    }, [segments, il, okul, sinif]);

    useEffect(() => {
        const targetSegment = segmentMap[activeFilter];
        setActiveSegmentId(targetSegment?.id ?? null);
    }, [segmentMap, activeFilter]);

    useEffect(() => {
        if (activeSegmentId || segments.length === 0) return;
        for (const filter of FILTER_ORDER) {
            const candidate = segmentMap[filter];
            if (candidate) {
                setActiveFilter(filter);
                setActiveSegmentId(candidate.id);
                break;
            }
        }
    }, [segments.length, segmentMap, activeSegmentId]);

    const activeSegment = useMemo(
        () => segments.find(segment => segment.id === activeSegmentId) ?? null,
        [segments, activeSegmentId]
    );

    const leaderboardEntries: LeaderboardEntry[] = activeSegment?.topPlayers ?? [];
    const lastUpdatedText = useMemo(() => formatTimestamp(activeSegment?.updatedAt), [activeSegment]);
    const missionSuggestions = useMemo(
        () => activeMissions.filter(mission => mission.status !== 'expired').slice(0, 3),
        [activeMissions]
    );
    const playerSnapshot = useMemo(() => {
        if (!currentUser?.uid) return null;
        const preferredSegments = FILTER_ORDER
            .map(filter => segmentMap[filter])
            .filter(Boolean) as LeaderboardSegment[];
        for (const segment of preferredSegments) {
            const entry = segment.topPlayers.find(player => player.uid === currentUser.uid);
            if (entry) {
                return { entry, segment };
            }
        }
        return null;
    }, [currentUser?.uid, segmentMap]);
    const fallbackTips = useMemo(() => {
        if (!playerSnapshot) {
            return [
                "Liderlik tablosunda görünmek için en az bir düelloyu tamamla ve gün içinde 10 soru çöz.",
                "Okul ve şehir sıralamalarına katılmak için profil bilgilerini eksiksiz doldur.",
            ];
        }
        const tips: string[] = [];
        const { entry, segment } = playerSnapshot;
        const leaderScore = segment.topPlayers[0]?.seasonScore ?? entry.seasonScore;
        const scoreGap = Math.max(0, leaderScore - entry.seasonScore);

        if (scoreGap > 0) {
            tips.push(`Bu tabloda liderle aranda ${scoreGap} puan var. Günlük düellolarda 3 galibiyet alarak farkı hızla kapatabilirsin.`);
        }
        if (entry.participationPoints < entry.skillPoints - 80) {
            tips.push("Katılım puanın beceri puanının gerisinde. Günlük görevleri tamamla ve soru kitaplığını genişlet.");
        }
        if (entry.skillPoints + 80 < entry.participationPoints) {
            tips.push("Beceri puanını yükseltmek için daha zor sorular çöz veya zamana karşı modda pratik yap.");
        }
        if (entry.rank > 5) {
            tips.push("İlk 5'e girmek için bu hafta en az iki yeni düello oyna ve kayıpsız tamamlamaya çalış.");
        }
        if (!tips.length) {
            tips.push("Harika gidiyorsun! Liderliği korumak için her gün kısa bir soru seti çözmeyi unutma.");
        }
        return tips.slice(0, 3);
    }, [playerSnapshot]);

    const getRankColor = (index: number) => {
        if (index === 0) return 'border-yellow-400';
        if (index === 1) return 'border-slate-400';
        if (index === 2) return 'border-amber-600';
        return 'border-slate-700';
    };
    
    const getRankTextColor = (index: number) => {
        if (index === 0) return 'text-yellow-300';
        if (index === 1) return 'text-slate-300';
        if (index === 2) return 'text-amber-500';
        return 'text-slate-400';
    };

    const filterConfigs: { id: FilterType; label: string; requiresProfile?: boolean; }[] = [
        { id: 'genel', label: 'Genel Sıralama' },
        { id: 'sehir', label: 'Şehrimin En İyileri', requiresProfile: true },
        { id: 'okul', label: 'Okulumun En İyileri', requiresProfile: true },
        { id: 'sinif', label: 'Sınıfımın En İyileri', requiresProfile: true },
    ];

    const filters = filterConfigs.map(filter => {
        const hasSegment = Boolean(segmentMap[filter.id]);
        const disabled = filter.id !== 'genel' && (userType === 'guest' || !hasSegment);
        return { ...filter, disabled };
    });

    const getEmptyMessage = useCallback(() => {
        if (!segmentMap[activeFilter]) {
            return 'Bu filtre için henüz sezon verisi yok.';
        }
        return `${filters.find(f => f.id === activeFilter)?.label ?? 'Bu tablo'} için henüz oyuncu bulunamadı.`;
    }, [filters, segmentMap, activeFilter]);

    const handleMissionClaim = useCallback(async (missionId: string) => {
        try {
            setClaimingMissionId(missionId);
            await claimMissionReward(missionId);
        } catch (error) {
            console.error('Görev ödülü alınamadı:', error);
        } finally {
            setClaimingMissionId(null);
        }
    }, [claimMissionReward]);

    const scoreInsights = [
        {
            title: 'Sezon Puanı',
            description: 'Son 90 günde tüm aktivitelerden topladığın puan. Düzenli oynadıkça artar, uzun süre ara verirsen yavaşça düşer.',
        },
        {
            title: 'Beceri Puanı',
            description: 'Çözdüğün soruların zorluğu, doğruluk oranı ve seri cevaplar üzerinden hesaplanır. Zor sorularda başarı büyük fark yaratır.',
        },
        {
            title: 'Katılım Puanı',
            description: "''Soru üretme,Soru çözme, sınav üretme ve düellolara katılma gibi etkinlikleri ödüllendirir. Çeşitli modları denemek ekstra puan sağlar.''",
        },
    ];

    return (
        <div className="w-full min-h-screen flex flex-col p-4 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-3xl mx-auto flex flex-col flex-grow">
                <button onClick={() => navigate(-1)} className="back-button-yellow">← Geri</button>

                <h1 className="text-4xl font-extrabold text-center mt-16 mb-2 text-violet-300 flex items-center justify-center gap-4">
                     <span className="text-yellow-400 text-5xl">🏆</span>
                    <span>Düello Liderlik Tablosu</span>
                </h1>
                <p className="text-center text-sm text-slate-400 mb-6">
                    {activeSegment?.label ?? 'Güncel sezon verileri yükleniyor...'}
                    {lastUpdatedText && (
                        <span className="block text-xs text-slate-500 mt-1">
                            Son güncelleme: {lastUpdatedText}
                        </span>
                    )}
                </p>

                {playerSnapshot && (
                    <div className="bg-slate-800/60 border border-violet-700 rounded-2xl p-4 mb-5 shadow-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-violet-300 mb-1">Aktif Sıralaman</p>
                                <p className="text-lg font-semibold text-slate-100">{playerSnapshot.segment.label}</p>
                                <p className="text-sm text-slate-400">
                                    Bu tabloda {playerSnapshot.entry.rank}. sıradasın · Sezon puanın {playerSnapshot.entry.seasonScore}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                                <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center">
                                    <p className="text-xs text-slate-400">Beceri</p>
                                    <p className="text-xl font-bold text-yellow-300">{playerSnapshot.entry.skillPoints}</p>
                                </div>
                                <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center">
                                    <p className="text-xs text-slate-400">Katılım</p>
                                    <p className="text-xl font-bold text-emerald-300">{playerSnapshot.entry.participationPoints}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-center mb-6 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700 w-fit mx-auto flex-wrap">
                    {filters.map(filter => (
                        <button 
                            key={filter.id}
                            onClick={() => setActiveFilter(filter.id)} 
                            disabled={filter.disabled}
                            className={`px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${activeFilter === filter.id ? 'bg-violet-600 shadow-lg' : 'hover:bg-slate-700'}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {scoreInsights.map(card => (
                        <div key={card.title} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                            <p className="text-sm font-semibold text-slate-100 mb-2">{card.title}</p>
                            <p className="text-xs text-slate-400 leading-relaxed">{card.description}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-100">Sezon Görevleri</p>
                            <p className="text-xs text-slate-400">Puanını hızlıca yükseltmek için mini görevler</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate("/profil")}
                            className="text-xs font-semibold text-violet-300 hover:text-violet-200 transition"
                        >
                            Profilde detayları gör →
                        </button>
                    </div>
                    {isMissionLoadingMissions ? (
                        <div className="text-xs text-slate-400">Görevler yükleniyor...</div>
                    ) : missionError ? (
                        <div className="text-xs text-rose-300">{missionError}</div>
                    ) : missionSuggestions.length ? (
                        <div className="space-y-3">
                            {missionSuggestions.map((mission) => {
                                const isPractice = mission.targetType === 'kazanimPractice';
                                const totalAttempts = mission.practiceStats?.attempts ?? mission.progress.current ?? 0;
                                const requiredQuestions = mission.practiceConfig?.minQuestions ?? mission.progress.target;
                                const correctAnswers = mission.practiceStats?.correct ?? 0;
                                const accuracy = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0;
                                const requiredAccuracy = mission.practiceConfig?.minAccuracy ?? 0;
                                const percent = requiredQuestions
                                    ? Math.min(100, Math.round((totalAttempts / requiredQuestions) * 100))
                                    : 0;
                                const isCompleted = mission.status === 'completed';
                                const isClaimed = mission.status === 'claimed';
                                const isClaimButtonDisabled = !isCompleted || claimingMissionId === mission.id;
                                const practiceStateClass = isPractice
                                    ? totalAttempts === 0
                                        ? 'border-rose-400/50 bg-rose-500/10'
                                        : 'border-amber-400/40 bg-amber-500/10'
                                    : 'border-slate-800 bg-slate-950/40';
                                return (
                                    <div key={mission.id} className={`p-3 rounded-xl ${practiceStateClass}`}>
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-100">{mission.title}</p>
                                                <p className="text-xs text-slate-400">{mission.description}</p>
                                            </div>
                                            <span className="text-xs font-semibold text-amber-300">+{mission.rewardPoints} puan</span>
                                        </div>
                                        <div className="mt-3">
                                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                                <span>{totalAttempts}/{requiredQuestions}</span>
                                                <span>{percent}%</span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                                                <div
                                                    className={`h-2 rounded-full ${isCompleted ? 'bg-emerald-400' : 'bg-violet-500'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                        {isPractice && (
                                            <div className="mt-2 text-[11px] text-slate-300 flex gap-3 flex-wrap">
                                                <span className={totalAttempts === 0 ? 'text-rose-300' : 'text-amber-200'}>
                                                    Çözülen: {totalAttempts}/{requiredQuestions}
                                                </span>
                                                <span className={accuracy >= requiredAccuracy ? 'text-emerald-300' : 'text-slate-400'}>
                                                    Doğruluk: %{accuracy} (≥{requiredAccuracy})
                                                </span>
                                            </div>
                                        )}
                                        {!isPractice && (
                                            isClaimed ? (
                                                <p className="mt-3 text-xs text-emerald-300">Ödül alındı 🎉</p>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={isClaimButtonDisabled}
                                                    onClick={() => handleMissionClaim(mission.id)}
                                                    className={`mt-3 w-full rounded-xl px-4 py-2 text-xs font-semibold transition ${
                                                        isCompleted
                                                            ? 'bg-emerald-500/80 text-white hover:bg-emerald-400'
                                                            : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {isClaimButtonDisabled
                                                        ? isCompleted
                                                            ? 'Ödül alınıyor...'
                                                            : 'İlerlemeni tamamla'
                                                        : 'Ödülü Al'}
                                                </button>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
                            {fallbackTips.map((tip, idx) => (
                                <li key={`${tip}-${idx}`}>{tip}</li>
                            ))}
                        </ul>
                    )}
                </div>


                {isLoading ? (
                    <div className="flex-grow flex justify-center items-center">
                        <LoadingSpinner />
                    </div>
                ) : leaderboardEntries.length > 0 ? (
                    <div className="flex-grow overflow-y-auto pr-2">
                        <ul className="space-y-3">
                            {leaderboardEntries.map((player, index) => (
                                <li key={player.uid} className={`flex items-center p-3 bg-slate-800/60 rounded-xl border-2 animate-slideIn ${getRankColor(index)}`} style={{ animationDelay: `${index * 50}ms`}}>
                                    <div className={`font-bold text-3xl w-12 text-center flex-shrink-0 ${getRankTextColor(index)}`}>
                                        {player.rank}
                                    </div>
                                    <img 
                                        src={player.photoURL || `https://i.pravatar.cc/150?u=${player.uid}`} 
                                        alt={player.displayName} 
                                        className="w-16 h-16 rounded-full mx-4 border-2 border-slate-600 object-cover" 
                                    />
                                    <div className="flex-grow text-left">
                                        <p className="font-bold text-xl text-slate-100">{player.displayName}</p>
                                        <p className="text-sm text-slate-400">
                                            {player.okul || 'Okul bilgisi yok'}
                                            {player.sinif ? ` • ${player.sinif}. Sınıf` : ''}
                                        </p>
                                        {player.il && (
                                            <p className="text-xs text-slate-500">{player.il}</p>
                                        )}
                                    </div>
                                    <div className="text-right flex-shrink-0 w-32">
                                        <p className="font-extrabold text-3xl text-yellow-300">{player.seasonScore}</p>
                                        <p className="text-sm text-slate-400">Sezon Puanı</p>
                                        <p className="text-xs text-slate-500">Beceri {player.skillPoints}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="flex-grow flex justify-center items-center text-center text-slate-400">
                        <p>{getEmptyMessage()}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaderboardScreen;
