import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button, LoadingSpinner, Modal } from '../UI';
import { generateExamWithAI } from '../../services/geminiService';
import type { Exam, GeneratedQuestion, DocumentLibraryItem, Kazanım } from '../../types';
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
    kazanım: Kazanım;
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

    const grade = gameSettings.grade || 5;

    // State for exam settings
    const [selectedKazanims, setSelectedKazanims] = useState<Record<string, { text: string; count: number }>>({});
    const [schoolName, setSchoolName] = useState('CUMHURİYET ORTAOKULU');
    const [academicYear, setAcademicYear] = useState('2025-2026 EĞİTİM-ÖĞRETİM YILI');
    const [title, setTitle] = useState('1. DÖNEM 1. YAZILI SINAV');
    const [sourceDocIds, setSourceDocIds] = useState<string[]>([]);
    const [referenceDoc, setReferenceDoc] = useState<DocumentLibraryItem | null>(null);
    
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
        return ogrenmeAlanlari.flatMap(oa => oa.altKonular.flatMap(ak => ak.kazanımlar));
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

            const newExam: Exam = {
                id: `exam-${Date.now()}`,
                title: `${grade}. Sınıf ${title}`,
                createdAt: new Date().toISOString(),
                scenarios: result.scenarios,
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
            const doc = await createDocFromExam(editableExam, activeScenario, allSubjects[selectedSubjectId].name);
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

    const renderEditableExamPaper = (scenario: GeneratedQuestion[]) => {
        return (
            <div id="exam-paper-preview" className="bg-slate-800/50 p-6 rounded-lg space-y-6 border border-slate-700">
                <header className="text-center border-b-2 border-slate-600 pb-4">
                    <h2 className="text-xl font-bold">{academicYear}</h2>
                    <h1 className="text-2xl font-bold">{schoolName}</h1>
                    <h3 className="text-xl">{grade}. Sınıf {allSubjects[selectedSubjectId].name} Dersi {title}</h3>
                </header>
                <div className="flex justify-between border-b-2 border-slate-600 pb-2 text-sm">
                    <span>Adı Soyadı: ..........................</span>
                    <span>Sınıfı: ..... No: .....</span>
                    <span>Puan: .....</span>
                </div>
                <main className="space-y-6">
                    {scenario.map((q, index) => (
                        <div key={`${activeScenario}-${q.id}-${index}`} className="flex gap-4">
                            <strong className="whitespace-nowrap pt-2">{index + 1})</strong>
                            <div className="flex-grow space-y-2">
                                <textarea
                                    value={q.questionStem}
                                    onChange={(e) => handleQuestionChange(activeScenario, index, 'questionStem', e.target.value)}
                                    className="w-full p-2 bg-slate-700/50 rounded-md border border-slate-600 resize-y min-h-[60px]"
                                />
                                <EditableImageUploader question={q} onImageUpload={(base64) => handleImageUpload(activeScenario, index, base64)} />
                            </div>
                        </div>
                    ))}
                </main>
                 {/* This section will only be visible when printing */}
                <div id="answer-key-print" className="hidden">
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
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 h-full exam-container-print">
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
                        )) : <p className="text-center text-slate-400 p-4">Bu sınıf seviyesi için kazanım bulunamadı.</p>}
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
            <div className="lg:col-span-6 flex flex-col gap-4 p-4 bg-slate-900/40 rounded-lg overflow-y-auto">
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
                            <Button onClick={() => window.print()} variant="secondary" className="w-full">PDF İndir/Yazdır</Button>
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
    );
};

export default ExamGenerator;
