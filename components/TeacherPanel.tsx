import React, { useState, lazy, Suspense, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { LoadingSpinner, AiBadge } from './UI';
import { CreditPurchaseSheet } from './CreditResources';

import { QuestionGenerator } from './teacher_panel/QuestionGenerator';

import { QuestionLibrary } from './teacher_panel/QuestionLibrary';

import { DocumentManager } from './teacher_panel/DocumentManager';

// FIX: Lazily import ExamGenerator to resolve module loading issue and improve performance.

const ExamGenerator = lazy(() => import('./teacher_panel/ExamGenerator'));

import { Tools } from './teacher_panel/Tools';

import { DuelQuestionGenerator } from './teacher_panel/DuelQuestionGenerator';

import { useAuth, useData, useGame } from '../contexts/AppContext';



// Admin panelini sadece gerektiğinde yüklemek için lazy import

const AdminPanel = lazy(() => import('./admin/AdminPanel'));



type TeacherPanelTab = 'generator' | 'library' | 'documents' | 'exams' | 'tools' | 'duel-generator' | 'admin-panel';



const TeacherPanel: React.FC = () => {

  const { userType, isAdmin, isDevUser, currentUser } = useAuth();

  const { 

    userData,

    globalQuestions,

    documentLibrary,

    aiCredits,

    dailyCreditLimit,

    duelTickets,

    creditPackages

  } = useData();

  

  // mstokur@hotmail.com için sonsuz kredi kontrolü

  const isUnlimitedUser = currentUser?.email === 'mstokur@hotmail.com';

  const navigate = useNavigate();



  const { 

    selectedSubjectId, 

    handleSubjectSelect, 

    allSubjects, 

    getSubjectCount,

    setSelectedSubjectId,

    subjectName

  } = useGame();



  const [activeTab, setActiveTab] = useState<TeacherPanelTab>('generator');

  const [lockedTabMessage, setLockedTabMessage] = useState('');

  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);

  const [isHoverableDevice, setIsHoverableDevice] = useState(false);
  const [isPurchaseSheetOpen, setIsPurchaseSheetOpen] = useState(false);

  const hasProExamAccess = isDevUser

    || isUnlimitedUser

    || Boolean(userData?.creditPlan === 'pro')

    || Boolean(userData?.entitlements?.examGenerator)

    || Boolean(userData?.adminPermissions?.unlimitedCredits);

  const creditPlanLabel = hasProExamAccess ? 'PRO' : 'Standart Hesap';
  const creditPlanBadgeClasses = hasProExamAccess
    ? 'bg-gradient-to-r from-amber-300 via-pink-400 to-rose-500 text-slate-900 font-black uppercase tracking-[0.2em] text-sm sm:text-base border border-white/40 shadow-[0_0_14px_rgba(249,115,22,0.55)]'
    : 'bg-slate-700/60 text-slate-200 border border-white/10';



  // activeTab'i admin paneli dışına yönlendirmek için

  useEffect(() => {

    if (!isAdmin && activeTab === 'admin-panel') {

      setActiveTab('generator');

    }

  }, [isAdmin, activeTab]);



  useEffect(() => {

    if (activeTab === 'exams' && !hasProExamAccess) {

      setActiveTab('generator');

    }

  }, [activeTab, hasProExamAccess]);



  useEffect(() => {

    if (!lockedTabMessage) return;

    const timer = setTimeout(() => setLockedTabMessage(''), 5000);

    return () => clearTimeout(timer);

  }, [lockedTabMessage]);



  useEffect(() => {

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {

      return;

    }

    const mediaQuery = window.matchMedia('(hover: hover)');

    const updateHoverPreference = (event: MediaQueryList | MediaQueryListEvent) => {

      setIsHoverableDevice(event.matches);

      if (!event.matches) {

        setIsAccountPanelOpen(false);

      }

    };

    updateHoverPreference(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {

      mediaQuery.addEventListener('change', updateHoverPreference);

      return () => mediaQuery.removeEventListener('change', updateHoverPreference);

    }

    mediaQuery.addListener(updateHoverPreference);

    return () => mediaQuery.removeListener(updateHoverPreference);

  }, []);



  const handleAccountPanelToggle = () => {

    if (isHoverableDevice) {

      return;

    }

    setIsAccountPanelOpen((prev) => !prev);

  };



  const handleAccountPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {

    if (isHoverableDevice) {

      return;

    }

    if (event.key === 'Enter' || event.key === ' ') {

      event.preventDefault();

      setIsAccountPanelOpen((prev) => !prev);

    }

  };



  const accountCardInteractionProps: React.HTMLAttributes<HTMLDivElement> = isHoverableDevice

    ? {

        onMouseEnter: () => setIsAccountPanelOpen(true),

        onMouseLeave: () => setIsAccountPanelOpen(false),

      }

    : {

        onClick: handleAccountPanelToggle,

        onKeyDown: handleAccountPanelKeyDown,

        role: 'button',

        tabIndex: 0,

        'aria-expanded': isAccountPanelOpen,

      };



  const tabConfig = {

    generator: { label: 'Soru Üret', icon: '✨' },

    'duel-generator': { label: 'Düello Sorusu Üret', icon: '⚔️' },

    library: { label: `Soru Bankası (${userType === 'authenticated' ? globalQuestions.length : 'Demo'})`, icon: '📚' },

    documents: { label: `Kütüphanem (${userType === 'authenticated' ? documentLibrary.length : 'Demo'})`, icon: '📂' },

    exams: { label: 'Yazılı Hazırla', icon: '📝' },

    tools: { label: 'Araçlar', icon: '🛠️' },

    'admin-panel': { label: 'Admin Paneli', icon: '👑' }

  };

  

  const tabColors = [
    'bg-gradient-to-r from-sky-500/80 to-indigo-600/80 border border-white/10',
    'bg-gradient-to-r from-fuchsia-500/80 to-violet-600/80 border border-white/10',
    'bg-gradient-to-r from-emerald-500/80 to-teal-600/80 border border-white/10',
    'bg-gradient-to-r from-orange-500/80 to-rose-600/80 border border-white/10',
    'bg-gradient-to-r from-amber-500/80 to-lime-500/80 border border-white/10',
    'bg-gradient-to-r from-cyan-500/80 to-blue-600/80 border border-white/10',
    'bg-gradient-to-r from-rose-700/80 to-red-800/80 border border-white/10' // Admin Paneli Rengi
  ];



  const handleTabSelect = (tab: TeacherPanelTab) => {

    if (tab === 'exams' && !hasProExamAccess) {

      setLockedTabMessage('Yazılı Hazırla özelliğini kullanabilmek için Pro paketi satın almalısınız.');

      return;

    }

    setLockedTabMessage('');

    setActiveTab(tab);

  };



  const renderContent = () => {

    switch (activeTab) {

      case 'generator':

        return <QuestionGenerator />;

      case 'duel-generator':

        return <DuelQuestionGenerator />;

      case 'library':

        return <QuestionLibrary />;

      case 'documents':

        return <DocumentManager />;

      case 'exams':

        if (!hasProExamAccess) {

          return (

            <div className="p-6 sm:p-10 text-center space-y-4">

              <h3 className="text-2xl font-bold text-amber-300">Yalnızca Pro Öğretmenlere Açık</h3>

              <p className="text-slate-200 max-w-2xl mx-auto">

                Yazılı Hazırla modu, kapsamlı sınav içerikleri oluşturmak isteyen Pro paket sahiplerine özeldir.

                Pro paketi satın alarak bu bölümün kilidini açabilir ve kişiselleştirilmiş sınavlar hazırlayabilirsiniz.

              </p>

              <div className="flex justify-center">

                <button

                  onClick={() => handleTabSelect('tools')}

                  className="px-6 py-3 bg-emerald-500 text-slate-900 font-semibold rounded-lg hover:bg-emerald-400 transition"

                >

                  Paketleri İncele

                </button>

              </div>

            </div>

          );

        }

        return (

          <Suspense fallback={<div className="flex justify-center items-center h-full"><LoadingSpinner /></div>}>

            <ExamGenerator />

          </Suspense>

        );

      case 'tools':

        return <Tools />;

      case 'admin-panel':

        return (

          <Suspense fallback={<div className="flex justify-center items-center h-full"><LoadingSpinner /></div>}>

            <AdminPanel />

          </Suspense>

        );

      default:

        return null;

    }

  };



  // Eğer bir ders seçilmemişse, kullanıcıya ders seçtirme ekranını göster

  if (!selectedSubjectId) {

    return (

        <div className="w-full h-full flex justify-center items-center p-4 sm:p-6">

             <div className="grade-selection-container">

                <button onClick={() => navigate('/ana-sayfa')} className="back-button-yellow">← Ana Sayfa</button>

                <h2 className="grade-selection-title flex items-center gap-2">
                    <AiBadge size="md" />
                    <span>Atölyesi İçin Ders Seç</span>
                </h2>

                <div className="grade-buttons-wrapper subject-selection-grid">

                    {Object.keys(allSubjects).map((id, index) => {

                    const subject = allSubjects[id];

                    const count = getSubjectCount(id);

                    const colorClass = `color-${(index % 6) + 1}`;

                    return (

                        <button 

                            key={id} 

                            onClick={() => handleSubjectSelect(id)}

                            disabled={userType === 'guest'}

                            className={`subject-button ${colorClass}`}

                            title={userType === 'guest' ? 'Bu özelliği kullanmak için giriş yapmalısınız' : ''}

                        >

                            <span className="subject-button__name">{subject.name}</span>

                            <span className="subject-button__count">

                            {userType === 'guest' ? 'Demo' : `${count} Soru`}

                            </span>

                        </button>

                    );

                    })}

                </div>

            </div>

        </div>

    );

  }



  // Ders seçilmişse normal paneli göster

  return (

     <>
     <div className="w-full h-full flex justify-center items-center p-4 sm:p-6">

        <div className="w-full max-w-7xl h-full flex flex-col bg-gradient-to-br from-slate-950 via-indigo-950 to-emerald-900 text-white border border-cyan-400/40 rounded-2xl shadow-2xl overflow-hidden relative">

            <div className="flex w-full flex-col gap-4 px-4 pt-6 sm:flex-row sm:items-start sm:justify-between">

                                <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                    <button
                        onClick={() => navigate('/ana-sayfa')}
                        className="bg-amber-400/80 hover:bg-amber-300/90 text-slate-900 font-bold px-4 py-2 rounded-xl backdrop-blur-md transition-transform hover:scale-105 shadow-lg"
                    >
                        ← Ana Sayfa
                    </button>
                    <button
                        onClick={() => setSelectedSubjectId('')}
                        className="bg-indigo-600/90 hover:bg-indigo-500/90 text-white font-bold px-4 py-2 rounded-xl backdrop-blur-md transition-transform hover:scale-105 shadow-lg"
                    >
                        Dersi Değiştir
                    </button>
                </div>

                {userType === 'authenticated' && (

                <div className="w-full sm:max-w-md lg:max-w-lg">

                    <div

                        className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-900/15 shadow-2xl backdrop-blur-xl transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"

                        {...accountCardInteractionProps}

                    >

                        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/40 blur-3xl"></div>

                        <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl"></div>



                        <div className="relative space-y-5 p-5">

                            <div className="flex items-center justify-between gap-3">

                                <div>

                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Hesap Durumu</p>

                                    <p className="text-lg font-semibold text-white flex items-center gap-2">
                                        <AiBadge size="sm" withSparkle={false} />
                                        <span>Kredi & Düello Biletleri</span>
                                    </p>

                                </div>

                                <div className="flex items-center gap-2">

                                    <span className={`flex items-center rounded-full px-3 py-1 text-xs font-semibold ${creditPlanBadgeClasses}`}>

                                        {creditPlanLabel}

                                    </span>

                                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-sm text-white transition-transform duration-200 ${isAccountPanelOpen ? '' : 'rotate-180'}`}>

                                        ^

                                    </span>

                                </div>

                            </div>

                            <div

                                id="account-panel-details"

                                className={`overflow-hidden rounded-2xl bg-slate-900/40 transition-all duration-500 ${isAccountPanelOpen ? 'max-h-[1200px] opacity-100 mt-5' : 'max-h-0 opacity-0 mt-0 pointer-events-none'}`}

                                aria-hidden={!isAccountPanelOpen}

                            >

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner">

                                    <div className="flex items-center justify-between">

                                        <div className="flex flex-col">

                                            <span className="text-xs uppercase tracking-wide text-emerald-200">Kredi Bakiyesi</span>

                                            <div className="flex items-baseline gap-1">

                                                {isUnlimitedUser ? (

                                                    <span className="text-3xl font-bold text-white">SINIRSIZ</span>

                                                ) : (

                                                    <span className="text-3xl font-bold text-white">{aiCredits}</span>

                                                )}

                                                {!isUnlimitedUser && (

                                                    <span className="text-sm text-slate-300">kredi</span>

                                                )}

                                            </div>

                                        </div>

                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-200">

                                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M11.25 3v5.25H6m12 .75v10.5A2.25 2.25 0 0115.75 21H8.25A2.25 2.25 0 016 18.75v-6.5m15-5.5l-9-3.75L3 6.75m18 1.5l-9 3.75-9-3.75" />

                                            </svg>

                                        </div>

                                    </div>

                                    <p className="mt-3 text-xs text-slate-300">

                                        {isUnlimitedUser

                                            ? 'Sınırsız üretim modu aktif.'

                                            : 'Her AI üretimi maliyetine göre kredinizden düşülür.'}

                                    </p>

                                </div>



                                <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner">

                                    <div className="flex items-center justify-between">

                                        <div className="flex flex-col">

                                            <span className="text-xs uppercase tracking-wide text-amber-200">Düello Biletleri</span>

                                            <div className="flex items-baseline gap-1">

                                                {isUnlimitedUser ? (

                                                    <>

                                                        <span className="text-3xl font-bold text-white">SINIRSIZ</span>

                                                        <span className="text-sm text-amber-100">mod</span>

                                                    </>

                                                ) : (

                                                    <>

                                                        <span className="text-3xl font-bold text-white">{duelTickets}</span>

                                                        <span className="text-sm text-amber-100">adet</span>

                                                    </>

                                                )}

                                            </div>

                                        </div>

                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/25 text-amber-100">

                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 8.25A2.25 2.25 0 015.25 6h13.5A2.25 2.25 0 0121 8.25v1.5a1.5 1.5 0 010 3v1.5A2.25 2.25 0 0118.75 18H5.25A2.25 2.25 0 013 15.75v-1.5a1.5 1.5 0 010-3v-1.5zM9 9h6m-6 3h6" />

                                            </svg>

                                        </div>

                                    </div>

                                    <p className="mt-3 text-xs text-slate-300">

                                        {isUnlimitedUser

                                            ? 'İstediğiniz kadar düello başlatabilirsiniz.'

                                            : duelTickets > 0

                                                ? 'Yeni düello başlatırken her maç için 1 bilet kullanılır.'

                                                : 'Görevleri tamamlayarak veya başarılarla yeni biletler kazanın.'}

                                    </p>

                                </div>

                            </div>



                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                <div className="text-xs text-slate-400">

                                    Pro Paketi satın alarak Yazılı Hazırla modunu ve geniş kredi avantajlarını açın.

                                </div>

                                <button

                                    onClick={() => setIsPurchaseSheetOpen(true)}

                                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:scale-105 hover:shadow-emerald-400/50"

                                >

                                    Kredi Satın Al

                                </button>

                            </div>

                            </div>

                        </div>

                    </div>

                </div>

            )}

            </div>

            <header className="flex-shrink-0 p-4 pt-4 text-center sm:pt-6">

                <h1 className="text-3xl font-extrabold text-white flex items-center justify-center gap-3">

                    <span className="flex items-center gap-2">
                        <AiBadge size="lg" />
                        <span>Soru Atölyesi: <span className="text-teal-300">{subjectName}</span></span>
                    </span>

                    {isAdmin && <span className="text-sm font-bold bg-yellow-500 text-slate-900 px-2 py-0.5 rounded-md">ADMİN</span>}

                </h1>

            </header>

            <nav className="flex-shrink-0 flex justify-center items-center gap-2 sm:gap-4 p-3 border-y border-cyan-400/30 bg-gradient-to-r from-slate-950/70 via-slate-900/60 to-indigo-950/60 backdrop-blur-lg flex-wrap">

                {Object.entries(tabConfig).map(([key, { label, icon }], index) => {

                  if (key === 'admin-panel' && !isAdmin) {

                    return null;

                  }

                  return (

                    <button

                        key={key}

                        onClick={() => handleTabSelect(key as TeacherPanelTab)}

                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition-all duration-200 shadow-md

                            ${tabColors[index % tabColors.length]}

                            ${activeTab === key ? 'opacity-50 scale-95' : 'opacity-100 hover:opacity-90 hover:scale-105'}`

                        }

                    >

                        <span>{icon}</span>

                        <span className="hidden sm:inline">{label}</span>

                    </button>

                  );

                })}

            </nav>

            {lockedTabMessage && (

                <div className="px-4 py-3 text-sm text-amber-100 bg-amber-500/20 border-b border-amber-400/30 text-center">

                    {lockedTabMessage}

                </div>

            )}

            <main className="flex-grow overflow-y-auto">

                {renderContent()}

            </main>

        </div>

    </div>

    <CreditPurchaseSheet
      isOpen={isPurchaseSheetOpen}
      onClose={() => setIsPurchaseSheetOpen(false)}
      creditPackages={creditPackages}
      isGuest={userType === 'guest'}
      onRequestAuth={() => navigate('/')}
    />

    </>

  );

};



export default TeacherPanel;








