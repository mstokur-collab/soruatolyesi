import React, { useState, lazy, Suspense, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { LoadingSpinner, AiBadge } from './UI';
import { CreditPurchaseSheet } from './CreditResources';
import GlowButton from './GlowButton';

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

  const hasProAccess = isDevUser

    || isUnlimitedUser

    || Boolean(userData?.creditPlan === 'pro')

    || Boolean(userData?.entitlements?.examGenerator)

    || Boolean(userData?.adminPermissions?.unlimitedCredits);

  const creditPlanLabel = hasProAccess ? 'PRO' : 'Standart Hesap';
  const creditPlanBadgeClasses = hasProAccess
    ? 'bg-gradient-to-r from-amber-300 via-pink-400 to-rose-500 text-slate-900 font-black uppercase tracking-[0.2em] text-sm sm:text-base border border-white/40 shadow-[0_0_14px_rgba(249,115,22,0.55)]'
    : 'bg-slate-700/60 text-slate-200 border border-white/10';



  // activeTab'i admin paneli dışına yönlendirmek için

  useEffect(() => {

    if (!isAdmin && activeTab === 'admin-panel') {

      setActiveTab('generator');

    }

  }, [isAdmin, activeTab]);



  useEffect(() => {

    if (activeTab === 'exams' && !hasProAccess) {

      setActiveTab('generator');

    }

  }, [activeTab, hasProAccess]);



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

  

  const tabGlowPalette = [
    {
      gradientClass: 'bg-gradient-to-br from-[#0b1b3c] via-[#123f61] to-[#36e0b8]',
      borderClass: 'border-cyan-400/60',
      ringClass: 'ring-cyan-300/60',
      hoverClass: 'hover:ring-cyan-100/90 hover:shadow-[0_70px_150px_rgba(54,224,184,0.45)] hover:brightness-110',
      overlayClass: 'bg-gradient-to-br from-[#051225]/60 via-[#0c1c33]/45 to-[#051225]/60',
    },
  ];

  const subjectGlowPalette = [
    {
        gradientClass: 'bg-gradient-to-br from-[#0b1e46] via-[#1d4ed8] to-[#3b82f6]',
        borderClass: 'border-slate-100/70',
        ringClass: 'ring-blue-200/60',
        hoverClass: 'hover:ring-blue-100/90 hover:shadow-[0_55px_120px_rgba(59,130,246,0.45)]',
        overlayClass: 'bg-gradient-to-br from-white/25 via-transparent to-white/5',
    },
    {
        gradientClass: 'bg-gradient-to-br from-[#4c0519] via-[#dc2626] to-[#ef4444]',
        borderClass: 'border-rose-200/70',
        ringClass: 'ring-rose-200/60',
        hoverClass: 'hover:ring-rose-100/90 hover:shadow-[0_55px_120px_rgba(239,68,68,0.45)]',
        overlayClass: 'bg-gradient-to-br from-white/35 via-transparent to-white/5',
    },
    {
        gradientClass: 'bg-gradient-to-br from-[#075c43] via-[#16a34a] to-[#22c55e]',
        borderClass: 'border-emerald-200/70',
        ringClass: 'ring-emerald-200/60',
        hoverClass: 'hover:ring-emerald-100/90 hover:shadow-[0_55px_120px_rgba(16,185,129,0.4)]',
        overlayClass: 'bg-gradient-to-br from-white/30 via-transparent to-white/5',
    },
    {
        gradientClass: 'bg-gradient-to-br from-[#7c2d12] via-[#f97316] to-[#fb923c]',
        borderClass: 'border-amber-200/70',
        ringClass: 'ring-amber-200/60',
        hoverClass: 'hover:ring-amber-100/90 hover:shadow-[0_55px_120px_rgba(251,146,60,0.45)]',
        overlayClass: 'bg-gradient-to-br from-white/40 via-transparent to-white/5',
    },
    {
        gradientClass: 'bg-gradient-to-br from-[#4c1d95] via-[#a855f7] to-[#c084fc]',
        borderClass: 'border-fuchsia-200/60',
        ringClass: 'ring-fuchsia-200/60',
        hoverClass: 'hover:ring-fuchsia-100/90 hover:shadow-[0_55px_120px_rgba(192,132,252,0.45)]',
        overlayClass: 'bg-gradient-to-br from-white/40 via-transparent to-white/5',
    },
    {
        gradientClass: 'bg-gradient-to-br from-[#0f172a] via-[#475569] to-[#94a3b8]',
        borderClass: 'border-slate-100/50',
        ringClass: 'ring-slate-200/60',
        hoverClass: 'hover:ring-slate-100/90 hover:shadow-[0_55px_120px_rgba(148,163,184,0.45)]',
        overlayClass: 'bg-gradient-to-br from-white/30 via-transparent to-white/5',
    },
];



    const handleTabSelect = (tab: TeacherPanelTab) => {

    if (tab === 'exams' && !hasProAccess) {

      setLockedTabMessage('Yazılı Hazırla ve ilgili içerikler sadece Pro paket sahiplerine açıktır.');

      return;

    }

    if (tab === 'documents' && !hasProAccess) {

      setLockedTabMessage('Kütüphanem sadece Pro üyelerde açık.');

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

        if (!hasProAccess) {

          return (

            <div className="p-6 sm:p-10 text-center space-y-4">

              <h3 className="text-2xl font-bold text-amber-300">Yazılı Hazırla sadece Pro üyelerde açık</h3>

              <p className="text-slate-200 max-w-2xl mx-auto">

                Yazılı Hazırla modu, kapsamlı sınav içerikleri oluşturmak isteyen Pro paket sahiplerine özeldir.

                Pro paketi satın alarak bu bölümün kilidini açabilir ve kişiselleştirilmiş sınavlar hazırlayabilirsiniz.

              </p>

              <div className="flex justify-center">

                <button

                  onClick={() => handleTabSelect('tools')}

                  className="px-6 py-3 bg-emerald-500 text-slate-900 font-semibold rounded-lg hover:bg-emerald-400 transition"

                >

                  Paketleri incele

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
        <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6">
            <div className="grade-selection-container max-w-6xl w-full">
                <button onClick={() => navigate('/ana-sayfa')} className="back-button-yellow">← Ana Sayfa</button>
                <h2 className="grade-selection-title flex items-center justify-center gap-2 text-3xl sm:text-4xl">
                    <span>Soru Üretmek İçin Ders Seçin</span>
                </h2>
                <div className="grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
                    {Object.keys(allSubjects).map((id, index) => {
                        const subject = allSubjects[id];
                        const count = getSubjectCount(id);
                        const palette = subjectGlowPalette[index % subjectGlowPalette.length];
                        const isDisabled = count === 0 && userType === 'authenticated' && !isDevUser;

                        return (
                            <GlowButton
                                key={id}
                                onClick={() => handleSubjectSelect(id)}
                                gradientClass={palette.gradientClass}
                                borderClass={palette.borderClass}
                                ringClass={palette.ringClass}
                                hoverClass={palette.hoverClass}
                                overlayClass={palette.overlayClass}
                                disabled={isDisabled || userType === 'guest'}
                                title={isDisabled ? 'Bu derste soru bulunmuyor veya erişiminiz yok' : userType === 'guest' ? 'Bu özelliği kullanmak için giriş yapmalısınız' : ''}
                                className="text-left min-h-[180px] sm:min-h-[200px] px-6 py-6 sm:px-8 sm:py-8"
                            >
                                <div className="flex w-full h-full flex-col items-start justify-between gap-4 text-left">
                                    <span className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">{subject.name}</span>
                                    <span className="text-sm sm:text-base font-bold uppercase tracking-wider rounded-full bg-white/25 px-4 py-2 shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
                                        {userType === 'guest' ? 'Demo' : `${count} SORU`}
                                    </span>
                                </div>
                            </GlowButton>
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

            <nav className="flex-shrink-0 flex flex-wrap md:flex-nowrap justify-center overflow-x-auto md:overflow-visible items-start gap-3 p-3 border-y border-cyan-400/30 bg-gradient-to-br from-[#020617] via-[#06132b] to-[#020617] backdrop-blur-lg">

                {Object.entries(tabConfig).map(([key, { label, icon }], index) => {

                  if (key === 'admin-panel' && !isAdmin) {

                    return null;

                  }

                  const palette = tabGlowPalette[index % tabGlowPalette.length];
                  const isActive = activeTab === key;

                  return (

                    <GlowButton
                        key={key}
                        onClick={() => handleTabSelect(key as TeacherPanelTab)}
                        gradientClass={palette.gradientClass}
                        borderClass={palette.borderClass}
                        ringClass={palette.ringClass}
                        hoverClass={palette.hoverClass}
                        overlayClass={palette.overlayClass}
                        textClass="text-white font-semibold tracking-wide"
                        className={`w-auto min-w-[140px] sm:min-w-[180px] max-w-[220px] px-3 py-3 ${isActive ? 'opacity-95 scale-[0.98]' : 'opacity-100 hover:opacity-95 hover:brightness-110'}`}
                    >
                        <div className="flex flex-col items-center justify-center gap-1 text-center">
                            <span className="text-lg leading-none">{icon}</span>
                            <span className="text-[0.75rem] sm:text-[0.95rem] leading-tight tracking-wide break-words">
                                {label}
                            </span>
                        </div>
                    </GlowButton>

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
