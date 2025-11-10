import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/components/TeacherPanel.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=bff57832"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=bff57832"; const useState = __vite__cjsImport1_react["useState"]; const lazy = __vite__cjsImport1_react["lazy"]; const Suspense = __vite__cjsImport1_react["Suspense"]; const useEffect = __vite__cjsImport1_react["useEffect"];
import { useNavigate } from "/node_modules/.vite/deps/react-router-dom.js?v=bff57832";
import { LoadingSpinner } from "/components/UI.tsx";
import { QuestionGenerator } from "/components/teacher_panel/QuestionGenerator.tsx";
import { QuestionLibrary } from "/components/teacher_panel/QuestionLibrary.tsx";
import { DocumentManager } from "/components/teacher_panel/DocumentManager.tsx";
const ExamGenerator = lazy(_c = () => import("/components/teacher_panel/ExamGenerator.tsx"));
_c2 = ExamGenerator;
import { Tools } from "/components/teacher_panel/Tools.tsx";
import { DuelQuestionGenerator } from "/components/teacher_panel/DuelQuestionGenerator.tsx";
import { useAuth, useData, useGame } from "/contexts/AppContext.tsx";
const AdminPanel = lazy(_c3 = () => import("/components/admin/AdminPanel.tsx"));
_c4 = AdminPanel;
const TeacherPanel = () => {
  _s();
  const { userType, isAdmin, isDevUser, currentUser } = useAuth();
  const {
    userData,
    globalQuestions,
    documentLibrary,
    aiCredits,
    dailyCreditLimit,
    duelTickets
  } = useData();
  const isUnlimitedUser = currentUser?.email === "mstokur@hotmail.com";
  const navigate = useNavigate();
  const {
    selectedSubjectId,
    handleSubjectSelect,
    allSubjects,
    getSubjectCount,
    setSelectedSubjectId,
    subjectName
  } = useGame();
  const [activeTab, setActiveTab] = useState("generator");
  const [lockedTabMessage, setLockedTabMessage] = useState("");
  const hasProExamAccess = isDevUser || isUnlimitedUser || Boolean(userData?.creditPlan === "pro") || Boolean(userData?.entitlements?.examGenerator) || Boolean(userData?.adminPermissions?.unlimitedCredits);
  const creditPlanLabel = hasProExamAccess ? "Pro Öğretmen" : "Standart Hesap";
  useEffect(() => {
    if (!isAdmin && activeTab === "admin-panel") {
      setActiveTab("generator");
    }
  }, [isAdmin, activeTab]);
  useEffect(() => {
    if (activeTab === "exams" && !hasProExamAccess) {
      setActiveTab("generator");
    }
  }, [activeTab, hasProExamAccess]);
  useEffect(() => {
    if (!lockedTabMessage) return;
    const timer = setTimeout(() => setLockedTabMessage(""), 5e3);
    return () => clearTimeout(timer);
  }, [lockedTabMessage]);
  const tabConfig = {
    generator: { label: "Soru Üret", icon: "✨" },
    "duel-generator": { label: "Düello Sorusu Üret", icon: "⚔️" },
    library: { label: `Soru Bankası (${userType === "authenticated" ? globalQuestions.length : "Demo"})`, icon: "📚" },
    documents: { label: `Kütüphanem (${userType === "authenticated" ? documentLibrary.length : "Demo"})`, icon: "📂" },
    exams: { label: "Yazılı Hazırla", icon: "📝" },
    tools: { label: "Araçlar", icon: "🛠️" },
    "admin-panel": { label: "Admin Paneli", icon: "👑" }
  };
  const tabColors = [
    "bg-blue-600",
    "bg-violet-600",
    "bg-emerald-600",
    "bg-rose-600",
    "bg-amber-500",
    "bg-indigo-600",
    "bg-red-700"
    // Admin Paneli Rengi
  ];
  const handleTabSelect = (tab) => {
    if (tab === "exams" && !hasProExamAccess) {
      setLockedTabMessage("Yazılı Hazırla özelliğini kullanabilmek için Pro paketi satın almalısınız.");
      return;
    }
    setLockedTabMessage("");
    setActiveTab(tab);
  };
  const renderContent = () => {
    switch (activeTab) {
      case "generator":
        return /* @__PURE__ */ jsxDEV(QuestionGenerator, {}, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 102,
          columnNumber: 16
        }, this);
      case "duel-generator":
        return /* @__PURE__ */ jsxDEV(DuelQuestionGenerator, {}, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 104,
          columnNumber: 16
        }, this);
      case "library":
        return /* @__PURE__ */ jsxDEV(QuestionLibrary, {}, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 106,
          columnNumber: 16
        }, this);
      case "documents":
        return /* @__PURE__ */ jsxDEV(DocumentManager, {}, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 108,
          columnNumber: 16
        }, this);
      case "exams":
        if (!hasProExamAccess) {
          return /* @__PURE__ */ jsxDEV("div", { className: "p-6 sm:p-10 text-center space-y-4", children: [
            /* @__PURE__ */ jsxDEV("h3", { className: "text-2xl font-bold text-amber-300", children: "Yalnızca Pro Öğretmenlere Açık" }, void 0, false, {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 113,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-slate-200 max-w-2xl mx-auto", children: "Yazılı Hazırla modu, kapsamlı sınav içerikleri oluşturmak isteyen Pro paket sahiplerine özeldir. Pro paketi satın alarak bu bölümün kilidini açabilir ve kişiselleştirilmiş sınavlar hazırlayabilirsiniz." }, void 0, false, {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 114,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => handleTabSelect("tools"),
                className: "px-6 py-3 bg-emerald-500 text-slate-900 font-semibold rounded-lg hover:bg-emerald-400 transition",
                children: "Paketleri İncele"
              },
              void 0,
              false,
              {
                fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                lineNumber: 119,
                columnNumber: 17
              },
              this
            ) }, void 0, false, {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 118,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
            lineNumber: 112,
            columnNumber: 13
          }, this);
        }
        return /* @__PURE__ */ jsxDEV(Suspense, { fallback: /* @__PURE__ */ jsxDEV("div", { className: "flex justify-center items-center h-full", children: /* @__PURE__ */ jsxDEV(LoadingSpinner, {}, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 130,
          columnNumber: 88
        }, this) }, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 130,
          columnNumber: 31
        }, this), children: /* @__PURE__ */ jsxDEV(ExamGenerator, {}, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 131,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 130,
          columnNumber: 11
        }, this);
      case "tools":
        return /* @__PURE__ */ jsxDEV(Tools, {}, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 135,
          columnNumber: 16
        }, this);
      case "admin-panel":
        return /* @__PURE__ */ jsxDEV(Suspense, { fallback: /* @__PURE__ */ jsxDEV("div", { className: "flex justify-center items-center h-full", children: /* @__PURE__ */ jsxDEV(LoadingSpinner, {}, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 138,
          columnNumber: 88
        }, this) }, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 138,
          columnNumber: 31
        }, this), children: /* @__PURE__ */ jsxDEV(AdminPanel, {}, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 139,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 138,
          columnNumber: 11
        }, this);
      default:
        return null;
    }
  };
  if (!selectedSubjectId) {
    return /* @__PURE__ */ jsxDEV("div", { className: "w-full h-full flex justify-center items-center p-4 sm:p-6", children: /* @__PURE__ */ jsxDEV("div", { className: "grade-selection-container", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: () => navigate("/ana-sayfa"), className: "back-button-yellow", children: "← Ana Sayfa" }, void 0, false, {
        fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
        lineNumber: 152,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("h2", { className: "grade-selection-title", children: "AI Atölyesi İçin Ders Seç" }, void 0, false, {
        fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
        lineNumber: 153,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grade-buttons-wrapper subject-selection-grid", children: Object.keys(allSubjects).map((id, index) => {
        const subject = allSubjects[id];
        const count = getSubjectCount(id);
        const colorClass = `color-${index % 6 + 1}`;
        return /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => handleSubjectSelect(id),
            disabled: userType === "guest",
            className: `subject-button ${colorClass}`,
            title: userType === "guest" ? "Bu özelliği kullanmak için giriş yapmalısınız" : "",
            children: [
              /* @__PURE__ */ jsxDEV("span", { className: "subject-button__name", children: subject.name }, void 0, false, {
                fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                lineNumber: 167,
                columnNumber: 29
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "subject-button__count", children: userType === "guest" ? "Demo" : `${count} Soru` }, void 0, false, {
                fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                lineNumber: 168,
                columnNumber: 29
              }, this)
            ]
          },
          id,
          true,
          {
            fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
            lineNumber: 160,
            columnNumber: 17
          },
          this
        );
      }) }, void 0, false, {
        fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
        lineNumber: 154,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
      lineNumber: 151,
      columnNumber: 14
    }, this) }, void 0, false, {
      fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
      lineNumber: 150,
      columnNumber: 7
    }, this);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "w-full h-full flex justify-center items-center p-4 sm:p-6", children: /* @__PURE__ */ jsxDEV("div", { className: "w-full max-w-7xl h-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden relative", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "z-10 flex w-full flex-wrap items-center justify-center gap-3 px-4 pt-6 sm:absolute sm:left-6 sm:top-6 sm:w-auto sm:flex-nowrap sm:px-0 sm:pt-0", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: () => navigate("/ana-sayfa"), className: "bg-amber-400/80 hover:bg-amber-300/90 text-slate-900 font-bold px-4 py-2 rounded-xl backdrop-blur-md transition-transform hover:scale-105 shadow-lg", children: "← Ana Sayfa" }, void 0, false, {
        fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
        lineNumber: 185,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("button", { onClick: () => setSelectedSubjectId(""), className: "bg-indigo-600/90 hover:bg-indigo-500/90 text-white font-bold px-4 py-2 rounded-xl backdrop-blur-md transition-transform hover:scale-105 shadow-lg", children: "Dersi Değiştir" }, void 0, false, {
        fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
        lineNumber: 188,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
      lineNumber: 184,
      columnNumber: 13
    }, this),
    userType === "authenticated" && /* @__PURE__ */ jsxDEV("div", { className: "z-10 mt-4 w-full px-4 sm:absolute sm:top-4 sm:right-6 sm:mt-0 sm:w-[420px] sm:px-0", children: /* @__PURE__ */ jsxDEV("div", { className: "relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/30 shadow-2xl backdrop-blur-xl", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/40 blur-3xl" }, void 0, false, {
        fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
        lineNumber: 195,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" }, void 0, false, {
        fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
        lineNumber: 196,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "relative space-y-5 p-5", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs uppercase tracking-[0.2em] text-slate-300", children: "Hesap Durumu" }, void 0, false, {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 201,
              columnNumber: 37
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-lg font-semibold text-white", children: "AI Kredi & Duello Biletleri" }, void 0, false, {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 202,
              columnNumber: 37
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
            lineNumber: 200,
            columnNumber: 33
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: `flex items-center rounded-full px-3 py-1 text-xs font-semibold ${hasProExamAccess ? "bg-emerald-400/15 text-emerald-200 border border-emerald-300/40" : "bg-slate-700/60 text-slate-200 border border-white/10"}`, children: creditPlanLabel }, void 0, false, {
            fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
            lineNumber: 204,
            columnNumber: 33
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 199,
          columnNumber: 29
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "text-xs uppercase tracking-wide text-emerald-200", children: "Kredi Bakiyesi" }, void 0, false, {
                  fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                  lineNumber: 213,
                  columnNumber: 45
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-baseline gap-1", children: [
                  isUnlimitedUser ? /* @__PURE__ */ jsxDEV("span", { className: "text-3xl font-bold text-white", children: "SINIRSIZ" }, void 0, false, {
                    fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                    lineNumber: 216,
                    columnNumber: 25
                  }, this) : /* @__PURE__ */ jsxDEV("span", { className: "text-3xl font-bold text-white", children: aiCredits }, void 0, false, {
                    fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                    lineNumber: 218,
                    columnNumber: 25
                  }, this),
                  !isUnlimitedUser && /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-slate-300", children: "kredi" }, void 0, false, {
                    fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                    lineNumber: 221,
                    columnNumber: 25
                  }, this)
                ] }, void 0, true, {
                  fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                  lineNumber: 214,
                  columnNumber: 45
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                lineNumber: 212,
                columnNumber: 41
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-200", children: /* @__PURE__ */ jsxDEV("svg", { className: "h-6 w-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxDEV("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.6, d: "M11.25 3v5.25H6m12 .75v10.5A2.25 2.25 0 0115.75 21H8.25A2.25 2.25 0 016 18.75v-6.5m15-5.5l-9-3.75L3 6.75m18 1.5l-9 3.75-9-3.75" }, void 0, false, {
                fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                lineNumber: 227,
                columnNumber: 49
              }, this) }, void 0, false, {
                fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                lineNumber: 226,
                columnNumber: 45
              }, this) }, void 0, false, {
                fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                lineNumber: 225,
                columnNumber: 41
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 211,
              columnNumber: 37
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "mt-3 text-xs text-slate-300", children: isUnlimitedUser ? "Sinirsiz uretim modu aktif." : "Her AI uretimi maliyetine gore kredinizden dusulur." }, void 0, false, {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 231,
              columnNumber: 37
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
            lineNumber: 210,
            columnNumber: 33
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "text-xs uppercase tracking-wide text-amber-200", children: "Duello Biletleri" }, void 0, false, {
                  fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                  lineNumber: 241,
                  columnNumber: 45
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-baseline gap-1", children: isUnlimitedUser ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
                  /* @__PURE__ */ jsxDEV("span", { className: "text-3xl font-bold text-white", children: "SINIRSIZ" }, void 0, false, {
                    fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                    lineNumber: 245,
                    columnNumber: 57
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-amber-100", children: "mod" }, void 0, false, {
                    fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                    lineNumber: 246,
                    columnNumber: 57
                  }, this)
                ] }, void 0, true, {
                  fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                  lineNumber: 244,
                  columnNumber: 25
                }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
                  /* @__PURE__ */ jsxDEV("span", { className: "text-3xl font-bold text-white", children: duelTickets }, void 0, false, {
                    fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                    lineNumber: 250,
                    columnNumber: 57
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-amber-100", children: "adet" }, void 0, false, {
                    fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                    lineNumber: 251,
                    columnNumber: 57
                  }, this)
                ] }, void 0, true, {
                  fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                  lineNumber: 249,
                  columnNumber: 25
                }, this) }, void 0, false, {
                  fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                  lineNumber: 242,
                  columnNumber: 45
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                lineNumber: 240,
                columnNumber: 41
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/25 text-amber-100", children: /* @__PURE__ */ jsxDEV("svg", { className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxDEV("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.6, d: "M3 8.25A2.25 2.25 0 015.25 6h13.5A2.25 2.25 0 0121 8.25v1.5a1.5 1.5 0 010 3v1.5A2.25 2.25 0 0118.75 18H5.25A2.25 2.25 0 013 15.75v-1.5a1.5 1.5 0 010-3v-1.5zM9 9h6m-6 3h6" }, void 0, false, {
                fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                lineNumber: 258,
                columnNumber: 49
              }, this) }, void 0, false, {
                fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                lineNumber: 257,
                columnNumber: 45
              }, this) }, void 0, false, {
                fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
                lineNumber: 256,
                columnNumber: 41
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 239,
              columnNumber: 37
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "mt-3 text-xs text-slate-300", children: isUnlimitedUser ? "Isteginiz kadar duello baslatabilirsiniz." : duelTickets > 0 ? "Yeni duello baslatirken her mac icin 1 bilet kullanilir." : "Gorevleri tamamlayarak veya basarilarla yeni biletler kazanin." }, void 0, false, {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 262,
              columnNumber: 37
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
            lineNumber: 238,
            columnNumber: 33
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 209,
          columnNumber: 29
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-400", children: "Pro Paketi satin alarak Yazili Hazirla modunu ve genis kredi avantajlarini acin." }, void 0, false, {
            fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
            lineNumber: 273,
            columnNumber: 33
          }, this),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => handleTabSelect("tools"),
              className: "inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:scale-105 hover:shadow-emerald-400/50",
              children: "Kredi Satin Al"
            },
            void 0,
            false,
            {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 276,
              columnNumber: 33
            },
            this
          )
        ] }, void 0, true, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 272,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
        lineNumber: 198,
        columnNumber: 25
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
      lineNumber: 194,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
      lineNumber: 193,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("header", { className: "flex-shrink-0 p-4 pt-8 text-center sm:pt-24", children: /* @__PURE__ */ jsxDEV("h1", { className: "text-3xl font-extrabold text-white flex items-center justify-center gap-3", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "AI Soru Atölyesi: ",
        /* @__PURE__ */ jsxDEV("span", { className: "text-teal-300", children: subjectName }, void 0, false, {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 289,
          columnNumber: 45
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
        lineNumber: 289,
        columnNumber: 21
      }, this),
      isAdmin && /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold bg-yellow-500 text-slate-900 px-2 py-0.5 rounded-md", children: "ADMİN" }, void 0, false, {
        fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
        lineNumber: 290,
        columnNumber: 33
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
      lineNumber: 288,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
      lineNumber: 287,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("nav", { className: "flex-shrink-0 flex justify-center items-center gap-2 sm:gap-4 p-3 border-b border-t border-violet-500/30 bg-black/20 flex-wrap", children: Object.entries(tabConfig).map(([key, { label, icon }], index) => {
      if (key === "admin-panel" && !isAdmin) {
        return null;
      }
      return /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => handleTabSelect(key),
          className: `flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition-all duration-200 shadow-md
                            ${tabColors[index % tabColors.length]}
                            ${activeTab === key ? "opacity-50 scale-95" : "opacity-100 hover:opacity-90 hover:scale-105"}`,
          children: [
            /* @__PURE__ */ jsxDEV("span", { children: icon }, void 0, false, {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 307,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "hidden sm:inline", children: label }, void 0, false, {
              fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
              lineNumber: 308,
              columnNumber: 25
            }, this)
          ]
        },
        key,
        true,
        {
          fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
          lineNumber: 299,
          columnNumber: 15
        },
        this
      );
    }) }, void 0, false, {
      fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
      lineNumber: 293,
      columnNumber: 13
    }, this),
    lockedTabMessage && /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 text-sm text-amber-100 bg-amber-500/20 border-b border-amber-400/30 text-center", children: lockedTabMessage }, void 0, false, {
      fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
      lineNumber: 314,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("main", { className: "flex-grow overflow-y-auto", children: renderContent() }, void 0, false, {
      fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
      lineNumber: 318,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
    lineNumber: 183,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx",
    lineNumber: 182,
    columnNumber: 5
  }, this);
};
_s(TeacherPanel, "iudyDZR3A7zigc0tV2O90RAp3fs=", false, function() {
  return [useAuth, useData, useNavigate, useGame];
});
_c5 = TeacherPanel;
export default TeacherPanel;
var _c, _c2, _c3, _c4, _c5;
$RefreshReg$(_c, "ExamGenerator$lazy");
$RefreshReg$(_c2, "ExamGenerator");
$RefreshReg$(_c3, "AdminPanel$lazy");
$RefreshReg$(_c4, "AdminPanel");
$RefreshReg$(_c5, "TeacherPanel");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "C:/Users/MUSTAFA/Desktop/06.11.2025 23.59/components/TeacherPanel.tsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBcUdlLFNBOElxQyxVQTlJckM7O0FBckdmLFNBQWdCQSxVQUFVQyxNQUFNQyxVQUFVQyxpQkFBaUI7QUFDM0QsU0FBU0MsbUJBQW1CO0FBQzVCLFNBQVNDLHNCQUFzQjtBQUMvQixTQUFTQyx5QkFBeUI7QUFDbEMsU0FBU0MsdUJBQXVCO0FBQ2hDLFNBQVNDLHVCQUF1QjtBQUVoQyxNQUFNQyxnQkFBZ0JSLEtBQUlTLEtBQUNBLE1BQU0sT0FBTywrQkFBK0IsQ0FBQztBQUFFQyxNQUFwRUY7QUFDTixTQUFTRyxhQUFhO0FBQ3RCLFNBQVNDLDZCQUE2QjtBQUN0QyxTQUFTQyxTQUFTQyxTQUFTQyxlQUFlO0FBRzFDLE1BQU1DLGFBQWFoQixLQUFJaUIsTUFBQ0EsTUFBTSxPQUFPLG9CQUFvQixDQUFDO0FBQUVDLE1BQXRERjtBQUlOLE1BQU1HLGVBQXlCQSxNQUFNO0FBQUFDLEtBQUE7QUFDbkMsUUFBTSxFQUFFQyxVQUFVQyxTQUFTQyxXQUFXQyxZQUFZLElBQUlYLFFBQVE7QUFDOUQsUUFBTTtBQUFBLElBQ0pZO0FBQUFBLElBQ0FDO0FBQUFBLElBQ0FDO0FBQUFBLElBQ0FDO0FBQUFBLElBQ0FDO0FBQUFBLElBQ0FDO0FBQUFBLEVBQ0YsSUFBSWhCLFFBQVE7QUFHWixRQUFNaUIsa0JBQWtCUCxhQUFhUSxVQUFVO0FBQy9DLFFBQU1DLFdBQVc5QixZQUFZO0FBRTdCLFFBQU07QUFBQSxJQUNKK0I7QUFBQUEsSUFDQUM7QUFBQUEsSUFDQUM7QUFBQUEsSUFDQUM7QUFBQUEsSUFDQUM7QUFBQUEsSUFDQUM7QUFBQUEsRUFDRixJQUFJeEIsUUFBUTtBQUVaLFFBQU0sQ0FBQ3lCLFdBQVdDLFlBQVksSUFBSTFDLFNBQTBCLFdBQVc7QUFDdkUsUUFBTSxDQUFDMkMsa0JBQWtCQyxtQkFBbUIsSUFBSTVDLFNBQVMsRUFBRTtBQUMzRCxRQUFNNkMsbUJBQW1CckIsYUFDcEJRLG1CQUNBYyxRQUFRcEIsVUFBVXFCLGVBQWUsS0FBSyxLQUN0Q0QsUUFBUXBCLFVBQVVzQixjQUFjQyxhQUFhLEtBQzdDSCxRQUFRcEIsVUFBVXdCLGtCQUFrQkMsZ0JBQWdCO0FBQ3pELFFBQU1DLGtCQUFrQlAsbUJBQW1CLGlCQUFpQjtBQUc1RDFDLFlBQVUsTUFBTTtBQUNkLFFBQUksQ0FBQ29CLFdBQVdrQixjQUFjLGVBQWU7QUFDM0NDLG1CQUFhLFdBQVc7QUFBQSxJQUMxQjtBQUFBLEVBQ0YsR0FBRyxDQUFDbkIsU0FBU2tCLFNBQVMsQ0FBQztBQUV2QnRDLFlBQVUsTUFBTTtBQUNkLFFBQUlzQyxjQUFjLFdBQVcsQ0FBQ0ksa0JBQWtCO0FBQzlDSCxtQkFBYSxXQUFXO0FBQUEsSUFDMUI7QUFBQSxFQUNGLEdBQUcsQ0FBQ0QsV0FBV0ksZ0JBQWdCLENBQUM7QUFFaEMxQyxZQUFVLE1BQU07QUFDZCxRQUFJLENBQUN3QyxpQkFBa0I7QUFDdkIsVUFBTVUsUUFBUUMsV0FBVyxNQUFNVixvQkFBb0IsRUFBRSxHQUFHLEdBQUk7QUFDNUQsV0FBTyxNQUFNVyxhQUFhRixLQUFLO0FBQUEsRUFDakMsR0FBRyxDQUFDVixnQkFBZ0IsQ0FBQztBQUVyQixRQUFNYSxZQUFZO0FBQUEsSUFDaEJDLFdBQVcsRUFBRUMsT0FBTyxhQUFhQyxNQUFNLElBQUk7QUFBQSxJQUMzQyxrQkFBa0IsRUFBRUQsT0FBTyxzQkFBc0JDLE1BQU0sS0FBSztBQUFBLElBQzVEQyxTQUFTLEVBQUVGLE9BQU8saUJBQWlCcEMsYUFBYSxrQkFBa0JLLGdCQUFnQmtDLFNBQVMsTUFBTSxLQUFLRixNQUFNLEtBQUs7QUFBQSxJQUNqSEcsV0FBVyxFQUFFSixPQUFPLGVBQWVwQyxhQUFhLGtCQUFrQk0sZ0JBQWdCaUMsU0FBUyxNQUFNLEtBQUtGLE1BQU0sS0FBSztBQUFBLElBQ2pISSxPQUFPLEVBQUVMLE9BQU8sa0JBQWtCQyxNQUFNLEtBQUs7QUFBQSxJQUM3Q0ssT0FBTyxFQUFFTixPQUFPLFdBQVdDLE1BQU0sTUFBTTtBQUFBLElBQ3ZDLGVBQWUsRUFBRUQsT0FBTyxnQkFBZ0JDLE1BQU0sS0FBSztBQUFBLEVBQ3JEO0FBRUEsUUFBTU0sWUFBWTtBQUFBLElBQ2hCO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUE7QUFBQSxFQUFhO0FBR2YsUUFBTUMsa0JBQWtCQSxDQUFDQyxRQUF5QjtBQUNoRCxRQUFJQSxRQUFRLFdBQVcsQ0FBQ3RCLGtCQUFrQjtBQUN4Q0QsMEJBQW9CLDRFQUE0RTtBQUNoRztBQUFBLElBQ0Y7QUFDQUEsd0JBQW9CLEVBQUU7QUFDdEJGLGlCQUFheUIsR0FBRztBQUFBLEVBQ2xCO0FBRUEsUUFBTUMsZ0JBQWdCQSxNQUFNO0FBQzFCLFlBQVEzQixXQUFTO0FBQUEsTUFDZixLQUFLO0FBQ0gsZUFBTyx1QkFBQyx1QkFBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWtCO0FBQUEsTUFDM0IsS0FBSztBQUNILGVBQU8sdUJBQUMsMkJBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFzQjtBQUFBLE1BQy9CLEtBQUs7QUFDSCxlQUFPLHVCQUFDLHFCQUFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBZ0I7QUFBQSxNQUN6QixLQUFLO0FBQ0gsZUFBTyx1QkFBQyxxQkFBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWdCO0FBQUEsTUFDekIsS0FBSztBQUNILFlBQUksQ0FBQ0ksa0JBQWtCO0FBQ3JCLGlCQUNFLHVCQUFDLFNBQUksV0FBVSxxQ0FDYjtBQUFBLG1DQUFDLFFBQUcsV0FBVSxxQ0FBb0MsOENBQWxEO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQWdGO0FBQUEsWUFDaEYsdUJBQUMsT0FBRSxXQUFVLG9DQUFtQyx5TkFBaEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFHQTtBQUFBLFlBQ0EsdUJBQUMsU0FBSSxXQUFVLHVCQUNiO0FBQUEsY0FBQztBQUFBO0FBQUEsZ0JBQ0MsU0FBUyxNQUFNcUIsZ0JBQWdCLE9BQU87QUFBQSxnQkFDdEMsV0FBVTtBQUFBLGdCQUFrRztBQUFBO0FBQUEsY0FGOUc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBS0EsS0FORjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQU9BO0FBQUEsZUFiRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQWNBO0FBQUEsUUFFSjtBQUNBLGVBQ0UsdUJBQUMsWUFBUyxVQUFVLHVCQUFDLFNBQUksV0FBVSwyQ0FBMEMsaUNBQUMsb0JBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFlLEtBQXhFO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBMkUsR0FDN0YsaUNBQUMsbUJBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFjLEtBRGhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLE1BRUosS0FBSztBQUNILGVBQU8sdUJBQUMsV0FBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQU07QUFBQSxNQUNmLEtBQUs7QUFDSCxlQUNFLHVCQUFDLFlBQVMsVUFBVSx1QkFBQyxTQUFJLFdBQVUsMkNBQTBDLGlDQUFDLG9CQUFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBZSxLQUF4RTtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTJFLEdBQzdGLGlDQUFDLGdCQUFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBVyxLQURiO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLE1BRUo7QUFDRSxlQUFPO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFHQSxNQUFJLENBQUMvQixtQkFBbUI7QUFDdEIsV0FDSSx1QkFBQyxTQUFJLFdBQVUsNkRBQ1YsaUNBQUMsU0FBSSxXQUFVLDZCQUNaO0FBQUEsNkJBQUMsWUFBTyxTQUFTLE1BQU1ELFNBQVMsWUFBWSxHQUFHLFdBQVUsc0JBQXFCLDJCQUE5RTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXlGO0FBQUEsTUFDekYsdUJBQUMsUUFBRyxXQUFVLHlCQUF3Qix5Q0FBdEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUErRDtBQUFBLE1BQy9ELHVCQUFDLFNBQUksV0FBVSxnREFDVm1DLGlCQUFPQyxLQUFLakMsV0FBVyxFQUFFa0MsSUFBSSxDQUFDQyxJQUFJQyxVQUFVO0FBQzdDLGNBQU1DLFVBQVVyQyxZQUFZbUMsRUFBRTtBQUM5QixjQUFNRyxRQUFRckMsZ0JBQWdCa0MsRUFBRTtBQUNoQyxjQUFNSSxhQUFhLFNBQVVILFFBQVEsSUFBSyxDQUFDO0FBQzNDLGVBQ0k7QUFBQSxVQUFDO0FBQUE7QUFBQSxZQUVHLFNBQVMsTUFBTXJDLG9CQUFvQm9DLEVBQUU7QUFBQSxZQUNyQyxVQUFVbEQsYUFBYTtBQUFBLFlBQ3ZCLFdBQVcsa0JBQWtCc0QsVUFBVTtBQUFBLFlBQ3ZDLE9BQU90RCxhQUFhLFVBQVUsa0RBQWtEO0FBQUEsWUFFaEY7QUFBQSxxQ0FBQyxVQUFLLFdBQVUsd0JBQXdCb0Qsa0JBQVFHLFFBQWhEO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXFEO0FBQUEsY0FDckQsdUJBQUMsVUFBSyxXQUFVLHlCQUNmdkQsdUJBQWEsVUFBVSxTQUFTLEdBQUdxRCxLQUFLLFdBRHpDO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBRUE7QUFBQTtBQUFBO0FBQUEsVUFUS0g7QUFBQUEsVUFEVDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBV0E7QUFBQSxNQUVKLENBQUMsS0FuQkw7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQW9CQTtBQUFBLFNBdkJIO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0F3QkQsS0F6Qko7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQTBCQTtBQUFBLEVBRU47QUFHQSxTQUNHLHVCQUFDLFNBQUksV0FBVSw2REFDWixpQ0FBQyxTQUFJLFdBQVUsOEtBQ1g7QUFBQSwyQkFBQyxTQUFJLFdBQVUsa0pBQ1g7QUFBQSw2QkFBQyxZQUFPLFNBQVMsTUFBTXRDLFNBQVMsWUFBWSxHQUFHLFdBQVUsdUpBQXNKLDJCQUEvTTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUE7QUFBQSxNQUNBLHVCQUFDLFlBQU8sU0FBUyxNQUFNSyxxQkFBcUIsRUFBRSxHQUFHLFdBQVUscUpBQW9KLDhCQUEvTTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUE7QUFBQSxTQU5KO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FPQTtBQUFBLElBQ0VqQixhQUFhLG1CQUNYLHVCQUFDLFNBQUksV0FBVSxzRkFDWCxpQ0FBQyxTQUFJLFdBQVUsZ0tBQ1g7QUFBQSw2QkFBQyxTQUFJLFdBQVUsa0ZBQWY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE4RjtBQUFBLE1BQzlGLHVCQUFDLFNBQUksV0FBVSxnRkFBZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQTRGO0FBQUEsTUFFNUYsdUJBQUMsU0FBSSxXQUFVLDBCQUNYO0FBQUEsK0JBQUMsU0FBSSxXQUFVLDJDQUNYO0FBQUEsaUNBQUMsU0FDRztBQUFBLG1DQUFDLE9BQUUsV0FBVSxxREFBb0QsNEJBQWpFO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTZFO0FBQUEsWUFDN0UsdUJBQUMsT0FBRSxXQUFVLG9DQUFtQywyQ0FBaEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBMkU7QUFBQSxlQUYvRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUdBO0FBQUEsVUFDQSx1QkFBQyxVQUFLLFdBQVcsa0VBQWtFdUIsbUJBQW1CLG9FQUFvRSx1REFBdUQsSUFDNU5PLDZCQURMO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUE7QUFBQSxhQVBKO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFRQTtBQUFBLFFBRUEsdUJBQUMsU0FBSSxXQUFVLHlDQUNYO0FBQUEsaUNBQUMsU0FBSSxXQUFVLGlFQUNYO0FBQUEsbUNBQUMsU0FBSSxXQUFVLHFDQUNYO0FBQUEscUNBQUMsU0FBSSxXQUFVLGlCQUNYO0FBQUEsdUNBQUMsVUFBSyxXQUFVLG9EQUFtRCw4QkFBbkU7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFBaUY7QUFBQSxnQkFDakYsdUJBQUMsU0FBSSxXQUFVLDZCQUNWcEI7QUFBQUEsb0NBQ0csdUJBQUMsVUFBSyxXQUFVLGlDQUFnQyx3QkFBaEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBd0QsSUFFeEQsdUJBQUMsVUFBSyxXQUFVLGlDQUFpQ0gsdUJBQWpEO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQTJEO0FBQUEsa0JBRTlELENBQUNHLG1CQUNFLHVCQUFDLFVBQUssV0FBVSwwQkFBeUIscUJBQXpDO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQThDO0FBQUEscUJBUHREO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBU0E7QUFBQSxtQkFYSjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQVlBO0FBQUEsY0FDQSx1QkFBQyxTQUFJLFdBQVUsNkZBQ1gsaUNBQUMsU0FBSSxXQUFVLFdBQVUsTUFBSyxRQUFPLFFBQU8sZ0JBQWUsU0FBUSxhQUMvRCxpQ0FBQyxVQUFLLGVBQWMsU0FBUSxnQkFBZSxTQUFRLGFBQWEsS0FBSyxHQUFFLG9JQUF2RTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUF1TSxLQUQzTTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUVBLEtBSEo7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFJQTtBQUFBLGlCQWxCSjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQW1CQTtBQUFBLFlBQ0EsdUJBQUMsT0FBRSxXQUFVLCtCQUNSQSw0QkFDSyxnQ0FDQSx5REFIVjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUlBO0FBQUEsZUF6Qko7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkEwQkE7QUFBQSxVQUVBLHVCQUFDLFNBQUksV0FBVSxpRUFDWDtBQUFBLG1DQUFDLFNBQUksV0FBVSxxQ0FDWDtBQUFBLHFDQUFDLFNBQUksV0FBVSxpQkFDWDtBQUFBLHVDQUFDLFVBQUssV0FBVSxrREFBaUQsZ0NBQWpFO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQWlGO0FBQUEsZ0JBQ2pGLHVCQUFDLFNBQUksV0FBVSw2QkFDVkEsNEJBQ0csbUNBQ0k7QUFBQSx5Q0FBQyxVQUFLLFdBQVUsaUNBQWdDLHdCQUFoRDtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUF3RDtBQUFBLGtCQUN4RCx1QkFBQyxVQUFLLFdBQVUsMEJBQXlCLG1CQUF6QztBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUE0QztBQUFBLHFCQUZoRDtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUdBLElBRUEsbUNBQ0k7QUFBQSx5Q0FBQyxVQUFLLFdBQVUsaUNBQWlDRCx5QkFBakQ7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBNkQ7QUFBQSxrQkFDN0QsdUJBQUMsVUFBSyxXQUFVLDBCQUF5QixvQkFBekM7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBNkM7QUFBQSxxQkFGakQ7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFHQSxLQVZSO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBWUE7QUFBQSxtQkFkSjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQWVBO0FBQUEsY0FDQSx1QkFBQyxTQUFJLFdBQVUseUZBQ1gsaUNBQUMsU0FBSSxXQUFVLFdBQVUsTUFBSyxRQUFPLFNBQVEsYUFBWSxRQUFPLGdCQUM1RCxpQ0FBQyxVQUFLLGVBQWMsU0FBUSxnQkFBZSxTQUFRLGFBQWEsS0FBSyxHQUFFLCtLQUF2RTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFrUCxLQUR0UDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUVBLEtBSEo7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFJQTtBQUFBLGlCQXJCSjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQXNCQTtBQUFBLFlBQ0EsdUJBQUMsT0FBRSxXQUFVLCtCQUNSQyw0QkFDSyw4Q0FDQUQsY0FBYyxJQUNWLDZEQUNBLG9FQUxkO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBTUE7QUFBQSxlQTlCSjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQStCQTtBQUFBLGFBNURKO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUE2REE7QUFBQSxRQUVBLHVCQUFDLFNBQUksV0FBVSxzRUFDWDtBQUFBLGlDQUFDLFNBQUksV0FBVSwwQkFBeUIsZ0dBQXhDO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUE7QUFBQSxVQUNBO0FBQUEsWUFBQztBQUFBO0FBQUEsY0FDRyxTQUFTLE1BQU1tQyxnQkFBZ0IsT0FBTztBQUFBLGNBQ3RDLFdBQVU7QUFBQSxjQUFzUDtBQUFBO0FBQUEsWUFGcFE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFVBS0E7QUFBQSxhQVRKO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFVQTtBQUFBLFdBcEZKO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFxRkE7QUFBQSxTQXpGSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBMEZBLEtBM0ZKO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0E0RkE7QUFBQSxJQUVKLHVCQUFDLFlBQU8sV0FBVSwrQ0FDZCxpQ0FBQyxRQUFHLFdBQVUsNkVBQ1Y7QUFBQSw2QkFBQyxVQUFLO0FBQUE7QUFBQSxRQUFrQix1QkFBQyxVQUFLLFdBQVUsaUJBQWlCMUIseUJBQWpDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBNkM7QUFBQSxXQUFyRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQTRFO0FBQUEsTUFDM0VqQixXQUFXLHVCQUFDLFVBQUssV0FBVSx5RUFBd0UscUJBQXhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBNkY7QUFBQSxTQUY3RztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBR0EsS0FKSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBS0E7QUFBQSxJQUNBLHVCQUFDLFNBQUksV0FBVSxrSUFDVjhDLGlCQUFPUyxRQUFRdEIsU0FBUyxFQUFFZSxJQUFJLENBQUMsQ0FBQ1EsS0FBSyxFQUFFckIsT0FBT0MsS0FBSyxDQUFDLEdBQUdjLFVBQVU7QUFDaEUsVUFBSU0sUUFBUSxpQkFBaUIsQ0FBQ3hELFNBQVM7QUFDckMsZUFBTztBQUFBLE1BQ1Q7QUFDQSxhQUNFO0FBQUEsUUFBQztBQUFBO0FBQUEsVUFFRyxTQUFTLE1BQU0yQyxnQkFBZ0JhLEdBQXNCO0FBQUEsVUFDckQsV0FBVztBQUFBLDhCQUNMZCxVQUFVUSxRQUFRUixVQUFVSixNQUFNLENBQUM7QUFBQSw4QkFDbkNwQixjQUFjc0MsTUFBTSx3QkFBd0IsOENBQThDO0FBQUEsVUFHaEc7QUFBQSxtQ0FBQyxVQUFNcEIsa0JBQVA7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBWTtBQUFBLFlBQ1osdUJBQUMsVUFBSyxXQUFVLG9CQUFvQkQsbUJBQXBDO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTBDO0FBQUE7QUFBQTtBQUFBLFFBUnJDcUI7QUFBQUEsUUFEVDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BVUE7QUFBQSxJQUVKLENBQUMsS0FsQkw7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQW1CQTtBQUFBLElBQ0NwQyxvQkFDRyx1QkFBQyxTQUFJLFdBQVUsNkZBQ1ZBLDhCQURMO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FFQTtBQUFBLElBRUosdUJBQUMsVUFBSyxXQUFVLDZCQUNYeUIsd0JBQWMsS0FEbkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUVBO0FBQUEsT0F6SUo7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQTBJQSxLQTNJSDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBNElEO0FBRUo7QUFBRS9DLEdBbFRJRCxjQUFzQjtBQUFBLFVBQzRCTixTQVFsREMsU0FJYVgsYUFTYlksT0FBTztBQUFBO0FBQUFnRSxNQXRCUDVEO0FBb1ROLGVBQWVBO0FBQWEsSUFBQVYsSUFBQUMsS0FBQU8sS0FBQUMsS0FBQTZEO0FBQUFDLGFBQUF2RSxJQUFBO0FBQUF1RSxhQUFBdEUsS0FBQTtBQUFBc0UsYUFBQS9ELEtBQUE7QUFBQStELGFBQUE5RCxLQUFBO0FBQUE4RCxhQUFBRCxLQUFBIiwibmFtZXMiOlsidXNlU3RhdGUiLCJsYXp5IiwiU3VzcGVuc2UiLCJ1c2VFZmZlY3QiLCJ1c2VOYXZpZ2F0ZSIsIkxvYWRpbmdTcGlubmVyIiwiUXVlc3Rpb25HZW5lcmF0b3IiLCJRdWVzdGlvbkxpYnJhcnkiLCJEb2N1bWVudE1hbmFnZXIiLCJFeGFtR2VuZXJhdG9yIiwiX2MiLCJfYzIiLCJUb29scyIsIkR1ZWxRdWVzdGlvbkdlbmVyYXRvciIsInVzZUF1dGgiLCJ1c2VEYXRhIiwidXNlR2FtZSIsIkFkbWluUGFuZWwiLCJfYzMiLCJfYzQiLCJUZWFjaGVyUGFuZWwiLCJfcyIsInVzZXJUeXBlIiwiaXNBZG1pbiIsImlzRGV2VXNlciIsImN1cnJlbnRVc2VyIiwidXNlckRhdGEiLCJnbG9iYWxRdWVzdGlvbnMiLCJkb2N1bWVudExpYnJhcnkiLCJhaUNyZWRpdHMiLCJkYWlseUNyZWRpdExpbWl0IiwiZHVlbFRpY2tldHMiLCJpc1VubGltaXRlZFVzZXIiLCJlbWFpbCIsIm5hdmlnYXRlIiwic2VsZWN0ZWRTdWJqZWN0SWQiLCJoYW5kbGVTdWJqZWN0U2VsZWN0IiwiYWxsU3ViamVjdHMiLCJnZXRTdWJqZWN0Q291bnQiLCJzZXRTZWxlY3RlZFN1YmplY3RJZCIsInN1YmplY3ROYW1lIiwiYWN0aXZlVGFiIiwic2V0QWN0aXZlVGFiIiwibG9ja2VkVGFiTWVzc2FnZSIsInNldExvY2tlZFRhYk1lc3NhZ2UiLCJoYXNQcm9FeGFtQWNjZXNzIiwiQm9vbGVhbiIsImNyZWRpdFBsYW4iLCJlbnRpdGxlbWVudHMiLCJleGFtR2VuZXJhdG9yIiwiYWRtaW5QZXJtaXNzaW9ucyIsInVubGltaXRlZENyZWRpdHMiLCJjcmVkaXRQbGFuTGFiZWwiLCJ0aW1lciIsInNldFRpbWVvdXQiLCJjbGVhclRpbWVvdXQiLCJ0YWJDb25maWciLCJnZW5lcmF0b3IiLCJsYWJlbCIsImljb24iLCJsaWJyYXJ5IiwibGVuZ3RoIiwiZG9jdW1lbnRzIiwiZXhhbXMiLCJ0b29scyIsInRhYkNvbG9ycyIsImhhbmRsZVRhYlNlbGVjdCIsInRhYiIsInJlbmRlckNvbnRlbnQiLCJPYmplY3QiLCJrZXlzIiwibWFwIiwiaWQiLCJpbmRleCIsInN1YmplY3QiLCJjb3VudCIsImNvbG9yQ2xhc3MiLCJuYW1lIiwiZW50cmllcyIsImtleSIsIl9jNSIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJUZWFjaGVyUGFuZWwudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCwgeyB1c2VTdGF0ZSwgbGF6eSwgU3VzcGVuc2UsIHVzZUVmZmVjdCB9IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IHsgdXNlTmF2aWdhdGUgfSBmcm9tICdyZWFjdC1yb3V0ZXItZG9tJztcclxuaW1wb3J0IHsgTG9hZGluZ1NwaW5uZXIgfSBmcm9tICcuL1VJJztcclxuaW1wb3J0IHsgUXVlc3Rpb25HZW5lcmF0b3IgfSBmcm9tICcuL3RlYWNoZXJfcGFuZWwvUXVlc3Rpb25HZW5lcmF0b3InO1xyXG5pbXBvcnQgeyBRdWVzdGlvbkxpYnJhcnkgfSBmcm9tICcuL3RlYWNoZXJfcGFuZWwvUXVlc3Rpb25MaWJyYXJ5JztcclxuaW1wb3J0IHsgRG9jdW1lbnRNYW5hZ2VyIH0gZnJvbSAnLi90ZWFjaGVyX3BhbmVsL0RvY3VtZW50TWFuYWdlcic7XHJcbi8vIEZJWDogTGF6aWx5IGltcG9ydCBFeGFtR2VuZXJhdG9yIHRvIHJlc29sdmUgbW9kdWxlIGxvYWRpbmcgaXNzdWUgYW5kIGltcHJvdmUgcGVyZm9ybWFuY2UuXHJcbmNvbnN0IEV4YW1HZW5lcmF0b3IgPSBsYXp5KCgpID0+IGltcG9ydCgnLi90ZWFjaGVyX3BhbmVsL0V4YW1HZW5lcmF0b3InKSk7XHJcbmltcG9ydCB7IFRvb2xzIH0gZnJvbSAnLi90ZWFjaGVyX3BhbmVsL1Rvb2xzJztcclxuaW1wb3J0IHsgRHVlbFF1ZXN0aW9uR2VuZXJhdG9yIH0gZnJvbSAnLi90ZWFjaGVyX3BhbmVsL0R1ZWxRdWVzdGlvbkdlbmVyYXRvcic7XHJcbmltcG9ydCB7IHVzZUF1dGgsIHVzZURhdGEsIHVzZUdhbWUgfSBmcm9tICcuLi9jb250ZXh0cy9BcHBDb250ZXh0JztcclxuXHJcbi8vIEFkbWluIHBhbmVsaW5pIHNhZGVjZSBnZXJla3RpxJ9pbmRlIHnDvGtsZW1layBpw6dpbiBsYXp5IGltcG9ydFxyXG5jb25zdCBBZG1pblBhbmVsID0gbGF6eSgoKSA9PiBpbXBvcnQoJy4vYWRtaW4vQWRtaW5QYW5lbCcpKTtcclxuXHJcbnR5cGUgVGVhY2hlclBhbmVsVGFiID0gJ2dlbmVyYXRvcicgfCAnbGlicmFyeScgfCAnZG9jdW1lbnRzJyB8ICdleGFtcycgfCAndG9vbHMnIHwgJ2R1ZWwtZ2VuZXJhdG9yJyB8ICdhZG1pbi1wYW5lbCc7XHJcblxyXG5jb25zdCBUZWFjaGVyUGFuZWw6IFJlYWN0LkZDID0gKCkgPT4ge1xyXG4gIGNvbnN0IHsgdXNlclR5cGUsIGlzQWRtaW4sIGlzRGV2VXNlciwgY3VycmVudFVzZXIgfSA9IHVzZUF1dGgoKTtcclxuICBjb25zdCB7IFxyXG4gICAgdXNlckRhdGEsXHJcbiAgICBnbG9iYWxRdWVzdGlvbnMsXHJcbiAgICBkb2N1bWVudExpYnJhcnksXHJcbiAgICBhaUNyZWRpdHMsXHJcbiAgICBkYWlseUNyZWRpdExpbWl0LFxyXG4gICAgZHVlbFRpY2tldHNcclxuICB9ID0gdXNlRGF0YSgpO1xyXG4gIFxyXG4gIC8vIG1zdG9rdXJAaG90bWFpbC5jb20gacOnaW4gc29uc3V6IGtyZWRpIGtvbnRyb2zDvFxyXG4gIGNvbnN0IGlzVW5saW1pdGVkVXNlciA9IGN1cnJlbnRVc2VyPy5lbWFpbCA9PT0gJ21zdG9rdXJAaG90bWFpbC5jb20nO1xyXG4gIGNvbnN0IG5hdmlnYXRlID0gdXNlTmF2aWdhdGUoKTtcclxuXHJcbiAgY29uc3QgeyBcclxuICAgIHNlbGVjdGVkU3ViamVjdElkLCBcclxuICAgIGhhbmRsZVN1YmplY3RTZWxlY3QsIFxyXG4gICAgYWxsU3ViamVjdHMsIFxyXG4gICAgZ2V0U3ViamVjdENvdW50LFxyXG4gICAgc2V0U2VsZWN0ZWRTdWJqZWN0SWQsXHJcbiAgICBzdWJqZWN0TmFtZVxyXG4gIH0gPSB1c2VHYW1lKCk7XHJcblxyXG4gIGNvbnN0IFthY3RpdmVUYWIsIHNldEFjdGl2ZVRhYl0gPSB1c2VTdGF0ZTxUZWFjaGVyUGFuZWxUYWI+KCdnZW5lcmF0b3InKTtcclxuICBjb25zdCBbbG9ja2VkVGFiTWVzc2FnZSwgc2V0TG9ja2VkVGFiTWVzc2FnZV0gPSB1c2VTdGF0ZSgnJyk7XHJcbiAgY29uc3QgaGFzUHJvRXhhbUFjY2VzcyA9IGlzRGV2VXNlclxyXG4gICAgfHwgaXNVbmxpbWl0ZWRVc2VyXHJcbiAgICB8fCBCb29sZWFuKHVzZXJEYXRhPy5jcmVkaXRQbGFuID09PSAncHJvJylcclxuICAgIHx8IEJvb2xlYW4odXNlckRhdGE/LmVudGl0bGVtZW50cz8uZXhhbUdlbmVyYXRvcilcclxuICAgIHx8IEJvb2xlYW4odXNlckRhdGE/LmFkbWluUGVybWlzc2lvbnM/LnVubGltaXRlZENyZWRpdHMpO1xyXG4gIGNvbnN0IGNyZWRpdFBsYW5MYWJlbCA9IGhhc1Byb0V4YW1BY2Nlc3MgPyAnUHJvIMOWxJ9yZXRtZW4nIDogJ1N0YW5kYXJ0IEhlc2FwJztcclxuXHJcbiAgLy8gYWN0aXZlVGFiJ2kgYWRtaW4gcGFuZWxpIGTEscWfxLFuYSB5w7ZubGVuZGlybWVrIGnDp2luXHJcbiAgdXNlRWZmZWN0KCgpID0+IHtcclxuICAgIGlmICghaXNBZG1pbiAmJiBhY3RpdmVUYWIgPT09ICdhZG1pbi1wYW5lbCcpIHtcclxuICAgICAgc2V0QWN0aXZlVGFiKCdnZW5lcmF0b3InKTtcclxuICAgIH1cclxuICB9LCBbaXNBZG1pbiwgYWN0aXZlVGFiXSk7XHJcblxyXG4gIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICBpZiAoYWN0aXZlVGFiID09PSAnZXhhbXMnICYmICFoYXNQcm9FeGFtQWNjZXNzKSB7XHJcbiAgICAgIHNldEFjdGl2ZVRhYignZ2VuZXJhdG9yJyk7XHJcbiAgICB9XHJcbiAgfSwgW2FjdGl2ZVRhYiwgaGFzUHJvRXhhbUFjY2Vzc10pO1xyXG5cclxuICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgaWYgKCFsb2NrZWRUYWJNZXNzYWdlKSByZXR1cm47XHJcbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4gc2V0TG9ja2VkVGFiTWVzc2FnZSgnJyksIDUwMDApO1xyXG4gICAgcmV0dXJuICgpID0+IGNsZWFyVGltZW91dCh0aW1lcik7XHJcbiAgfSwgW2xvY2tlZFRhYk1lc3NhZ2VdKTtcclxuXHJcbiAgY29uc3QgdGFiQ29uZmlnID0ge1xyXG4gICAgZ2VuZXJhdG9yOiB7IGxhYmVsOiAnU29ydSDDnHJldCcsIGljb246ICfinKgnIH0sXHJcbiAgICAnZHVlbC1nZW5lcmF0b3InOiB7IGxhYmVsOiAnRMO8ZWxsbyBTb3J1c3Ugw5xyZXQnLCBpY29uOiAn4pqU77iPJyB9LFxyXG4gICAgbGlicmFyeTogeyBsYWJlbDogYFNvcnUgQmFua2FzxLEgKCR7dXNlclR5cGUgPT09ICdhdXRoZW50aWNhdGVkJyA/IGdsb2JhbFF1ZXN0aW9ucy5sZW5ndGggOiAnRGVtbyd9KWAsIGljb246ICfwn5OaJyB9LFxyXG4gICAgZG9jdW1lbnRzOiB7IGxhYmVsOiBgS8O8dMO8cGhhbmVtICgke3VzZXJUeXBlID09PSAnYXV0aGVudGljYXRlZCcgPyBkb2N1bWVudExpYnJhcnkubGVuZ3RoIDogJ0RlbW8nfSlgLCBpY29uOiAn8J+TgicgfSxcclxuICAgIGV4YW1zOiB7IGxhYmVsOiAnWWF6xLFsxLEgSGF6xLFybGEnLCBpY29uOiAn8J+TnScgfSxcclxuICAgIHRvb2xzOiB7IGxhYmVsOiAnQXJhw6dsYXInLCBpY29uOiAn8J+boO+4jycgfSxcclxuICAgICdhZG1pbi1wYW5lbCc6IHsgbGFiZWw6ICdBZG1pbiBQYW5lbGknLCBpY29uOiAn8J+RkScgfVxyXG4gIH07XHJcbiAgXHJcbiAgY29uc3QgdGFiQ29sb3JzID0gW1xyXG4gICAgJ2JnLWJsdWUtNjAwJyxcclxuICAgICdiZy12aW9sZXQtNjAwJyxcclxuICAgICdiZy1lbWVyYWxkLTYwMCcsXHJcbiAgICAnYmctcm9zZS02MDAnLFxyXG4gICAgJ2JnLWFtYmVyLTUwMCcsXHJcbiAgICAnYmctaW5kaWdvLTYwMCcsXHJcbiAgICAnYmctcmVkLTcwMCcgLy8gQWRtaW4gUGFuZWxpIFJlbmdpXHJcbiAgXTtcclxuXHJcbiAgY29uc3QgaGFuZGxlVGFiU2VsZWN0ID0gKHRhYjogVGVhY2hlclBhbmVsVGFiKSA9PiB7XHJcbiAgICBpZiAodGFiID09PSAnZXhhbXMnICYmICFoYXNQcm9FeGFtQWNjZXNzKSB7XHJcbiAgICAgIHNldExvY2tlZFRhYk1lc3NhZ2UoJ1lhesSxbMSxIEhhesSxcmxhIMO2emVsbGnEn2luaSBrdWxsYW5hYmlsbWVrIGnDp2luIFBybyBwYWtldGkgc2F0xLFuIGFsbWFsxLFzxLFuxLF6LicpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBzZXRMb2NrZWRUYWJNZXNzYWdlKCcnKTtcclxuICAgIHNldEFjdGl2ZVRhYih0YWIpO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IHJlbmRlckNvbnRlbnQgPSAoKSA9PiB7XHJcbiAgICBzd2l0Y2ggKGFjdGl2ZVRhYikge1xyXG4gICAgICBjYXNlICdnZW5lcmF0b3InOlxyXG4gICAgICAgIHJldHVybiA8UXVlc3Rpb25HZW5lcmF0b3IgLz47XHJcbiAgICAgIGNhc2UgJ2R1ZWwtZ2VuZXJhdG9yJzpcclxuICAgICAgICByZXR1cm4gPER1ZWxRdWVzdGlvbkdlbmVyYXRvciAvPjtcclxuICAgICAgY2FzZSAnbGlicmFyeSc6XHJcbiAgICAgICAgcmV0dXJuIDxRdWVzdGlvbkxpYnJhcnkgLz47XHJcbiAgICAgIGNhc2UgJ2RvY3VtZW50cyc6XHJcbiAgICAgICAgcmV0dXJuIDxEb2N1bWVudE1hbmFnZXIgLz47XHJcbiAgICAgIGNhc2UgJ2V4YW1zJzpcclxuICAgICAgICBpZiAoIWhhc1Byb0V4YW1BY2Nlc3MpIHtcclxuICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC02IHNtOnAtMTAgdGV4dC1jZW50ZXIgc3BhY2UteS00XCI+XHJcbiAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtYm9sZCB0ZXh0LWFtYmVyLTMwMFwiPllhbG7EsXpjYSBQcm8gw5bEn3JldG1lbmxlcmUgQcOnxLFrPC9oMz5cclxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTIwMCBtYXgtdy0yeGwgbXgtYXV0b1wiPlxyXG4gICAgICAgICAgICAgICAgWWF6xLFsxLEgSGF6xLFybGEgbW9kdSwga2Fwc2FtbMSxIHPEsW5hdiBpw6dlcmlrbGVyaSBvbHXFn3R1cm1hayBpc3RleWVuIFBybyBwYWtldCBzYWhpcGxlcmluZSDDtnplbGRpci5cclxuICAgICAgICAgICAgICAgIFBybyBwYWtldGkgc2F0xLFuIGFsYXJhayBidSBiw7Zsw7xtw7xuIGtpbGlkaW5pIGHDp2FiaWxpciB2ZSBracWfaXNlbGxlxZ90aXJpbG1pxZ8gc8SxbmF2bGFyIGhhesSxcmxheWFiaWxpcnNpbml6LlxyXG4gICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1jZW50ZXJcIj5cclxuICAgICAgICAgICAgICAgIDxidXR0b25cclxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGFiU2VsZWN0KCd0b29scycpfVxyXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC02IHB5LTMgYmctZW1lcmFsZC01MDAgdGV4dC1zbGF0ZS05MDAgZm9udC1zZW1pYm9sZCByb3VuZGVkLWxnIGhvdmVyOmJnLWVtZXJhbGQtNDAwIHRyYW5zaXRpb25cIlxyXG4gICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICBQYWtldGxlcmkgxLBuY2VsZVxyXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgIDxTdXNwZW5zZSBmYWxsYmFjaz17PGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktY2VudGVyIGl0ZW1zLWNlbnRlciBoLWZ1bGxcIj48TG9hZGluZ1NwaW5uZXIgLz48L2Rpdj59PlxyXG4gICAgICAgICAgICA8RXhhbUdlbmVyYXRvciAvPlxyXG4gICAgICAgICAgPC9TdXNwZW5zZT5cclxuICAgICAgICApO1xyXG4gICAgICBjYXNlICd0b29scyc6XHJcbiAgICAgICAgcmV0dXJuIDxUb29scyAvPjtcclxuICAgICAgY2FzZSAnYWRtaW4tcGFuZWwnOlxyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICA8U3VzcGVuc2UgZmFsbGJhY2s9ezxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWNlbnRlciBpdGVtcy1jZW50ZXIgaC1mdWxsXCI+PExvYWRpbmdTcGlubmVyIC8+PC9kaXY+fT5cclxuICAgICAgICAgICAgPEFkbWluUGFuZWwgLz5cclxuICAgICAgICAgIDwvU3VzcGVuc2U+XHJcbiAgICAgICAgKTtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICAvLyBFxJ9lciBiaXIgZGVycyBzZcOnaWxtZW1pxZ9zZSwga3VsbGFuxLFjxLF5YSBkZXJzIHNlw6d0aXJtZSBla3JhbsSxbsSxIGfDtnN0ZXJcclxuICBpZiAoIXNlbGVjdGVkU3ViamVjdElkKSB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy1mdWxsIGgtZnVsbCBmbGV4IGp1c3RpZnktY2VudGVyIGl0ZW1zLWNlbnRlciBwLTQgc206cC02XCI+XHJcbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyYWRlLXNlbGVjdGlvbi1jb250YWluZXJcIj5cclxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9hbmEtc2F5ZmEnKX0gY2xhc3NOYW1lPVwiYmFjay1idXR0b24teWVsbG93XCI+4oaQIEFuYSBTYXlmYTwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cImdyYWRlLXNlbGVjdGlvbi10aXRsZVwiPkFJIEF0w7ZseWVzaSDEsMOnaW4gRGVycyBTZcOnPC9oMj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JhZGUtYnV0dG9ucy13cmFwcGVyIHN1YmplY3Qtc2VsZWN0aW9uLWdyaWRcIj5cclxuICAgICAgICAgICAgICAgICAgICB7T2JqZWN0LmtleXMoYWxsU3ViamVjdHMpLm1hcCgoaWQsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViamVjdCA9IGFsbFN1YmplY3RzW2lkXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3VudCA9IGdldFN1YmplY3RDb3VudChpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JDbGFzcyA9IGBjb2xvci0keyhpbmRleCAlIDYpICsgMX1gO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2lkfSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVN1YmplY3RTZWxlY3QoaWQpfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e3VzZXJUeXBlID09PSAnZ3Vlc3QnfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgc3ViamVjdC1idXR0b24gJHtjb2xvckNsYXNzfWB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17dXNlclR5cGUgPT09ICdndWVzdCcgPyAnQnUgw7Z6ZWxsacSfaSBrdWxsYW5tYWsgacOnaW4gZ2lyacWfIHlhcG1hbMSxc8SxbsSxeicgOiAnJ31cclxuICAgICAgICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwic3ViamVjdC1idXR0b25fX25hbWVcIj57c3ViamVjdC5uYW1lfTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInN1YmplY3QtYnV0dG9uX19jb3VudFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge3VzZXJUeXBlID09PSAnZ3Vlc3QnID8gJ0RlbW8nIDogYCR7Y291bnR9IFNvcnVgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pfVxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vIERlcnMgc2XDp2lsbWnFn3NlIG5vcm1hbCBwYW5lbGkgZ8O2c3RlclxyXG4gIHJldHVybiAoXHJcbiAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGwgaC1mdWxsIGZsZXgganVzdGlmeS1jZW50ZXIgaXRlbXMtY2VudGVyIHAtNCBzbTpwLTZcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctZnVsbCBtYXgtdy03eGwgaC1mdWxsIGZsZXggZmxleC1jb2wgYmctZ3JhZGllbnQtdG8tYnIgZnJvbS1zbGF0ZS05MDAgdG8tc2xhdGUtODAwIHRleHQtd2hpdGUgYm9yZGVyIGJvcmRlci12aW9sZXQtNTAwLzMwIHJvdW5kZWQtMnhsIHNoYWRvdy0yeGwgb3ZlcmZsb3ctaGlkZGVuIHJlbGF0aXZlXCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiei0xMCBmbGV4IHctZnVsbCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0zIHB4LTQgcHQtNiBzbTphYnNvbHV0ZSBzbTpsZWZ0LTYgc206dG9wLTYgc206dy1hdXRvIHNtOmZsZXgtbm93cmFwIHNtOnB4LTAgc206cHQtMFwiPlxyXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnL2FuYS1zYXlmYScpfSBjbGFzc05hbWU9XCJiZy1hbWJlci00MDAvODAgaG92ZXI6YmctYW1iZXItMzAwLzkwIHRleHQtc2xhdGUtOTAwIGZvbnQtYm9sZCBweC00IHB5LTIgcm91bmRlZC14bCBiYWNrZHJvcC1ibHVyLW1kIHRyYW5zaXRpb24tdHJhbnNmb3JtIGhvdmVyOnNjYWxlLTEwNSBzaGFkb3ctbGdcIj5cclxuICAgICAgICAgICAgICAgICAgICDihpAgQW5hIFNheWZhXHJcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0U2VsZWN0ZWRTdWJqZWN0SWQoJycpfSBjbGFzc05hbWU9XCJiZy1pbmRpZ28tNjAwLzkwIGhvdmVyOmJnLWluZGlnby01MDAvOTAgdGV4dC13aGl0ZSBmb250LWJvbGQgcHgtNCBweS0yIHJvdW5kZWQteGwgYmFja2Ryb3AtYmx1ci1tZCB0cmFuc2l0aW9uLXRyYW5zZm9ybSBob3ZlcjpzY2FsZS0xMDUgc2hhZG93LWxnXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgRGVyc2kgRGXEn2nFn3RpclxyXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAge3VzZXJUeXBlID09PSAnYXV0aGVudGljYXRlZCcgJiYgKFxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ6LTEwIG10LTQgdy1mdWxsIHB4LTQgc206YWJzb2x1dGUgc206dG9wLTQgc206cmlnaHQtNiBzbTptdC0wIHNtOnctWzQyMHB4XSBzbTpweC0wXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC0zeGwgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBiZy1ncmFkaWVudC10by1iciBmcm9tLXNsYXRlLTkwMC84MCB2aWEtc2xhdGUtOTAwLzYwIHRvLXNsYXRlLTkwMC8zMCBzaGFkb3ctMnhsIGJhY2tkcm9wLWJsdXIteGxcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtdG9wLTEyIC1yaWdodC0xMiBoLTMyIHctMzIgcm91bmRlZC1mdWxsIGJnLWVtZXJhbGQtNTAwLzQwIGJsdXItM3hsXCI+PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgLWJvdHRvbS0xNiAtbGVmdC04IGgtNDAgdy00MCByb3VuZGVkLWZ1bGwgYmctY3lhbi01MDAvMjAgYmx1ci0zeGxcIj48L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmUgc3BhY2UteS01IHAtNVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTNcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yZW1dIHRleHQtc2xhdGUtMzAwXCI+SGVzYXAgRHVydW11PC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPkFJIEtyZWRpICYgRHVlbGxvIEJpbGV0bGVyaTwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciByb3VuZGVkLWZ1bGwgcHgtMyBweS0xIHRleHQteHMgZm9udC1zZW1pYm9sZCAke2hhc1Byb0V4YW1BY2Nlc3MgPyAnYmctZW1lcmFsZC00MDAvMTUgdGV4dC1lbWVyYWxkLTIwMCBib3JkZXIgYm9yZGVyLWVtZXJhbGQtMzAwLzQwJyA6ICdiZy1zbGF0ZS03MDAvNjAgdGV4dC1zbGF0ZS0yMDAgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCd9YH0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjcmVkaXRQbGFuTGFiZWx9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIGdhcC00IHNtOmdyaWQtY29scy0yXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXdoaXRlLzUgYmctd2hpdGUvNSBwLTQgc2hhZG93LWlubmVyXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2xcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy13aWRlIHRleHQtZW1lcmFsZC0yMDBcIj5LcmVkaSBCYWtpeWVzaTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtYmFzZWxpbmUgZ2FwLTFcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2lzVW5saW1pdGVkVXNlciA/IChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZCB0ZXh0LXdoaXRlXCI+U0lOSVJTSVo8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkgOiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJvbGQgdGV4dC13aGl0ZVwiPnthaUNyZWRpdHN9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IWlzVW5saW1pdGVkVXNlciAmJiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtc2xhdGUtMzAwXCI+a3JlZGk8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBoLTEyIHctMTIgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLWVtZXJhbGQtNTAwLzIwIHRleHQtZW1lcmFsZC0yMDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3ZnIGNsYXNzTmFtZT1cImgtNiB3LTZcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGggc3Ryb2tlTGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlTGluZWpvaW49XCJyb3VuZFwiIHN0cm9rZVdpZHRoPXsxLjZ9IGQ9XCJNMTEuMjUgM3Y1LjI1SDZtMTIgLjc1djEwLjVBMi4yNSAyLjI1IDAgMDExNS43NSAyMUg4LjI1QTIuMjUgMi4yNSAwIDAxNiAxOC43NXYtNi41bTE1LTUuNWwtOS0zLjc1TDMgNi43NW0xOCAxLjVsLTkgMy43NS05LTMuNzVcIiAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3ZnPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQteHMgdGV4dC1zbGF0ZS0zMDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtpc1VubGltaXRlZFVzZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/ICdTaW5pcnNpeiB1cmV0aW0gbW9kdSBha3RpZi4nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAnSGVyIEFJIHVyZXRpbWkgbWFsaXlldGluZSBnb3JlIGtyZWRpbml6ZGVuIGR1c3VsdXIuJ31cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItd2hpdGUvNSBiZy13aGl0ZS81IHAtNCBzaGFkb3ctaW5uZXJcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGUgdGV4dC1hbWJlci0yMDBcIj5EdWVsbG8gQmlsZXRsZXJpPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1iYXNlbGluZSBnYXAtMVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7aXNVbmxpbWl0ZWRVc2VyID8gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJvbGQgdGV4dC13aGl0ZVwiPlNJTklSU0laPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtc20gdGV4dC1hbWJlci0xMDBcIj5tb2Q8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Lz5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSA6IChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDw+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1ib2xkIHRleHQtd2hpdGVcIj57ZHVlbFRpY2tldHN9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtc20gdGV4dC1hbWJlci0xMDBcIj5hZGV0PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBoLTEyIHctMTIgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLWFtYmVyLTUwMC8yNSB0ZXh0LWFtYmVyLTEwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdmcgY2xhc3NOYW1lPVwiaC02IHctNlwiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cGF0aCBzdHJva2VMaW5lY2FwPVwicm91bmRcIiBzdHJva2VMaW5lam9pbj1cInJvdW5kXCIgc3Ryb2tlV2lkdGg9ezEuNn0gZD1cIk0zIDguMjVBMi4yNSAyLjI1IDAgMDE1LjI1IDZoMTMuNUEyLjI1IDIuMjUgMCAwMTIxIDguMjV2MS41YTEuNSAxLjUgMCAwMTAgM3YxLjVBMi4yNSAyLjI1IDAgMDExOC43NSAxOEg1LjI1QTIuMjUgMi4yNSAwIDAxMyAxNS43NXYtMS41YTEuNSAxLjUgMCAwMTAtM3YtMS41ek05IDloNm0tNiAzaDZcIiAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3ZnPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQteHMgdGV4dC1zbGF0ZS0zMDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtpc1VubGltaXRlZFVzZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/ICdJc3RlZ2luaXoga2FkYXIgZHVlbGxvIGJhc2xhdGFiaWxpcnNpbml6LidcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGR1ZWxUaWNrZXRzID4gMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/ICdZZW5pIGR1ZWxsbyBiYXNsYXRpcmtlbiBoZXIgbWFjIGljaW4gMSBiaWxldCBrdWxsYW5pbGlyLidcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAnR29yZXZsZXJpIHRhbWFtbGF5YXJhayB2ZXlhIGJhc2FyaWxhcmxhIHllbmkgYmlsZXRsZXIga2F6YW5pbi4nfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3A+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTMgc206ZmxleC1yb3cgc206aXRlbXMtY2VudGVyIHNtOmp1c3RpZnktYmV0d2VlblwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXNsYXRlLTQwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQcm8gUGFrZXRpIHNhdGluIGFsYXJhayBZYXppbGkgSGF6aXJsYSBtb2R1bnUgdmUgZ2VuaXMga3JlZGkgYXZhbnRhamxhcmluaSBhY2luLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGFiU2VsZWN0KCd0b29scycpfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC0yeGwgYmctZ3JhZGllbnQtdG8tciBmcm9tLWVtZXJhbGQtNDAwIHZpYS10ZWFsLTQwMCB0by1jeWFuLTQwMCBweC00IHB5LTIgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtc2xhdGUtOTAwIHNoYWRvdy1sZyBzaGFkb3ctZW1lcmFsZC01MDAvMzAgdHJhbnNpdGlvbiBob3ZlcjpzY2FsZS0xMDUgaG92ZXI6c2hhZG93LWVtZXJhbGQtNDAwLzUwXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEtyZWRpIFNhdGluIEFsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgKX1cclxuICAgICAgICAgICAgPGhlYWRlciBjbGFzc05hbWU9XCJmbGV4LXNocmluay0wIHAtNCBwdC04IHRleHQtY2VudGVyIHNtOnB0LTI0XCI+XHJcbiAgICAgICAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1leHRyYWJvbGQgdGV4dC13aGl0ZSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtM1wiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPkFJIFNvcnUgQXTDtmx5ZXNpOiA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXRlYWwtMzAwXCI+e3N1YmplY3ROYW1lfTwvc3Bhbj48L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAge2lzQWRtaW4gJiYgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgYmcteWVsbG93LTUwMCB0ZXh0LXNsYXRlLTkwMCBweC0yIHB5LTAuNSByb3VuZGVkLW1kXCI+QURNxLBOPC9zcGFuPn1cclxuICAgICAgICAgICAgICAgIDwvaDE+XHJcbiAgICAgICAgICAgIDwvaGVhZGVyPlxyXG4gICAgICAgICAgICA8bmF2IGNsYXNzTmFtZT1cImZsZXgtc2hyaW5rLTAgZmxleCBqdXN0aWZ5LWNlbnRlciBpdGVtcy1jZW50ZXIgZ2FwLTIgc206Z2FwLTQgcC0zIGJvcmRlci1iIGJvcmRlci10IGJvcmRlci12aW9sZXQtNTAwLzMwIGJnLWJsYWNrLzIwIGZsZXgtd3JhcFwiPlxyXG4gICAgICAgICAgICAgICAge09iamVjdC5lbnRyaWVzKHRhYkNvbmZpZykubWFwKChba2V5LCB7IGxhYmVsLCBpY29uIH1dLCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnYWRtaW4tcGFuZWwnICYmICFpc0FkbWluKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleT17a2V5fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVUYWJTZWxlY3Qoa2V5IGFzIFRlYWNoZXJQYW5lbFRhYil9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHB4LTQgcHktMiByb3VuZGVkLWxnIHRleHQtd2hpdGUgZm9udC1zZW1pYm9sZCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi0yMDAgc2hhZG93LW1kXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3RhYkNvbG9yc1tpbmRleCAlIHRhYkNvbG9ycy5sZW5ndGhdfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHthY3RpdmVUYWIgPT09IGtleSA/ICdvcGFjaXR5LTUwIHNjYWxlLTk1JyA6ICdvcGFjaXR5LTEwMCBob3ZlcjpvcGFjaXR5LTkwIGhvdmVyOnNjYWxlLTEwNSd9YFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj57aWNvbn08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImhpZGRlbiBzbTppbmxpbmVcIj57bGFiZWx9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfSl9XHJcbiAgICAgICAgICAgIDwvbmF2PlxyXG4gICAgICAgICAgICB7bG9ja2VkVGFiTWVzc2FnZSAmJiAoXHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInB4LTQgcHktMyB0ZXh0LXNtIHRleHQtYW1iZXItMTAwIGJnLWFtYmVyLTUwMC8yMCBib3JkZXItYiBib3JkZXItYW1iZXItNDAwLzMwIHRleHQtY2VudGVyXCI+XHJcbiAgICAgICAgICAgICAgICAgICAge2xvY2tlZFRhYk1lc3NhZ2V9XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgKX1cclxuICAgICAgICAgICAgPG1haW4gY2xhc3NOYW1lPVwiZmxleC1ncm93IG92ZXJmbG93LXktYXV0b1wiPlxyXG4gICAgICAgICAgICAgICAge3JlbmRlckNvbnRlbnQoKX1cclxuICAgICAgICAgICAgPC9tYWluPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgPC9kaXY+XHJcbiAgKTtcclxufTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IFRlYWNoZXJQYW5lbDtcclxuXHJcblxyXG4iXSwiZmlsZSI6IkM6L1VzZXJzL01VU1RBRkEvRGVza3RvcC8wNi4xMS4yMDI1IDIzLjU5L2NvbXBvbmVudHMvVGVhY2hlclBhbmVsLnRzeCJ9
