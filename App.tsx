import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import type { QuizQuestion, GameSettings, Difficulty } from './types';
import { Button, LoadingSpinner, InfoModal } from './components/UI';
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
        isCurriculumLoading,
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
    
    if (isAuthLoading || isDataLoading || isCurriculumLoading) {
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
             <RouteWrapper>
                <div className="selection-container w-full max-w-lg items-center text-center !bg-transparent !border-none !shadow-none">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100">AI Destekli Öğrenme Platformu</h1>
                    <p className="text-lg text-slate-400 mb-8">Öğrenmenin geleceğine hoş geldiniz.</p>
                    <Button 
                        onClick={handleLogin} 
                        variant="primary" 
                        className="!py-3 !text-xl group relative overflow-hidden"
                    >
                         <span className="absolute w-0 h-0 rounded-full bg-teal-400 opacity-20 group-hover:w-64 group-hover:h-64 transition-all duration-500 ease-out"></span>
                         <span className="relative">Google ile Giriş Yap</span>
                    </Button>
                </div>
            </RouteWrapper>
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
