import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button, LoadingSpinner, Modal } from '../UI';
import { generateExamWithAI } from '../../services/geminiService';
import type { Exam, GeneratedQuestion, DocumentLibraryItem, Kazanim } from '../../types';
import { useAuth, useData, useGame } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { useDropzone } from 'react-dropzone';
import { Packer } from 'docx';
import saveAs from 'file-saver';
import { createDocFromExam } from '../../utils/docxExport';

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<{ mimeType: string; data: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        resolve({
            mimeType: file.type,
            data: result.split(',')[1]
        });
    };
    reader.onerror = error => reject(error);
  });
  
// --- Image Uploader Component for Editable Questions ---
const EditableImageUploader: React.FC<{
    question: GeneratedQuestion;
    onImageUpload: (base64: string) => void;
}> = ({ question, onImageUpload }) => {
    const { showToast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const content = await fileToBase64(file);
            onImageUpload(content.data);
        } catch (error) {
            console.error("Image upload error:", error);
            showToast('Görsel yüklenirken hata oluştu.', 'error');
        } finally {
            setIsUploading(false);
        }
    }, [onImageUpload, showToast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.gif'] },
        multiple: false,
    });
    
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (question.visualDescription) {
            navigator.clipboard.writeText(question.visualDescription);
            showToast('Görsel tarifi kopyalandı!', 'success');
        }
    };

    if (question.userUploadedImage) {
        return (
            <div className="my-2 relative w-48 h-48 mx-auto">
                <img src={`data:image/png;base64,${question.userUploadedImage}`} alt="Yüklenen görsel" className="w-full h-full object-contain rounded-md border border-slate-400" />
                <button onClick={() => onImageUpload('')} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs print-hidden">&times;</button>
            </div>
        );
    }

    if (!question.visualDescription || question.visualDescription.toLowerCase() === 'null') {
        return (
             <div {...getRootProps()} className={`my-2 p-2 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-center cursor-pointer transition-colors h-24 print-hidden ${isDragActive ? 'border-violet-400 bg-violet-900/50' : 'border-slate-500 hover:border-violet-400'}`}>
                <input {...getInputProps()} />
                <p className="text-sm font-semibold text-violet-300">Görsel Yükle</p>
            </div>
        )
    }

    return (
        <div {...getRootProps()} className={`my-2 p-2 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-center cursor-pointer transition-colors print-hidden ${isDragActive ? 'border-violet-400 bg-violet-900/50' : 'border-slate-500 hover:border-violet-400'}`}>
            <input {...getInputProps()} />
            {isUploading ? <LoadingSpinner /> : (
                 <div className="w-full text-xs text-slate-400 italic relative">
                    <button onClick={handleCopy} className="absolute top-0 right-0 p-1 text-slate-400 hover:text-white" title="Görsel tarifini kopyala">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                    <p className="font-bold mb-1 text-violet-300">Görsel Alanı</p>
                    <p>[Görsel: {question.visualDescription}]</p>
                    <p className="mt-1 font-semibold not-italic">Veya buraya tıklayarak kendi görselinizi yükleyin.</p>
                </div>
            )}
        </div>
    );
};


// Component for a single kazanım item in the selection list
const KazanımSelector: React.FC<{
    kazanım: Kazanim;
    isSelected: boolean;
    count: number;
    onToggle: (id: string, text: string) => void;
    onCountChange: (id: string, count: number) => void;
}> = ({ kazanım, isSelected, count, onToggle, onCountChange }) => {
    return (
        <div className={`p-2 rounded-lg flex items-center gap-2 transition-colors ${isSelected ? 'bg-violet-800/50' : 'bg-slate-700/50'}`}>
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(kazanım.id, kazanım.text)}
                className="form-checkbox h-5 w-5 rounded text-violet-600 bg-slate-800 border-slate-600 focus:ring-violet-500"
            />
            <label className="flex-grow text-sm text-slate-300 cursor-pointer" onClick={() => onToggle(kazanım.id, kazanım.text)}>
                {kazanım.id} - {kazanım.text}
            </label>
            <input
                type="number"
                value={count}
                onChange={(e) => onCountChange(kazanım.id, Math.max(1, parseInt(e.target.value) || 1))}
                disabled={!isSelected}
                className="w-16 p-1 bg-slate-700 rounded-md border border-slate-600 text-center disabled:opacity-50"
                min="1"
            />
        </div>
    );
};

const ExamGenerator: React.FC = () => {
    const { isDevUser, userType } = useAuth();
    const { aiCredits, setAiCredits, dailyCreditLimit, documentLibrary, generatedExams, setGeneratedExams } = useData();
    const { selectedSubjectId, ogrenmeAlanlari, allSubjects, mergedCurriculum, settings: gameSettings, updateSetting } = useGame();
    const { showToast } = useToast();

    // Ensure each generated question carries at least the selected kazanım metadata.
    const backfillKazanims = useCallback((scenarios: Record<string, GeneratedQuestion[]>, selected: Record<string, { text: string; count: number }>) => {
        const queue = Object.entries(selected).flatMap(([id, item]) =>
            Array.from({ length: Math.max(1, item?.count || 1) }, () => ({ id, text: item?.text || '' })),
        );

        const applyQueue = (list: GeneratedQuestion[]) =>
            list.map((q, idx) => {
                const fallback = queue[idx];
                const merged: GeneratedQuestion = { ...q };
                if (!merged.kazanimId && fallback?.id) merged.kazanimId = fallback.id;
                if ((!merged.kazanimText || !merged.kazanimText.trim()) && fallback?.text) merged.kazanimText = fallback.text;
                return merged;
            });

        return Object.fromEntries(Object.entries(scenarios).map(([key, list]) => [key, applyQueue(list)]));
    }, []);

    const grade = gameSettings.grade || 5;
    const subjectName = useMemo(() => {
        if (!selectedSubjectId) return 'Ders';
        return allSubjects[selectedSubjectId]?.name || 'Ders';
    }, [selectedSubjectId, allSubjects]);

        // State for exam settings
    const [selectedKazanims, setSelectedKazanims] = useState<Record<string, { text: string; count: number }>>({});
    const [schoolName, setSchoolName] = useState('CUMHURİYET ORTAOKULU');
    const [academicYear, setAcademicYear] = useState('2025-2026 EĞİTİM-ÖĞRETİM YILI');
    const [title, setTitle] = useState('1. DÖNEM 1. YAZILI SINAV');
    const cleanTitle = useMemo(() => title.replace(/^[\s\u00A0]*\d+\.?\s*Sınıf\s*/i, '').trimStart(), [title]);
    const [sourceDocIds, setSourceDocIds] = useState<string[]>([]);
    const [referenceDoc, setReferenceDoc] = useState<DocumentLibraryItem | null>(null);
    
    // UI/Logic State
// UI/Logic State
// UI/Logic State
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const [editableExam, setEditableExam] = useState<Exam | null>(null);
    const [activeScenario, setActiveScenario] = useState<string>('Örnek Yazılı 1');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [estimatedCredits, setEstimatedCredits] = useState(0);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: async (acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            if (!file) return;
            try {
                const content = await fileToBase64(file);
                setReferenceDoc({
                    id: `ref-${Date.now()}`,
                    name: file.name,
                    content,
                    createdAt: new Date().toISOString(),
                    summary: null
                });
            } catch (err) {
                showToast('Referans dosyası okunurken hata oluştu.', 'error');
            }
        },
        accept: { 'image/*': ['.jpeg', '.png'], 'application/pdf': ['.pdf'] },
        multiple: false,
    });

    const availableGrades = useMemo(() => {
        if (!selectedSubjectId || !mergedCurriculum[selectedSubjectId]) return [];
        return Object.keys(mergedCurriculum[selectedSubjectId]).map(Number).sort((a,b) => a-b);
    }, [selectedSubjectId, mergedCurriculum]);

    const allKazanimsForGrade = useMemo(() => {
        return ogrenmeAlanlari.flatMap((oa) => oa.kazanimlar || []);
    }, [ogrenmeAlanlari]);

    const totalQuestions = useMemo(() => {
        return Object.values(selectedKazanims).reduce((sum, { count }) => sum + count, 0);
    }, [selectedKazanims]);

    const handleToggleKazanım = (id: string, text: string) => {
        setSelectedKazanims(prev => {
            const newSelection = { ...prev };
            if (newSelection[id]) {
                delete newSelection[id];
            } else {
                newSelection[id] = { text, count: 1 };
            }
            return newSelection;
        });
    };

    const handleCountChange = (id: string, count: number) => {
        setSelectedKazanims(prev => ({
            ...prev,
            [id]: { ...prev[id], count },
        }));
    };

    const handleGenerate = async () => {
        if (totalQuestions === 0) {
            setError("Lütfen en az bir kazanımdan soru seçin.");
            return;
        }
        if (userType === 'guest' && !isDevUser) {
            setError('Bu özelliği kullanmak için giriş yapmalısınız.');
            return;
        }
        
        const estimatedCost = Math.max(5, totalQuestions * 2); 
        setEstimatedCredits(estimatedCost);

        if (!isDevUser && aiCredits < estimatedCost) {
            setError(`Yetersiz bakiye. Bu işlem için tahmini ${estimatedCost} bakiye gerekir. Kalan: ${aiCredits}`);
            return;
        }

        setShowConfirmModal(true);
    };

    const handleConfirmGeneration = async () => {
        setShowConfirmModal(false);
        setIsLoading(true);
        setLoadingMessage('Yazılı senaryoları oluşturuluyor...');
        setError('');
        setEditableExam(null);

        try {
            const settingsForAI = {
                grade,
                selectedKazanims,
                schoolName,
                academicYear,
                title,
                sourceDocuments: documentLibrary.filter(doc => sourceDocIds.includes(doc.id)),
                referenceDocument: referenceDoc || undefined,
                totalQuestions,
            };
            const result = await generateExamWithAI(settingsForAI, allSubjects[selectedSubjectId].name);

            const creditsUsed = Math.max(5, Math.ceil((result.totalInputTokens + result.totalOutputTokens) / 1000 * 0.5));
            if (!isDevUser) {
                setAiCredits(prev => Math.max(0, (Number(prev) || 0) - creditsUsed));
            }
            
            // FIX: "Converting circular structure to JSON" error.
            // Re-create the settings object from clean state variables to prevent any potential circular references
            // from the temporary `settingsForAI` object (which contains document references) from leaking into the saved data.
            const cleanSettings = {
                grade: grade,
                selectedKazanims: selectedKazanims
            };

            const scenariosWithFallback = backfillKazanims(result.scenarios, selectedKazanims);

            const newExam: Exam = {
                id: `exam-${Date.now()}`,
                title: `${grade}. Sınıf ${title}`,
                createdAt: new Date().toISOString(),
                scenarios: scenariosWithFallback,
                settings: cleanSettings,
                schoolName,
                academicYear,
                subjectId: selectedSubjectId,
                grade
            };
            setEditableExam(newExam);
            showToast(`Sınav oluşturuldu! Hesabınızdan ${creditsUsed} bakiye düşüldü.`, 'success');

        } catch (err: any) {
            setError(err.message || 'Sınav oluşturulurken bir hata oluştu.');
            showToast('Sınav oluşturulurken bir hata oluştu.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveExam = () => {
        if (!editableExam) return;
        setGeneratedExams(prev => [editableExam, ...prev]);
        showToast('Sınav başarıyla "Kaydedilmiş Yazılılar" listesine eklendi!', 'success');
    };
    
    const handleLoadExam = (examId: string) => {
        const examToLoad = generatedExams.find(exam => exam.id === examId);
        if (examToLoad) {
            setEditableExam(examToLoad);
            showToast(`'${examToLoad.title}' düzenlenmek üzere yüklendi.`, 'info');
        }
    };
    
    const handleDeleteExam = (examId: string) => {
        if (window.confirm("Bu kayıtlı yazılıyı silmek istediğinizden emin misiniz?")) {
            setGeneratedExams(prev => prev.filter(exam => exam.id !== examId));
            if (editableExam?.id === examId) {
                setEditableExam(null);
            }
            showToast('Yazılı silindi.', 'success');
        }
    };


    const handleExportToWord = async () => {
        if (!editableExam) return;
        showToast('Word belgesi oluşturuluyor...', 'info');
        try {
            const doc = await createDocFromExam(editableExam, activeScenario, subjectName, cleanTitle);
            const blob = await Packer.toBlob(doc);
            saveAs(blob, "yazili_sinavi.docx");
            showToast('Word belgesi indirildi!', 'success');
        } catch (error) {
            console.error("Word export failed:", error);
            showToast("Word belgesi oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.", "error");
        }
    };

    const handleQuestionChange = (scenarioKey: string, qIndex: number, field: 'questionStem' | 'answer', value: string) => {
        setEditableExam(prev => {
            if (!prev) return null;
            const newExam = { ...prev };
            const newScenario = [...newExam.scenarios[scenarioKey]];
            newScenario[qIndex] = { ...newScenario[qIndex], [field]: value };
            newExam.scenarios = { ...newExam.scenarios, [scenarioKey]: newScenario };
            return newExam;
        });
    };
    
    const handleImageUpload = (scenarioKey: string, qIndex: number, base64: string) => {
        setEditableExam(prev => {
            if (!prev) return null;
            const newExam = { ...prev };
            const newScenario = [...newExam.scenarios[scenarioKey]];
            newScenario[qIndex] = { ...newScenario[qIndex], userUploadedImage: base64 };
            newExam.scenarios = { ...newExam.scenarios, [scenarioKey]: newScenario };
            return newExam;
        });
    };

    const formatKazanimLabel = (question: GeneratedQuestion) => {
        const hasText = question.kazanimText && question.kazanimText.trim().length > 0;
        if (hasText && question.kazanimId) return `${question.kazanimId} - ${question.kazanimText}`;
        if (hasText) return question.kazanimText || 'Kazanım';
        if (question.kazanimId) return `Kazanım: ${question.kazanimId}`;
        return 'Kazanım: Belirtilmedi';
    };

    const formatPrintFileName = () => {
        if (!editableExam) return document.title;
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const parts = [
            editableExam.academicYear || 'akademik-yil',
            editableExam.schoolName || 'okul',
            `${editableExam.grade || grade}.sinif`,
            subjectName || 'ders',
            cleanTitle || title,
            stamp
        ];
        return parts
            .join('-')
            .replace(/\s+/g, '-')
            .replace(/[^\w.-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    };

    const renderEditableExamPaper = (scenario: GeneratedQuestion[]) => {
        return (
            <div id="exam-paper-preview" className="bg-slate-800/50 p-6 rounded-lg space-y-6 border border-slate-700">
                <header className="text-center border-b-2 border-slate-600 pb-4 space-y-1">
                    <p className="text-sm font-semibold tracking-wide text-slate-300">{academicYear}</p>
                    <h1 className="text-2xl font-bold text-slate-100">{schoolName}</h1>
                    <p className="text-lg font-semibold text-slate-200">{grade}. Sınıf {subjectName} Dersi</p>
                    <p className="text-lg font-semibold text-slate-200">{cleanTitle}</p>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-3 border-b-2 border-slate-600 pb-3 text-sm gap-2">
                    <span>Adı Soyadı: ..........................</span>
                    <span>Numara: .....</span>
                    <span>Puan: .....</span>
                </div>
                <main className="space-y-8">
                    {scenario.map((q, index) => (
                        <div
                            key={`${activeScenario}-${q.id}-${index}`}
                            className="space-y-3 pb-6 border-b border-slate-700 last:border-b-0 last:pb-0 exam-question-block"
                        >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <div className="flex flex-wrap items-baseline gap-3 text-sm text-slate-400">
                                    <span className="text-lg font-bold text-slate-200">{index + 1})</span>
                                    <span className="italic text-slate-400">{formatKazanimLabel(q)}</span>
                                </div>
                                <span className="text-sm font-semibold text-slate-400">({q.points} Puan)</span>
                            </div>
                            <div className="space-y-2">
                                <textarea
                                    value={q.questionStem}
                                    onChange={(e) => handleQuestionChange(activeScenario, index, 'questionStem', e.target.value)}
                                    className="w-full p-2 bg-slate-700/50 rounded-md border border-slate-600 resize-y min-h-[80px] print-hidden"
                                />
                                <div className="print-visible whitespace-pre-line leading-7 text-base text-black bg-white/90 rounded-md border border-transparent p-2">
                                    {q.questionStem}
                                </div>
                            </div>
                            <EditableImageUploader question={q} onImageUpload={(base64) => handleImageUpload(activeScenario, index, base64)} />
                            <div className="space-y-2">
                                {Array.from({ length: 5 }).map((_, lineIndex) => (
                                    <div key={`answer-line-${q.id}-${lineIndex}`} className="h-6 border-b border-dashed border-slate-600/80"></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </main>
                 {/* This section will only be visible when printing */}
                <div id="answer-key-print" className="hidden print-visible answer-key-print">
                    <h2 className="text-2xl font-bold text-center my-4">CEVAP ANAHTARI</h2>
                    <ol className="list-decimal list-inside space-y-2">
                        {scenario.map((q, index) => (
                            <li key={`answer-${index}`} className="border-b border-gray-300 pb-2">
                                <span className="font-bold">{index + 1}. Soru: </span>
                                {q.answer}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        );
    };

    const renderPrintableDocument = () => {
        if (!editableExam) return null;
        const scenario = editableExam.scenarios[activeScenario] || [];
        
        return (
            <div className="print-root" id="exam-print-root">
                {/* SORU SAYFASI */}
                <div style={{ 
                    backgroundColor: 'white', 
                    color: 'black', 
                    padding: '20mm', 
                    fontFamily: 'Inter, Arial, sans-serif',
                    minHeight: '100vh'
                }}>
                    {/* Başlık Bölümü */}
                    <header style={{ 
                        textAlign: 'center', 
                        marginBottom: '20px', 
                        paddingBottom: '15px', 
                        borderBottom: '2px solid #666' 
                    }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>{academicYear}</p>
                        <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', margin: '5px 0' }}>{schoolName}</h1>
                        <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '5px' }}>{grade}. Sınıf {subjectName} Dersi</p>
                        <p style={{ fontSize: '16px', fontWeight: 600 }}>{cleanTitle}</p>
                    </header>
                    
                    {/* Öğrenci Bilgileri */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr 1fr', 
                        gap: '10px', 
                        fontSize: '13px', 
                        paddingBottom: '12px', 
                        marginBottom: '20px', 
                        borderBottom: '2px solid #666' 
                    }}>
                        <span>Adı Soyadı: ..........................</span>
                        <span>Numara: .....</span>
                        <span style={{ textAlign: 'right' }}>Puan: .....</span>
                    </div>
                    
                    {/* Sorular */}
                    <main>
                        {scenario.map((q, index) => (
                            <div key={`print-q-${index}`} className="exam-question-block" style={{ 
                                marginBottom: '25px',
                                pageBreakInside: 'avoid'
                            }}>
                                {/* Ayraç çizgisi */}
                                <div style={{ 
                                    height: '1px', 
                                    backgroundColor: '#d1d5db', 
                                    marginBottom: '10px' 
                                }} />
                                
                                {/* Kazanım ve Puan */}
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'baseline',
                                    marginBottom: '8px',
                                    fontSize: '11px'
                                }}>
                                    <span style={{ fontStyle: 'italic', color: '#6b7280' }}>
                                        {formatKazanimLabel(q)}
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#1f2937' }}>
                                        ({q.points} Puan)
                                    </span>
                                </div>
                                
                                {/* Soru Metni */}
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '8px', 
                                    marginBottom: '10px',
                                    alignItems: 'flex-start'
                                }}>
                                    <span style={{ 
                                        fontSize: '16px', 
                                        fontWeight: 700,
                                        flexShrink: 0
                                    }}>
                                        {index + 1})
                                    </span>
                                    <div style={{ 
                                        fontSize: '14px', 
                                        lineHeight: '1.75',
                                        whiteSpace: 'pre-line',
                                        flexGrow: 1
                                    }}>
                                        {q.questionStem}
                                    </div>
                                </div>
                                
                                {/* Görsel */}
                                {q.userUploadedImage && (
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'center', 
                                        margin: '12px 0' 
                                    }}>
                                        <img 
                                            src={`data:image/png;base64,${q.userUploadedImage}`} 
                                            alt="Soru görseli"
                                            style={{ 
                                                maxWidth: '400px', 
                                                maxHeight: '300px', 
                                                objectFit: 'contain'
                                            }}
                                        />
                                    </div>
                                )}
                                
                                {/* Cevap Satırları */}
                                <div style={{ marginTop: '10px' }}>
                                    {Array.from({ length: 5 }).map((_, lineIndex) => (
                                        <div 
                                            key={`answer-line-${index}-${lineIndex}`} 
                                            style={{ 
                                                borderBottom: '1px dashed #9ca3af', 
                                                height: '22px',
                                                marginBottom: '8px'
                                            }} 
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </main>
                </div>
                
                {/* SAYFA SONU - Cevap Anahtarı İçin */}
                <div className="page-break" style={{ pageBreakBefore: 'always' }} />
                
                {/* CEVAP ANAHTARI SAYFASI */}
                <div className="answer-key-print" style={{ 
                    backgroundColor: 'white', 
                    color: 'black', 
                    padding: '20mm', 
                    fontFamily: 'Inter, Arial, sans-serif',
                    pageBreakBefore: 'always',
                    minHeight: '100vh'
                }}>
                    {/* Başlık Bölümü */}
                    <header style={{ 
                        textAlign: 'center', 
                        marginBottom: '20px', 
                        paddingBottom: '15px', 
                        borderBottom: '2px solid #666' 
                    }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>{academicYear}</p>
                        <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', margin: '5px 0' }}>{schoolName}</h1>
                        <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '5px' }}>{grade}. Sınıf {subjectName} Dersi</p>
                        <p style={{ fontSize: '16px', fontWeight: 600 }}>{cleanTitle}</p>
                    </header>
                    
                    {/* Cevap Anahtarı Başlığı */}
                    <h2 style={{ 
                        fontSize: '20px', 
                        fontWeight: 700, 
                        textAlign: 'center', 
                        marginBottom: '25px' 
                    }}>
                        CEVAP ANAHTARI
                    </h2>
                    
                    {/* Cevaplar */}
                    <div>
                        {scenario.map((q, index) => (
                            <div 
                                key={`answer-${index}`} 
                                style={{ 
                                    borderBottom: '1px solid #d1d5db', 
                                    paddingBottom: '12px',
                                    marginBottom: '12px'
                                }}
                            >
                                <p style={{ 
                                    fontWeight: 700, 
                                    fontSize: '14px', 
                                    marginBottom: '6px' 
                                }}>
                                    {index + 1}. Soru:
                                </p>
                                <p style={{ 
                                    fontSize: '14px', 
                                    lineHeight: '1.75',
                                    whiteSpace: 'pre-line',
                                    paddingLeft: '16px'
                                }}>
                                    {q.answer}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // Build standalone HTML and print via sandboxed iframe (avoids app CSS/overflow issues)
    const buildPrintableHtml = () => {
        if (!editableExam) return '';
        const scenario = editableExam.scenarios?.[activeScenario] || [];
        const escapeHtml = (text: string) =>
            text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

        const header = `
          <div class="header">
            <div class="line1">${escapeHtml(academicYear)}</div>
            <div class="line2">${escapeHtml(schoolName)}</div>
            <div class="line3">${grade}. Sınıf ${escapeHtml(subjectName)} Dersi</div>
            <div class="line3">${escapeHtml(cleanTitle)}</div>
          </div>
          <div class="student-info">
            <span>Adı Soyadı: ..........................</span>
            <span>Numara: .....</span>
            <span>Puan: .....</span>
          </div>
        `;

        const questionsHtml = scenario
            .map((q, idx) => {
                const answerLines = Array.from({ length: 3 })
                    .map(() => `<div class="answer-line"></div>`)
                    .join('');
                const imgHtml = q.userUploadedImage
                    ? `<div class="img-wrap"><img src="data:image/png;base64,${q.userUploadedImage}" /></div>`
                    : '';
                const stem = escapeHtml(q.questionStem).replace(/\n/g, '<br>');
                return `
                  <div class="question-block">
                    <div class="divider"></div>
                    <div class="meta">
                      <span class="kazanim">${escapeHtml(formatKazanimLabel(q))}</span>
                      <span class="points">(${q.points} Puan)</span>
                    </div>
                    <div class="stem">
                      <span class="q-index">${idx + 1})</span>
                      <div class="q-text">${stem}</div>
                    </div>
                    ${imgHtml}
                    <div class="answers">${answerLines}</div>
                  </div>
                `;
            })
            .join('');

        const answerKeyHtml = `
          <div class="answer-key page-break">
            <div class="ak-title">CEVAP ANAHTARI</div>
            <ol>
              ${scenario
                  .map(
                      (q, idx) =>
                          `<li><strong>${idx + 1}. Soru:</strong> ${escapeHtml(q.answer).replace(/\n/g, '<br>')}</li>`,
                  )
                  .join('')}
            </ol>
          </div>
        `;

        const style = `
          <style>
            @page { size: A4 portrait; margin: 12mm 12mm 14mm 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; color: #000; }
            .doc { width: 100%; }
            .header { text-align: center; margin-bottom: 10mm; }
            .header .line1 { font-size: 12pt; font-weight: 700; }
            .header .line2 { font-size: 14pt; font-weight: 800; }
            .header .line3 { font-size: 12pt; font-weight: 700; }
            .student-info { display: grid; grid-template-columns: repeat(3, 1fr); font-size: 10pt; margin-bottom: 6mm; border-bottom: 1px solid #ccc; padding-bottom: 4mm; }
            .student-info span { display: block; }
            .question-block { margin-bottom: 10mm; page-break-inside: avoid; }
            .divider { height: 1px; background: #ccc; margin-bottom: 3mm; }
            .meta { display: flex; justify-content: space-between; font-size: 9pt; color: #555; margin-bottom: 2mm; }
            .kazanim { font-style: italic; }
            .points { font-weight: 700; }
            .stem { display: flex; gap: 4mm; font-size: 11pt; line-height: 1.35; }
            .q-index { font-weight: 700; }
            .q-text { flex: 1; }
            .img-wrap { text-align: center; margin: 3mm 0; }
            .img-wrap img { max-width: 120mm; height: auto; }
            .answers { margin-top: 3mm; }
            .answer-line { border-bottom: 1px dotted #777; height: 14px; margin-bottom: 6px; }
            .page-break { page-break-before: always; break-before: page; }
            .answer-key { font-size: 11pt; line-height: 1.45; }
            .ak-title { text-align: center; font-size: 14pt; font-weight: 800; margin: 0 0 6mm 0; }
            .answer-key ol { padding-left: 4mm; }
            .answer-key li { margin-bottom: 3mm; }
          </style>
        `;

        return `
          <!doctype html>
          <html>
            <head>${style}</head>
            <body>
              <div class="doc">
                ${header}
                ${questionsHtml}
                ${answerKeyHtml}
              </div>
            </body>
          </html>
        `;
    };

    const printHtml = (html: string) => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (!doc) return;
        doc.open();
        doc.write(html);
        doc.close();
        iframe.onload = () => {
            const win = iframe.contentWindow;
            if (win) {
                win.focus();
                win.print();
            }
            setTimeout(() => iframe.remove(), 1500);
        };
    };

    const handlePrintPdf = () => {
        if (!editableExam) return;
        const originalTitle = document.title;
        document.title = formatPrintFileName();
        const html = buildPrintableHtml();
        if (html) {
            printHtml(html);
        }
        setTimeout(() => {
            document.title = originalTitle;
        }, 800);
    };

const confirmationMessage = (
         <div className="text-center">
            <p className="text-slate-200 mb-2">{`Bu işlem için tahmini ${estimatedCredits} bakiye kullanılacak.`}</p>
            <p className="text-xs text-slate-400">
                Gerçek maliyet, üretilen metnin uzunluğuna göre belirlenir ve genellikle daha düşüktür.
            </p>
            <p className="text-slate-200 mt-4">Devam etmek istiyor musunuz?</p>
        </div>
    );

    return (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 h-full exam-container-print exam-print-scope">
            {/* Left Panel: Settings */}
            <div className="lg:col-span-4 flex flex-col gap-4 p-4 overflow-y-auto print-hidden">
                <h3 className="text-xl font-bold text-violet-300">Yazılı Ayarları</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value.toUpperCase())} className="p-2 bg-slate-700 rounded-md border border-slate-600 uppercase placeholder:capitalize" placeholder="Okul Adı" />
                    <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value.toUpperCase())} className="p-2 bg-slate-700 rounded-md border border-slate-600 uppercase placeholder:capitalize" placeholder="Eğitim Yılı" />
                    <input type="text" value={title} onChange={e => setTitle(e.target.value.toUpperCase())} className="p-2 bg-slate-700 rounded-md border border-slate-600 uppercase placeholder:capitalize" placeholder="Sınav Başlığı" />
                </div>
                <select value={grade} onChange={e => updateSetting('grade', parseInt(e.target.value))} className="p-2 bg-slate-700 rounded-md border border-slate-600 w-full">
                     {availableGrades.map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                </select>
                
                {/* Reference Doc Uploader */}
                <div {...getRootProps()} className={`p-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-violet-400 bg-violet-900/50' : 'border-slate-600 hover:border-violet-500'}`}>
                    <input {...getInputProps()} />
                    {referenceDoc ? <p className="text-sm text-green-300">{referenceDoc.name} referans olarak seçildi.</p> : <p className="text-sm text-slate-400">Referans Yazılı Yükle (PDF/Resim)</p>}
                </div>

                {/* Source Doc Selector */}
                <div className="space-y-2">
                    <h4 className="font-semibold text-slate-300 text-sm">Kaynak PDF'leri Seçin (İsteğe Bağlı)</h4>
                    <div className="max-h-24 overflow-y-auto bg-slate-800/50 p-2 rounded-md border border-slate-700 space-y-1">
                        {documentLibrary.map(doc => (
                            <label key={doc.id} className="flex items-center gap-2 p-1 hover:bg-slate-700 rounded cursor-pointer text-sm">
                                <input type="checkbox" checked={sourceDocIds.includes(doc.id)} onChange={e => { setSourceDocIds(prev => e.target.checked ? [...prev, doc.id] : prev.filter(id => id !== doc.id)); }} />
                                <span>{doc.name}</span>
                            </label>
                        ))}
                    </div>
                </div>


                <div className="flex-grow flex flex-col bg-slate-800/50 p-2 rounded-xl border border-violet-500/30">
                    <p className="font-semibold text-slate-200 p-2">Kazanım Seçimi (Toplam {totalQuestions} Soru)</p>
                    <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                        {allKazanimsForGrade.length > 0 ? allKazanimsForGrade.map(k => (
                            <KazanımSelector 
                                key={k.id}
                                kazanım={k}
                                isSelected={!!selectedKazanims[k.id]}
                                count={selectedKazanims[k.id]?.count || 1}
                                onToggle={handleToggleKazanım}
                                onCountChange={handleCountChange}
                            />
                        )) : <p className="text-center text-slate-400 p-4">Bu Sınıf seviyesi için kazanım bulunamadı.</p>}
                    </div>
                </div>

                <Button onClick={handleGenerate} disabled={isLoading || totalQuestions === 0} variant="primary" className="w-full !py-3 !text-lg">
                    {isLoading ? loadingMessage : `✨ Yazılı Oluştur (${totalQuestions} Soru)`}
                </Button>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                
                {/* Saved Exams Section */}
                <div className="space-y-2 mt-4">
                    <h4 className="font-semibold text-slate-300 text-base">Kaydedilmiş Yazılılar ({generatedExams.length})</h4>
                    <div className="max-h-32 overflow-y-auto bg-slate-800/50 p-2 rounded-md border border-slate-700 space-y-2">
                        {generatedExams.length > 0 ? generatedExams.map(exam => (
                            <div key={exam.id} className="bg-slate-700/50 p-2 rounded-lg flex justify-between items-center">
                                <p className="text-sm text-slate-200 truncate pr-2">{exam.title}</p>
                                <div className="flex-shrink-0 flex gap-2">
                                    <button onClick={() => handleLoadExam(exam.id)} className="text-xs bg-green-600 px-2 py-1 rounded font-semibold hover:bg-green-500">Yükle</button>
                                    <button onClick={() => handleDeleteExam(exam.id)} className="text-xs bg-red-600 px-2 py-1 rounded font-semibold hover:bg-red-500">Sil</button>
                                </div>
                            </div>
                        )) : <p className="text-xs text-slate-400 text-center p-2">Henüz kaydedilmiş yazılı yok.</p>}
                    </div>
                </div>

            </div>

            {/* Right Panel: Preview */}
            <div className="lg:col-span-6 flex flex-col gap-4 p-4 bg-slate-900/40 rounded-lg overflow-y-auto print-area">
                <h3 className="text-xl font-bold text-violet-300 print-hidden">Önizleme ve Düzenleme</h3>
                {isLoading ? <div className="flex justify-center items-center h-full"><LoadingSpinner /></div> :
                 !editableExam ? <p className="text-center text-slate-400 m-auto">Henüz yazılı oluşturulmadı.</p> :
                 (
                    <>
                        <div className="flex bg-slate-700/50 p-1 rounded-lg gap-1 print-hidden">
                           {Object.keys(editableExam.scenarios).map(key => (
                               <button key={key} onClick={() => setActiveScenario(key)} className={`w-1/2 p-2 rounded text-sm font-semibold transition-colors ${activeScenario === key ? 'bg-violet-600' : 'hover:bg-slate-600'}`}>{key}</button>
                           ))}
                        </div>
                        {renderEditableExamPaper(editableExam.scenarios[activeScenario])}
                        <div className="flex gap-4 mt-auto pt-4 print-hidden">
                            <Button onClick={handleSaveExam} variant="success" className="w-full">Kaydet</Button>
                            <Button onClick={handleExportToWord} variant="primary" className="w-full">Word İndir</Button>
                            <Button onClick={handlePrintPdf} variant="secondary" className="w-full">PDF İndir/Yazdır</Button>
                        </div>
                    </>
                 )
                }
            </div>
            <Modal 
                isOpen={showConfirmModal}
                title="Yazılı Oluşturmayı Onayla"
                message={confirmationMessage}
                onConfirm={handleConfirmGeneration}
                onCancel={() => setShowConfirmModal(false)}
            />
        </div>
        {editableExam && renderPrintableDocument()}
        </>
    );
};

export default ExamGenerator;
