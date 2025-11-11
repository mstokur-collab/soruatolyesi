import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useData, useGame } from '../contexts/AppContext';
import { Button, AiBadge } from './UI';
import GlowButton from './GlowButton';
import { CreditResourceStrip, CreditPurchaseSheet, OnlinePresenceBadge } from './CreditResources';
import { onOnlineUsersChange } from '../services/firestoreService';

const DEV_ONLINE_USER_COUNT = 28;
// Buton genişlik sabiti - CreditResourceStrip ile aynı genişlik (max-w-3xl = 768px)
const actionButtonWidth = 'w-full max-w-3xl';

const HomeScreen: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, userType, handleLogout, isDevUser } = useAuth();
    const { setPostSubjectSelectRedirect } = useGame();
    const { aiCredits, duelTickets, creditPackages } = useData();
    const isGuest = userType === 'guest';
    const guestFeatureTitle = isGuest ? 'Bu özelliği kullanmak için giriş yapmalısınız' : '';
    const buttonTypography = '!text-white !font-semibold';
    const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
    const [isStripCompact, setIsStripCompact] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const [onlinePulse, setOnlinePulse] = useState(false);
    const previousOnlineCount = useRef<number | null>(null);
    const availableCreditPackages = creditPackages || [];

    // Clear any pending redirects when the user lands on the home screen.
    // This fixes the bug where a user is incorrectly sent to the teacher panel.
    useEffect(() => {
        setPostSubjectSelectRedirect(null);
    }, [setPostSubjectSelectRedirect]);

    useEffect(() => {
        const handleScroll = () => {
            setIsStripCompact(window.scrollY > 32);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (isDevUser) {
            setOnlineCount(DEV_ONLINE_USER_COUNT);
            return;
        }
        const unsubscribe = onOnlineUsersChange((users) => {
            setOnlineCount(users.length);
        });
        return () => unsubscribe();
    }, [isDevUser]);

    useEffect(() => {
        if (previousOnlineCount.current === null) {
            previousOnlineCount.current = onlineCount;
            return;
        }
        if (previousOnlineCount.current === onlineCount) {
            return;
        }
        previousOnlineCount.current = onlineCount;
        setOnlinePulse(true);
        const timeoutId = window.setTimeout(() => setOnlinePulse(false), 550);
        return () => window.clearTimeout(timeoutId);
    }, [onlineCount]);

    const showStripOnline = !isStripCompact && onlineCount > 0;
    const handleOpenPurchase = () => setIsPurchaseOpen(true);
    const handleClosePurchase = () => setIsPurchaseOpen(false);
    const handleRequestAuth = () => navigate('/');

    return (
        <>
            <div className="w-full min-h-screen bg-gradient-to-b from-[#044941] via-[#0c5c52] to-[#044941] px-2 py-2 sm:py-3 overflow-x-hidden overflow-y-auto">
                <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-1.5 sm:gap-2">
                    <div className="relative w-full overflow-hidden rounded-3xl border border-violet-200/20 bg-gradient-to-br from-[#14051f] via-[#1d1638] to-[#502c6d] p-2 sm:p-2.5 text-left shadow-[0_28px_70px_rgba(12,5,25,0.7)] ring-1 ring-violet-300/20">
                        <div className="pointer-events-none absolute -inset-[3px] rounded-[30px] opacity-60 blur-3xl bg-gradient-to-br from-[#b388ff]/25 via-transparent to-[#ff80bf]/25"></div>
                        <div className="absolute inset-0 opacity-35 bg-[linear-gradient(120deg,_rgba(255,255,255,0.25)_0%,_transparent_40%,_transparent_60%,_rgba(255,255,255,0.2)_100%)]" />
                        <div className="relative flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                                {currentUser ? (
                                    <img
                                        src={currentUser.photoURL || `https://i.pravatar.cc/150?u=${currentUser.uid}`}
                                        alt="Profil"
                                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 border-slate-500 object-cover"
                                    />
                                ) : (
                                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/20 bg-slate-800 text-xl sm:text-2xl">
                                        <span role="img" aria-label="Misafir">ğŸ‘¤</span>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] sm:text-xs text-slate-400">Hoş geldin!</p>
                                    <p className="text-base sm:text-lg font-semibold text-white">{currentUser?.displayName || 'Misafir'}</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                {showStripOnline && (
                                    <OnlinePresenceBadge count={onlineCount} pulse={onlinePulse} className="bg-emerald-500/10 px-3 py-1 text-sm" />
                                )}
                                {currentUser ? (
                                    <button
                                        onClick={handleLogout}
                                        className="rounded-2xl bg-rose-600/90 px-5 py-2 font-semibold text-white shadow-lg transition hover:bg-rose-500"
                                    >
                                        Çıkış Yap
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/')}
                                        className="rounded-2xl bg-teal-600/90 px-5 py-2 font-semibold text-white shadow-lg transition hover:bg-teal-500"
                                    >
                                        Giriş Yap
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-full flex justify-center px-1">
                        <CreditResourceStrip
                            credits={aiCredits}
                            duelTickets={duelTickets}
                            isCompact={isStripCompact}
                            onActionClick={handleOpenPurchase}
                            className="mx-auto w-full max-w-3xl"
                        />
                    </div>

                    <div
                        className="selection-container w-full max-w-5xl items-center pt-1"
                        style={{ background: 'transparent', border: 'none', boxShadow: 'none', gap: '0.25rem' }}
                    >
                        <div className="grid w-full max-w-3xl grid-cols-1 gap-1 sm:gap-1.5 sm:grid-cols-2">
                            <div className="col-span-1 sm:col-span-2 flex flex-col items-center px-1">
                                <div className={actionButtonWidth}>
                                    <GlowButton
                                        onClick={() => navigate('/ders-sec')}
                                        gradientClass="bg-gradient-to-br from-[#082a1a] via-[#0c5b31] to-[#39ec93]"
                                        borderClass="border-emerald-200/55"
                                        ringClass="ring-emerald-300/40"
                                        hoverClass="hover:ring-emerald-100/80 hover:shadow-[0_55px_115px_rgba(57,236,147,0.58)]"
                                        overlayClass="bg-gradient-to-br from-emerald-200/40 via-transparent to-lime-200/30"
                                    >
                                        <span className="flex items-center gap-1.5 sm:gap-2">
                                            <span className="text-xl sm:text-2xl" aria-hidden="true">✍️</span>
                                            <span>Soru Çöz</span>
                                        </span>
                                    </GlowButton>
                                </div>
                                <p className="text-[10px] sm:text-xs text-slate-300 text-center mt-0.5">
                                    Kazanım seç, sorunu çöz; cevapların Koç'a otomatik gider.
                                </p>
                            </div>

                            <div className="col-span-1 sm:col-span-2 flex flex-col items-center px-1">
                                <div className={actionButtonWidth}>
                                    <Button
                                        onClick={() => navigate('/ogretmen-paneli')}
                                        variant="ai"
                                        className={`w-full text-center flex items-center justify-center gap-1.5 text-sm sm:text-base ${buttonTypography} !py-3 sm:!py-4 !rounded-[40px] !min-h-[56px] sm:!min-h-[60px] lg:!min-h-[64px]`}
                                    >
                                        <span>✨</span>
                                        <span className="flex items-center gap-2">
                                            <AiBadge size="lg" />
                                            <span className="text-white font-black tracking-tight">Soru Atölyesi</span>
                                        </span>
                                    </Button>
                                </div>
                                <p className="text-[10px] sm:text-xs text-slate-300/90 text-center mt-0.5">
                                    AI destekli içerik üret; sınav ve etkinliklere dakikalar içinde hazır ol.
                                </p>
                            </div>

                            <div className="col-span-1 sm:col-span-2 flex flex-col items-center px-1">
                                <div className={actionButtonWidth}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!isGuest) navigate('/meydan-oku');
                                        }}
                                        disabled={isGuest}
                                        title={guestFeatureTitle}
                                        aria-disabled={isGuest}
                                        className={`group relative w-full overflow-hidden rounded-[40px] bg-gradient-to-br from-[#2a0309] via-[#7c0d26] to-[#ff3b6e] px-4 py-3 sm:px-5 sm:py-4 text-center text-white border border-rose-200/45 shadow-[0_40px_95px_rgba(58,8,20,0.9)] ring-2 ring-rose-300/40 transition-all duration-300 min-h-[56px] sm:min-h-[60px] lg:min-h-[64px] ${
                                            isGuest
                                                ? 'cursor-not-allowed opacity-60'
                                                : 'cursor-pointer hover:scale-[1.04] hover:ring-rose-100/85 hover:shadow-[0_55px_120px_rgba(255,59,110,0.55)]'
                                        }`}
                                    >
                                        <div className="pointer-events-none absolute -inset-[2px] rounded-[44px] opacity-60 blur-3xl bg-gradient-to-br from-[#ff5f81]/45 via-transparent to-[#ff8ab3]/35"></div>
                                        <div className="absolute inset-0 opacity-75 blur-[60px] mix-blend-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_transparent_60%)]"></div>
                                        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(120deg,_rgba(255,255,255,0.4)_0%,_transparent_35%,_transparent_65%,_rgba(255,255,255,0.35)_100%)] animate-pulse"></div>
                                        <div className="relative flex w-full flex-col items-center justify-center gap-2 text-center sm:flex-row sm:justify-center sm:text-left pr-3 sm:pr-24">
                                            <span className="flex items-center gap-1.5 text-base sm:text-lg font-black tracking-tight flex-shrink-0">
                                                <span className="text-lg sm:text-xl" aria-hidden="true">⚔️</span>
                                                <span>Düello Başlat</span>
                                            </span>
                                            {onlineCount > 0 && (
                                                <OnlinePresenceBadge
                                                    count={onlineCount}
                                                    pulse={onlinePulse}
                                                    variant="card"
                                                    className="pointer-events-none absolute right-3 top-3 sm:right-6 sm:top-1/2 sm:-translate-y-1/2"
                                                />
                                            )}
                                        </div>
                                    </button>
                                </div>
                                <p className="text-[10px] sm:text-xs text-slate-200/90 text-center mt-0.5">
                                    Arkadaşınla aynı soruyu çözüp rekabeti canlı yaşa.
                                </p>
                            </div>

                            <div className="col-span-1 sm:col-span-2 flex flex-col items-center px-1">
                                <div className={actionButtonWidth}>
                                    <GlowButton
                                        onClick={() => navigate('/profil')}
                                        disabled={isGuest}
                                        title={guestFeatureTitle}
                                        gradientClass="bg-gradient-to-br from-[#f8fafc] via-[#dbeafe] to-[#93c5fd]"
                                        borderClass="border-slate-100/80"
                                        ringClass="ring-sky-200/60"
                                        hoverClass="hover:ring-slate-100/90 hover:shadow-[0_55px_110px_rgba(147,197,253,0.45)]"
                                        overlayClass="bg-gradient-to-br from-white/70 via-transparent to-sky-100/60"
                                        textClass="text-slate-900 font-bold"
                                    >
                                        <span className="flex items-center gap-2 sm:gap-3">
                                            <span className="relative rounded-full bg-gradient-to-br from-[#0b1b3c] via-[#1c366a] to-[#36e0b8] h-9 sm:h-10 px-3 shadow-[0_20px_45px_rgba(8,37,81,0.75)] ring-1 ring-cyan-200/70 flex items-center justify-center">
                                            <AiBadge
                                                size="md"
                                                    withSparkle={false}
                                                    gradientClass="bg-gradient-to-r from-white to-white/70"
                                                    className="text-white drop-shadow-[0_0_18px_rgba(240,249,255,0.95)]"
                                                />
                                                <span className="pointer-events-none absolute right-[0.65rem] -top-1 text-[0.55rem] text-white drop-shadow-[0_0_10px_rgba(248,250,252,0.9)]">
                                                    ★
                                                </span>
                                            </span>
                                            <span>Yapay Zeka Gelişim Koçu</span>
                                        </span>
                                    </GlowButton>
                                </div>
                                <p className="text-[10px] sm:text-xs text-slate-300/90 text-center mt-0.5">
                                    Çözdüğün her soru otomatik analiz edilir; Koç ilerlemeni sana gösterir.
                                </p>
                            </div>

                            <div className="col-span-1 sm:col-span-2 flex flex-col items-center px-1">
                                <div className={actionButtonWidth}>
                                    <GlowButton
                                        onClick={() => navigate('/liderlik-tablosu')}
                                        disabled={isGuest}
                                        title={guestFeatureTitle}
                                        gradientClass="bg-gradient-to-br from-[#3a1f00] via-[#c67b00] to-[#ffe06a]"
                                        borderClass="border-amber-200/70"
                                        ringClass="ring-amber-300/60"
                                        hoverClass="hover:ring-amber-100/90 hover:shadow-[0_55px_120px_rgba(255,224,106,0.5)]"
                                        overlayClass="bg-gradient-to-br from-amber-100/60 via-transparent to-yellow-200/40"
                                        textClass="text-slate-900 font-bold"
                                    >
                                        <span className="flex items-center gap-1.5 sm:gap-2">
                                            <span className="text-xl sm:text-2xl" aria-hidden="true">🏆</span>
                                            <span>Liderlik Tablosu</span>
                                        </span>
                                    </GlowButton>
                                </div>
                                <p className="text-[10px] sm:text-xs text-slate-300/90 text-center mt-0.5">
                                    Sınıfının ve Türkiye'nin skorlarını tek bakışta gör, yerini bil.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <CreditPurchaseSheet
                isOpen={isPurchaseOpen}
                onClose={handleClosePurchase}
                creditPackages={availableCreditPackages}
                isGuest={isGuest}
                onRequestAuth={handleRequestAuth}
            />
        </>
    );
};

export default HomeScreen;
