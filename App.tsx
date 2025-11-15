import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import type { QuizQuestion, GameSettings, Difficulty } from './types';
import { Button, LoadingSpinner, InfoModal, AiBadge } from './components/UI';
import { useAuth, useData, useGame } from './contexts/AppContext';
import DuelInvitationModal from './components/DuelInvitationModal';
import { useToast } from './components/Toast';

// Lazy-loaded components for code splitting
const TeacherPanel = lazy(() => import('./components/TeacherPanel'));
const KapismaSetupScreen = lazy(() => import('./components/KapismaSetupScreen'));
const KapismaGame = lazy(() => import('./components/KapismaGame'));
const ProfileSetupScreen = lazy(() => import('./components/ProfileSetupScreen'));
const ChallengeScreen = lazy(() => import('./components/ChallengeScreen'));
const DuelGameScreen = lazy(() => import('./components/DuelGameScreen'));
const LeaderboardScreen = lazy(() => import('./components/LeaderboardScreen'));
const ProfileScreen = lazy(() => import('./components/ProfileScreen'));
const ResultScreen = lazy(() => import('./components/ResultScreen'));
const HomeScreen = lazy(() => import('./components/HomeScreen'));
const GameScreen = lazy(() => import('./components/QuizComponents'));

// NEW lazy imports for selection screens
const SubjectSelectionScreen = lazy(() => import('./components/selection/SubjectSelectionScreen'));
const GradeSelectionScreen = lazy(() => import('./components/selection/GradeSelectionScreen'));
const TopicSelectionScreen = lazy(() => import('./components/selection/TopicSelectionScreen'));
const KazanımSelectionScreen = lazy(() => import('./components/selection/KazanımSelectionScreen'));
const GameModeSelectionScreen = lazy(() => import('./components/selection/GameModeSelectionScreen'));
const DifficultySelectionScreen = lazy(() => import('./components/selection/DifficultySelectionScreen'));
const HighScoresScreen = lazy(() => import('./components/HighScoresScreen'));


const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6">
      {children}
    </div>
);

const ProfileCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userType, isDevUser } = useAuth();
    const { isDataLoading, okul } = useData();
    
    if (isDataLoading) {
        return <RouteWrapper><LoadingSpinner /></RouteWrapper>;
    }
    
    // Allow dev user to bypass profile check for easier testing
    if (isDevUser) {
        return <>{children}</>;
    }
    
    if (userType === 'authenticated' && !okul) {
        return <Navigate to="/profil-kurulum" replace />;
    }
    
    return <>{children}</>;
};

const App: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const devLoginEnabled = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true';
    const {
        currentUser,
        isAuthLoading,
        handleLogin,
        isDevUser,
        loginAsDev,
        showWelcomeModal,
        setShowWelcomeModal,
        welcomeModalTitle,
    } = useAuth();

    const {
        isDataLoading,
        okul,
        incomingDuel,
        acceptDuel,
        rejectDuel,
        activeDuelId,
    } = useData();

    const {
        gameQuestions,
        showNoQuestionsModal,
        setShowNoQuestionsModal,
    } = useGame();
    const { showToast } = useToast();

    // Automatically log in as developer in AI Studio environment
    useEffect(() => {
        const isAiStudio = !!(globalThis as any).process?.env?.API_KEY;
        if (isAiStudio && devLoginEnabled && !currentUser) {
            console.log("AI Studio environment detected. Logging in as Developer.");
            loginAsDev();
        }
    }, [currentUser, loginAsDev, devLoginEnabled]);

    useEffect(() => {
        if (activeDuelId) {
            navigate(`/duel-game/${activeDuelId}`);
        }
    }, [activeDuelId, navigate]);

    useEffect(() => {
        if (currentUser && okul && location.pathname === '/profil-kurulum') {
            navigate('/ana-sayfa', { replace: true });
        }
    }, [currentUser, okul, location.pathname, navigate]);
    
    if (isAuthLoading || isDataLoading) {
        return <div className="w-screen h-screen flex justify-center items-center"><LoadingSpinner /></div>;
    }

    const getInitialRoute = () => {
        if (currentUser) {
            if (isDevUser) {
                return <Navigate to="/ana-sayfa" replace />;
            }
            if (!okul) {
                return <Navigate to="/profil-kurulum" replace />;
            }
            return <Navigate to="/ana-sayfa" replace />;
        }
        return (
            <div className="w-full min-h-screen bg-gradient-to-b from-[#044941] via-[#0c5c52] to-[#044941] px-4 py-4 sm:py-6 overflow-x-hidden overflow-y-auto">
                <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-4 sm:gap-6">
                    {/* Hero Section */}
                    <div className="w-full text-center space-y-2 sm:space-y-3 pt-2 sm:pt-4">
                        {/* Logo */}
                        <div className="flex justify-center mb-2">
                            <div className="relative group">
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                                
                                {/* Main logo container */}
                                <div className="relative">
                                    {/* AI Circuit Background Pattern */}
                                    <div className="absolute inset-0 opacity-20">
                                        <svg className="w-full h-full" viewBox="0 0 400 120" fill="none">
                                            {/* Circuit lines */}
                                            <path d="M0 60 L50 60 L60 50 L80 50 L90 40 L120 40" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
                                            <path d="M400 60 L350 60 L340 50 L320 50 L310 40 L280 40" stroke="#06b6d4" strokeWidth="1" opacity="0.6"/>
                                            <path d="M0 80 L30 80 L40 90 L70 90" stroke="#8b5cf6" strokeWidth="1" opacity="0.6"/>
                                            <path d="M400 80 L370 80 L360 90 L330 90" stroke="#ec4899" strokeWidth="1" opacity="0.6"/>
                                            {/* Circuit nodes */}
                                            <circle cx="60" cy="50" r="3" fill="#10b981" className="animate-pulse" style={{animationDelay: '0s'}}/>
                                            <circle cx="340" cy="50" r="3" fill="#06b6d4" className="animate-pulse" style={{animationDelay: '0.3s'}}/>
                                            <circle cx="40" cy="90" r="2" fill="#8b5cf6" className="animate-pulse" style={{animationDelay: '0.6s'}}/>
                                            <circle cx="360" cy="90" r="2" fill="#ec4899" className="animate-pulse" style={{animationDelay: '0.9s'}}/>
                                        </svg>
                                    </div>
                                    
                                    {/* Logo text */}
                                    <div className="relative px-4 py-2 sm:px-6 sm:py-3">
                                        {/* SORU text */}
                                        <div className="flex items-center justify-center gap-1 mb-0.5">
                                            <span className="text-2xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                                                SORU
                                            </span>
                                        </div>
                                        
                                        {/* LİGİ text with trophy */}
                                        <div className="flex items-center justify-center gap-1.5">
                                            {/* Trophy icon */}
                                            <svg className="w-5 h-5 sm:w-7 sm:h-7" viewBox="0 0 40 40" fill="none">
                                                <path d="M20 8 L24 12 L26 22 L24 30 L20 32 L16 30 L14 22 L16 12 Z" 
                                                      fill="url(#trophyGrad)" 
                                                      stroke="#fbbf24" 
                                                      strokeWidth="1.5"/>
                                                <circle cx="20" cy="18" r="3" fill="#fbbf24" className="animate-pulse"/>
                                                <path d="M16 32 L16 35 L20 34 L24 35 L24 32" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1"/>
                                                <line x1="14" y1="15" x2="10" y2="15" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
                                                <line x1="26" y1="15" x2="30" y2="15" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
                                                <defs>
                                                    <linearGradient id="trophyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" stopColor="#fbbf24"/>
                                                        <stop offset="100%" stopColor="#f59e0b"/>
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            
                                            <span className="text-3xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]">
                                                LİGİ
                                            </span>
                                            
                                            {/* Competition stars */}
                                            <div className="flex flex-col gap-0.5 ml-1">
                                                <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 20 20" fill="none">
                                                    <path d="M10 2 L11 7 L16 8 L12 11 L13 16 L10 13 L7 16 L8 11 L4 8 L9 7 Z" 
                                                          fill="#fbbf24" 
                                                          className="animate-pulse" 
                                                          style={{animationDelay: '0s'}}/>
                                                </svg>
                                                <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 20 20" fill="none">
                                                    <path d="M10 2 L11 7 L16 8 L12 11 L13 16 L10 13 L7 16 L8 11 L4 8 L9 7 Z" 
                                                          fill="#10b981" 
                                                          className="animate-pulse" 
                                                          style={{animationDelay: '0.4s'}}/>
                                                </svg>
                                            </div>
                                        </div>
                                        
                                    </div>
                                    
                                    {/* Decorative corner elements */}
                                    <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-emerald-400/50 rounded-tl-xl"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-cyan-400/50 rounded-tr-xl"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-purple-400/50 rounded-bl-xl"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-amber-400/50 rounded-br-xl"></div>
                                </div>
                            </div>
                        </div>

                        {/* Main Title */}
                        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-snug px-4 pb-3 flex flex-col items-center gap-1 sm:gap-2">
                            <span className="flex items-center gap-2 sm:gap-3 text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-teal-100 to-cyan-200 drop-shadow-2xl">
                                <span className="flex items-center">
                                    <AiBadge size="lg" className="text-3xl sm:text-5xl" />
                                </span>
                                <span>Destekli</span>
                            </span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-teal-100 to-cyan-200 drop-shadow-2xl pb-2">
                                Öğrenme Platformu
                            </span>
                        </h1>
                        
                        {/* Subtitle */}
                        <p className="text-lg sm:text-xl text-slate-200/90 font-medium max-w-2xl mx-auto px-4 leading-relaxed">
                            Öğrenmenin geleceğine hoş geldiniz.
                        </p>

                        {/* Login Button */}
                        <div className="pt-4 sm:pt-6 flex justify-center">
                            <button
                                onClick={handleLogin}
                                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 px-8 py-3 sm:px-10 sm:py-4 text-lg sm:text-xl font-bold text-white border-2 border-teal-200/50 shadow-[0_20px_60px_rgba(20,184,166,0.5)] ring-4 ring-teal-300/30 transition-all duration-300 hover:scale-105 hover:shadow-[0_25px_80px_rgba(20,184,166,0.7)] hover:ring-teal-200/60"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.3),_transparent_50%)] opacity-50"></div>
                                <span className="relative flex items-center gap-3 justify-center">
                                    <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    <span>Google ile Giriş Yap</span>
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-4 pb-8">
                        {/* Feature 1 */}
                        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#14051f]/80 via-[#1d1638]/80 to-[#502c6d]/80 backdrop-blur-sm p-6 border border-violet-200/20 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative space-y-3">
                                <div className="text-4xl">✍️</div>
                                <h3 className="text-xl font-bold text-white">Akıllı Soru Çözme</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Müfredata uygun sorular çöz, yapay zeka ile anında geri bildirim al.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#14051f]/80 via-[#1d1638]/80 to-[#502c6d]/80 backdrop-blur-sm p-6 border border-violet-200/20 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative space-y-3">
                                <div className="text-4xl">✨</div>
                                <h3 className="text-xl font-bold text-white">AI Soru Atölyesi</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Yapay zeka ile sınırsız soru üret, sınav hazırla, içerik oluştur.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#14051f]/80 via-[#1d1638]/80 to-[#502c6d]/80 backdrop-blur-sm p-6 border border-violet-200/20 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative space-y-3">
                                <div className="text-4xl">⚔️</div>
                                <h3 className="text-xl font-bold text-white">Canlı Düello</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Arkadaşlarınla gerçek zamanlı yarış, liderlik tablosunda yüksel.
                                </p>
                            </div>
                        </div>

                        {/* Feature 4 */}
                        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#14051f]/80 via-[#1d1638]/80 to-[#502c6d]/80 backdrop-blur-sm p-6 border border-violet-200/20 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative space-y-3">
                                <div className="text-4xl">🎯</div>
                                <h3 className="text-xl font-bold text-white">Kişisel Gelişim Koçu</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    AI koçun senin için özel analiz yapar, gelişim alanlarını gösterir.
                                </p>
                            </div>
                        </div>

                        {/* Feature 5 */}
                        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#14051f]/80 via-[#1d1638]/80 to-[#502c6d]/80 backdrop-blur-sm p-6 border border-violet-200/20 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative space-y-3">
                                <div className="text-4xl">🏆</div>
                                <h3 className="text-xl font-bold text-white">Liderlik Tablosu</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Sınıfında ve Türkiye genelinde kendini kanıtla, zirvede yer al.
                                </p>
                            </div>
                        </div>

                        {/* Feature 6 */}
                        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#14051f]/80 via-[#1d1638]/80 to-[#502c6d]/80 backdrop-blur-sm p-6 border border-violet-200/20 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative space-y-3">
                                <div className="text-4xl">📚</div>
                                <h3 className="text-xl font-bold text-white">Müfredata Uygun</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Tüm dersler ve kazanımlar MEB müfredatına %100 uyumlu.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 px-2 sm:px-4 pb-12">
                        <div className="text-center space-y-2 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-200/20">
                            <div className="text-3xl sm:text-4xl font-black text-emerald-300">∞</div>
                            <div className="text-xs sm:text-sm text-slate-300 font-semibold">Sınırsız Soru</div>
                        </div>
                        <div className="text-center space-y-2 p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-200/20">
                            <div className="text-3xl sm:text-4xl font-black text-purple-300">AI</div>
                            <div className="text-xs sm:text-sm text-slate-300 font-semibold">Yapay Zeka</div>
                        </div>
                        <div className="text-center space-y-2 p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-200/20">
                            <div className="text-3xl sm:text-4xl font-black text-rose-300">🔴</div>
                            <div className="text-xs sm:text-sm text-slate-300 font-semibold">Canlı Oyun</div>
                        </div>
                        <div className="text-center space-y-2 p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-200/20">
                            <div className="text-3xl sm:text-4xl font-black text-cyan-300">📊</div>
                            <div className="text-xs sm:text-sm text-slate-300 font-semibold">Detaylı Analiz</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-screen min-h-screen font-sans overflow-y-auto bg-teal-900" style={{
            backgroundImage: 'radial-gradient(ellipse at bottom, rgba(15, 118, 110, 0.6) 0%, rgba(19, 78, 74, 0) 70%)'
        }}>
            <main className="w-full min-h-screen">
                <Suspense fallback={<div className="w-screen h-screen flex justify-center items-center bg-slate-900/50 backdrop-blur-sm"><LoadingSpinner /></div>}>
                    <Routes>
                        <Route path="/" element={getInitialRoute()} />

                        <Route path="/ana-sayfa" element={<ProfileCheck><HomeScreen /></ProfileCheck>} />
                        
                        <Route path="/ders-sec" element={<ProfileCheck><SubjectSelectionScreen /></ProfileCheck>} />
                        <Route path="/sinif-sec" element={<ProfileCheck><GradeSelectionScreen /></ProfileCheck>} />
                        <Route path="/ogrenme-alani-sec" element={<ProfileCheck><TopicSelectionScreen /></ProfileCheck>} />
                        <Route path="/kazanim-sec" element={<ProfileCheck><KazanımSelectionScreen /></ProfileCheck>} />
                        <Route path="/oyun-turu-sec" element={<ProfileCheck><GameModeSelectionScreen /></ProfileCheck>} />
                        <Route path="/zorluk-sec" element={<ProfileCheck><DifficultySelectionScreen /></ProfileCheck>} />
                        <Route path="/yuksek-skorlar" element={<ProfileCheck><HighScoresScreen /></ProfileCheck>} />
                        
                        <Route path="/oyun" element={
                            <ProfileCheck>
                                <div id="game-screen" className="w-full h-full flex flex-col">
                                    {gameQuestions.length > 0 ? (
                                        <GameScreen />
                                    ) : (
                                        <RouteWrapper>
                                            <h2 className="text-2xl font-bold mb-4">Uygun Soru Bulunamadı!</h2>
                                            <p className="text-slate-300 mb-6">Seçtiğiniz kriterlere uygun soru kalmadı.</p>
                                            <Button onClick={() => navigate('/')}>Ana Menüye Dön</Button>
                                        </RouteWrapper>
                                    )}
                                </div>
                            </ProfileCheck>
                        } />

                        <Route path="/sonuc" element={<ResultScreen />} />

                        <Route path="/kapisma-kurulum" element={<ProfileCheck><KapismaSetupScreen /></ProfileCheck>} />
                        
                        <Route path="/kapisma-oyun" element={
                            <ProfileCheck>
                                <div id="kapisma-game-screen" className="w-full h-full">
                                    {gameQuestions.length > 0 ? (
                                        <KapismaGame />
                                    ) : (
                                        <RouteWrapper>
                                            <h2 className="text-2xl font-bold mb-4">Kapışma için Uygun Soru Bulunamadı!</h2>
                                            <p className="text-slate-300 mb-6">Bu mod için Çoktan Seçmeli soru bulunamadı.</p>
                                            <Button onClick={() => navigate('/')}>Ana Menüye Dön</Button>
                                        </RouteWrapper>
                                    )}
                                </div>
                            </ProfileCheck>
                        } />

                        <Route path="/ogretmen-paneli" element={<ProfileCheck><TeacherPanel /></ProfileCheck>} />
                        
                        <Route path="/profil-kurulum" element={<ProfileSetupScreen />} />

                        <Route path="/profil" element={<ProfileCheck><ProfileScreen /></ProfileCheck>} />

                        <Route path="/meydan-oku" element={<ProfileCheck><ChallengeScreen /></ProfileCheck>} />
                        
                        <Route path="/duel-game/:duelId" element={<ProfileCheck><DuelGameScreen /></ProfileCheck>} />
                        
                        <Route path="/liderlik-tablosu" element={<ProfileCheck><LeaderboardScreen /></ProfileCheck>} />

                    </Routes>
                </Suspense>
            </main>
            <InfoModal 
                isOpen={showWelcomeModal}
                title={welcomeModalTitle}
                onClose={() => setShowWelcomeModal(false)}
            >
                <p>Giriş yaptığınız için artık tüm özelliklerden faydalanabilirsiniz. İşte sizi bekleyenler:</p>
                <ul>
                    <li><strong>Yüksek Skorlar:</strong> Yaptığınız en iyi skorlar artık kaydedilecek ve liderlik tablosunda yer alacak.</li>
                    <li><strong>İlerleme Takibi:</strong> Çözdüğünüz sorular işaretlenir, böylece aynı sorularla tekrar karşılaşmazsınız.</li>
                    <li><strong>Yapay Zeka Soru Atölyesi:</strong> Kendi soru bankanızı oluşturabilir, dökümanlar yükleyebilir ve hatta yapay zeka ile yazılı sınavlar hazırlayabilirsiniz!</li>
                </ul>
                <p className="mt-4">İyi eğlenceler ve bol şans!</p>
            </InfoModal>
            <InfoModal 
                isOpen={showNoQuestionsModal}
                title="🚀 Soru Bankanız Boş!"
                onClose={() => setShowNoQuestionsModal(false)}
            >
                <p>Seçtiğiniz derste henüz hiç soru bulunmuyor.</p>
                <p className="mt-4">Oyun oynamaya başlayabilmek için <strong>AI Soru Atölyesi</strong>'ni kullanarak kendi sorularınızı üretebilirsiniz:</p>
                <ul>
                    <li><strong>Soru Üret:</strong> Müfredat kazanımlarına göre anında yeni sorular oluşturun.</li>
                    <li><strong>Kütüphanem:</strong> Kendi dökümanlarınızı (PDF, resim) yükleyerek onlardan sorular türetin.</li>
                    <li><strong>Yazılı Hazırla:</strong> Tek tıkla yapay zeka destekli yazılı sınav kağıtları oluşturun.</li>
                </ul>
                <p className="mt-4">Ana menüdeki <strong>AI Soru Atölyesi</strong> butonuna tıklayarak başlayabilirsiniz!</p>
            </InfoModal>
             <DuelInvitationModal
                duel={incomingDuel}
                onAccept={acceptDuel}
                onReject={rejectDuel}
            />
        </div>
    );
};

export default App;
